/** @file Contém a classe InputManager, responsável por gerenciar e mapear todos os inputs do usuário para ações de jogo. */

import { logger } from "../../shared/Logger";
import keymapConfig from '../../assets/keymap.json';
import type { action } from "../../../../domain/eventDispacher/actions.type";

/** Define as ações de jogo possíveis, desacoplando as teclas físicas das ações lógicas. */
export type GameAction =
  | 'move_up'
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'log_debug'
  | 'shift'
  | 'mouse_left'
  | 'mouse_middle'
  | 'mouse_right'
  | 'spell_0'
  | 'spell_1'
  | 'spell_2'
  | 'spell_3'
  | 'spell_4'
  | 'spell_5'
  | 'spell_6'
  | 'spell_7'
  | 'spell_8'
  | 'spell_9'
  | 'spell_f'
  | 'cast_spell'
  | 'toggle_attributes'
  | 'toggle_skill_tree'
  | 'interact'
  | 'slot_1'
  | 'slot_2'
  | 'slot_3'
  | 'slot_4';

/**  @class InputManager Gerencia todos os inputs do usuário, mapeando eventos brutos de teclado para ações de jogo específicas. Esta classe centraliza a lógica de input, permitindo bindings complexos, combos e remapeamento de teclas. */
export class InputManager {
  private pressedKeys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();
  private keyMap: Map<string, GameAction> = new Map();
  private actionMap: Map<GameAction, string[]> = new Map();
  private preventUnload: boolean = true;
  public mouseLastCoordinates: { x: number, y: number } = { x: 0, y: 0 }
  public clickActions: Set<action> = new Set(["leftClick", "scrollClick", "rightClick"])

  /** @constructor Carrega o mapa de teclas a partir da configuração e anexa os listeners de evento. */
  constructor() {
    this.loadKeyMap();
    this.attachEventListeners();
    logger.log('init', 'InputManager instantiated and listening for events.');
  }

  /** Verifica se uma ação de jogo específica está ativa (ou seja, se sua tecla correspondente está pressionada). @param action A ação de jogo a ser verificada. @returns `true` se a ação estiver ativa, `false` caso contrário. */
  public isActionActive(action: GameAction): boolean {
    const keys = this.actionMap.get(action);
    return keys ? keys.some(k => this.pressedKeys.has(k)) : false;
  }

  /** Verifica se uma ação de jogo acabou de ser ativada e a consome (útil para capturar uma única tecla por clique, como magias). @param action A ação a ser consumida. @returns `true` se a ação estava ativa e foi consumida, `false` caso contrário. */
  public consumeAction(action: GameAction): boolean {
    const keys = this.actionMap.get(action);
    if (keys) {
      for (const key of keys) {
        if (this.justPressedKeys.has(key)) {
          this.justPressedKeys.delete(key);
          return true;
        }
      }
    }
    return false;
  }

  /** Remapeia uma ação de jogo para uma nova tecla, atualizando os mapas internos. @param action A ação a ser remapeada. @param newKey A nova tecla a ser associada à ação. */
  public remapAction(action: GameAction, newKey: string): void {
    const normalizedNewKey = newKey.toLowerCase();

    const oldKeys = this.actionMap.get(action);
    if (oldKeys) {
      oldKeys.forEach(k => this.keyMap.delete(k));
    }

    this.actionMap.set(action, []); // Limpa o array antigo para o novo remapeamento
    this.setKeyForAction(action, normalizedNewKey);
    logger.log('init', `Action '${action}' remapped to key '${normalizedNewKey}'.`);
  }

  /** Carrega o mapa de teclas a partir do arquivo `keymap.json` importado. @private */
  private loadKeyMap(): void {
    Object.entries(keymapConfig).forEach(([action, keyOrKeys]) => {
      if (Array.isArray(keyOrKeys)) {
        keyOrKeys.forEach(key => this.setKeyForAction(action as GameAction, key.toLowerCase()));
      } else {
        this.setKeyForAction(action as GameAction, (keyOrKeys as string).toLowerCase());
      }
    });

    // Fallback de Segurança: Garante que a tecla F invoque a magia F se não estiver no JSON
    if (!this.actionMap.has('spell_f')) {
      this.setKeyForAction('spell_f', 'f');
    }

    // Fallback de Segurança: Garante que o Z funcione para interação mesmo se o keymap.json estiver desatualizado ou com erro.
    if (!this.actionMap.has('interact')) {
      this.setKeyForAction('interact', 'z');
    }

    // Fallback de Segurança: Atalhos padrão para os slots de habilidade (Loadout) independentes do Mago
    if (!this.actionMap.has('slot_1')) this.setKeyForAction('slot_1', '1');
    if (!this.actionMap.has('slot_2')) this.setKeyForAction('slot_2', '2');
    if (!this.actionMap.has('slot_3')) this.setKeyForAction('slot_3', '3');
    if (!this.actionMap.has('slot_4')) this.setKeyForAction('slot_4', '4');
  }

