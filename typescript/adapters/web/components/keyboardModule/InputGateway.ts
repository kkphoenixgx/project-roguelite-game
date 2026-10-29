import { InputManager, type GameAction } from "./InputManager";
import type { action } from "../../../../domain/eventDispacher/actions.type";
import { logger } from "../../shared/Logger";
import type { IGameDomain } from "../../../../domain/ports/domain-contracts";

/** @class InputGateway Traduz os inputs brutos do InputManager em intenções lógicas (Actions) para o Domínio. */
export default class InputGateway {
  public inputManager: InputManager;
  private activeActions: Array<action> = []; // Pré-alocado para evitar Garbage Collection

  constructor(
    private domain: IGameDomain,
    private onSpellInputCallback?: (spell: string) => void,
    private onCastSpellCallback?: () => void,
    private onInteractCallback?: () => void
  ) {
    this.inputManager = new InputManager();
  }

  /** Coleta as interações ativas e envia para o domínio. */
  public handleInteractions(screenToWorldFn: (x: number, y: number) => { x: number, y: number }): void {
    this.activeActions.length = 0; // Zera o array reaproveitando o espaço de memória já alocado
    const actions = this.activeActions;

    if (this.inputManager.isActionActive('move_up')) {
      actions.push("up");
    }
    if (this.inputManager.isActionActive('move_down')) {
      actions.push("down");
    }
    if (this.inputManager.isActionActive('move_left')) {
      actions.push("left");
    }
    if (this.inputManager.isActionActive('move_right')) {
      actions.push("right");
    }
    if (this.inputManager.isActionActive('shift')) {
      actions.push("shift");
    }
    if (this.inputManager.isActionActive('mouse_left')) {
      actions.push("leftClick");
    }
    if (this.inputManager.isActionActive('mouse_middle')) {
      actions.push("scrollClick");
    }
    if (this.inputManager.isActionActive('mouse_right')) {
      actions.push("rightClick");
    }

    const spellActions: GameAction[] = ['spell_0', 'spell_1', 'spell_2', 'spell_3', 'spell_4', 'spell_5', 'spell_6', 'spell_7', 'spell_8', 'spell_9', 'spell_f'];
    spellActions.forEach(spell => {
      if (this.inputManager.consumeAction(spell)) {
        logger.log("input", `(Input Gateway) handled ${spell} to player`);
        actions.push(spell as action);
        this.onSpellInputCallback?.(spell);
      }
    });

    if (this.inputManager.consumeAction('cast_spell')) {
      actions.push('castSpell');
      this.onCastSpellCallback?.();
    }

    const slotActions: GameAction[] = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6', 'slot_7', 'slot_8'];
    slotActions.forEach(slot => {
      if (this.inputManager.consumeAction(slot)) {
        logger.log("input", `(Input Gateway) handled ${slot} to player`);
        actions.push(slot as action);
      }
    });

    if (this.inputManager.consumeAction('interact')) {
      logger.log("input", "(Input Gateway) handled interact to player");
      actions.push('interact');
      this.onInteractCallback?.();
    }

    if (this.inputManager.consumeAction('swap_weapon')) {
      logger.log("input", "(Input Gateway) handled swap_weapon to player");
      actions.push('swapWeapons');
    }

    if (actions.length <= 0) return;

    // O cursor sempre deve ser convertido, pois atalhos de teclado (ex: slots) precisam saber para onde o mouse aponta!
    const screenX = this.inputManager.mouseLastCoordinates.x;
    const screenY = this.inputManager.mouseLastCoordinates.y;
    const mouseWorldCoordinates = screenToWorldFn(screenX, screenY);

    logger.log('input', 'Input handling complete. Delegating to domain update...');
    this.domain.handlePlayerInteractions({ actions: actions }, mouseWorldCoordinates);
  }
}