  /** Anexa os listeners de evento de teclado à janela do navegador. @private */
  private attachEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('mousemove', this.handleClick.bind(this))
    window.addEventListener('contextmenu', this.handleRightClick.bind(this))
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    window.addEventListener('mouseout', this.handleMouseOut.bind(this));
  }

  /** Permite ativar ou desativar o popup de confirmação de saída programaticamente. */
  public setPreventUnload(prevent: boolean): void {
    this.preventUnload = prevent;
  }

  private handleBlur(): void {
    // Quando a janela perde o foco (alt+tab ou clique fora), limpamos as teclas
    // para evitar que o personagem continue andando sozinho ("sticky keys").
    logger.log('input', 'Window lost focus. Clearing pressed keys.');
    this.pressedKeys.clear();
    this.justPressedKeys.clear();
  }

  private handleMouseOut(e: MouseEvent): void {
    if (!e.relatedTarget) {
      logger.log('input', 'Mouse left the window. Clearing pressed keys.');
      this.pressedKeys.clear();
      this.justPressedKeys.clear();
    }
  }

  private handleBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.preventUnload) {
      e.preventDefault();
      e.returnValue = ''; // Exigido pelo Chrome para exibir o pop-up de confirmação.
    }
  }

  private handleClick(e: MouseEvent) {
    this.mouseLastCoordinates.x = e.clientX
    this.mouseLastCoordinates.y = e.clientY
  }

  private handleMouseDown(e: MouseEvent) {

    // Força a atualização imediata da mira na hora do clique
    this.mouseLastCoordinates.x = e.clientX;
    this.mouseLastCoordinates.y = e.clientY;

    // Previne comportamentos padrão (seleção de texto no canvas, auto-scroll do middle click)
    if (e.target instanceof HTMLCanvasElement || e.button === 1 || e.button === 2) {
      e.preventDefault();
    }

    let key = ''
    if (e.button === 0) {
      key = 'mouse_left'
    }
    if (e.button === 1) {
      key = 'mouse_middle'
    }
    if (e.button === 2) {
      key = 'mouse_right'
    }

    if (!this.pressedKeys.has(key) && this.keyMap.has(key)) {
      logger.log('input', `Mouse Down: ${key}`);
      this.pressedKeys.add(key);
      this.justPressedKeys.add(key);
    }
  }

  private handleMouseUp(e: MouseEvent) {
    let key = ''
    if (e.button === 0) {
      key = 'mouse_left'
    }
    if (e.button === 1) {
      key = 'mouse_middle'
    }
    if (e.button === 2) {
      key = 'mouse_right'
    }

    logger.log('input', `Mouse Up: ${key}`);
    this.pressedKeys.delete(key);
    this.justPressedKeys.delete(key);
  }

  // private handleLeftClick(e: PointerEvent ) {}

  private handleRightClick(e: MouseEvent) {
    e.preventDefault()
  }

  private handleKeyDown(e: KeyboardEvent): void {
    let key = e.key.toLowerCase();

    // Diferencia os números do teclado físico superior dos números do Numpad
    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
      key = `numpad_${key}`;
    }

    const isBrowserShortcut =
      ((e.ctrlKey || e.metaKey) && ['s', 'p', 'f', 'g', 'r', 'j', 'u', 'd', 'h', 'w', 't', 'n'].includes(key)) || // Atalhos com Ctrl
      ['f3', 'f5', 'f6', 'f7'].includes(key) || // Teclas de função
      (e.altKey && ['arrowleft', 'arrowright'].includes(key)); // Alt + Setas (Voltar/Avançar página)

    if (isBrowserShortcut) {
      e.preventDefault();
      logger.log('input', `Blocked browser shortcut: ${e.key}`);
    }

    if (this.keyMap.has(key) && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
    }

    if (!this.pressedKeys.has(key) && this.keyMap.has(key)) {
      logger.log('input', `Key Down: ${key}`);
      this.pressedKeys.add(key);
      this.justPressedKeys.add(key);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    let key = e.key.toLowerCase();

    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
      key = `numpad_${key}`;
    }

    logger.log('input', `Key Up: ${key}`);
    this.pressedKeys.delete(key);
    this.justPressedKeys.delete(key);
  }

  /** Define a tecla para uma ação específica, mantendo os mapas sincronizados.  @param action A ação de jogo.  @param key A tecla a ser associada.  @private */
  private setKeyForAction(action: GameAction, key: string): void {
    this.keyMap.set(key, action);
    if (!this.actionMap.has(action)) {
      this.actionMap.set(action, []);
    }
    this.actionMap.get(action)!.push(key);
  }
}