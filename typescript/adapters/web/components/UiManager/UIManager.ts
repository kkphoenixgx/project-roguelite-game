import type { IGameDomain } from "../../../../domain/ports/domain-contracts";
import XpBarGui from "../../GUIS/xpBarHudModule/XpBarGui";
import type { EntityRenderableState } from "../../../../domain/ports/domain-contracts";
import PlayerStatusGui from "../../GUIS/playerStatusHudModule/PlayerStatusGui";
import CharacterMenuGui from "../../GUIS/characterMenuHudModule/CharacterMenuGui";
import SkillTreeGui from "../../GUIS/skillTreeHudModule/SkillTreeGUI";
import GameOverGui from "../../GUIS/gameoverHudModule/GameOverGui";
import WeaponHudGui from "../../GUIS/weaponHudModule/WeaponHudGui";
import WindowHudGui from "../../GUIS/windowHudModule/WindowHudGui";
import LevelUpRewardGui from "../../GUIS/levelUpRewardHudModule/LevelUpRewardGui";
import SkillCooldownHudGui from "../../GUIS/skillCooldownHudModule/SkillCooldownHudGui";
import SpellBufferHudGui from "../../GUIS/spellBufferHudModule/SpellBufferHudGui";
import DialogueAdapter from "../DialogueAdapter";
import ConfirmationModalGui from "../../GUIS/confirmationModalModule/ConfirmationModalGui";
import EquippedWeaponsHudGui from "../../GUIS/equippedWeaponsHudModule/EquippedWeaponsHudGui";
import ToastGui, { type ToastVariant } from "../../GUIS/toastModule/ToastGui";

/** @class UIManager Gerencia todas as interfaces de usuário baseadas em DOM do jogo. */
export default class UIManager {
  private playerStatusGUI = new PlayerStatusGui();
  private xpBarGui = new XpBarGui();
  private characterMenuGui: CharacterMenuGui;
  private skillTreeGui: SkillTreeGui;
  private gameOverGui: GameOverGui;
  private weaponHudGui: WeaponHudGui;
  private windowHudGui = new WindowHudGui();
  private levelUpRewardGui: LevelUpRewardGui;
  private skillCooldownHudGui: SkillCooldownHudGui;
  public equippedWeaponsHudGui: EquippedWeaponsHudGui;
  public spellBufferHudGui = new SpellBufferHudGui();
  public confirmationModal = ConfirmationModalGui.getInstance();
  public toastGui: ToastGui = ToastGui.getInstance();
  private promptEl: HTMLElement;
  private currentPrompt: { npcId: number; text: string; npcName: string; entityTypeId?: string } | null = null;
  private activePortalPrompts: Set<number> = new Set();

  constructor(
    private domain: IGameDomain,
    togglePauseGameCallback: () => void, 
    equipItemCallback: (index: number) => void,
    unequipItemCallback: (slot: string, index?: number) => void,
    skillActionCallback: (action: 'unlock' | 'changeClass' | 'equip', payload: any) => void,
    allocateAttributeCallback: (attribute: string) => void,
    restartCallback: () => void,
    deleteItemCallback: (index: number) => void = () => {},
    public dialogueAdapter: DialogueAdapter,
    claimRewardCallback: (rewardId: string, coords: any) => void = () => {},
    toolActionCallback?: (action: 'equipTool' | 'unequipTool' | 'selectTool', payload: any) => void,
    swapWeaponsCallback?: () => void
  ) {
    this.characterMenuGui = new CharacterMenuGui(
      domain, 
      togglePauseGameCallback, 
      equipItemCallback, 
      unequipItemCallback, 
      allocateAttributeCallback, 
      deleteItemCallback,
      skillActionCallback,
      toolActionCallback
    );
    this.skillTreeGui = new SkillTreeGui(togglePauseGameCallback, skillActionCallback);
    this.gameOverGui = new GameOverGui(restartCallback, domain);
    this.weaponHudGui = new WeaponHudGui();
    this.levelUpRewardGui = new LevelUpRewardGui(domain, claimRewardCallback, togglePauseGameCallback);
    this.skillCooldownHudGui = new SkillCooldownHudGui(domain);
    this.equippedWeaponsHudGui = new EquippedWeaponsHudGui(swapWeaponsCallback);

    this.promptEl = document.createElement('div');
    this.promptEl.classList.add('interact-prompt');
    this.promptEl.style.display = 'none';
    document.body.appendChild(this.promptEl);
  }

  public showGameOver(): void {
    this.gameOverGui.show();
  }

  public hideGameOver(): void {
    this.gameOverGui.hide();
  }

  public showLevelUpReward(coords: any, choices: any[]): void {
    this.levelUpRewardGui.show(coords, choices);
  }

  public isAnyMenuOpen(): boolean {
    return this.confirmationModal.isOpen || this.characterMenuGui.isOpen || this.skillTreeGui.isOpen || this.dialogueAdapter.isAnyMenuOpen() || this.levelUpRewardGui.isOpen;
  }

  /** Fecha qualquer menu aberto do jogador (Árvore de Habilidades, Menu de Personagem, Diálogo, Recompensa, Modal, etc.). Retorna true se fechou algum menu. */
  public closeAnyOpenMenu(): boolean {
    if (this.confirmationModal.isOpen) {
      this.confirmationModal.cancel();
      return true;
    }
    if (this.skillTreeGui.isOpen) {
      this.skillTreeGui.hide();
      return true;
    }
    if (this.characterMenuGui.isOpen) {
      this.characterMenuGui.hide();
      return true;
    }
    if (this.dialogueAdapter.isAnyMenuOpen()) {
      this.dialogueAdapter.clear();
      return true;
    }
    if (this.levelUpRewardGui.isOpen) {
      this.levelUpRewardGui.hide();
      return true;
    }
    return false;
  }

  public toggleCharacterMenu(): void {
    if (this.dialogueAdapter.isAnyMenuOpen()) return;
    if (!this.characterMenuGui.isOpen) {
      this.skillTreeGui.hide();
    }
    this.characterMenuGui.toggle();
  }

  public toggleSkillTree(): void {
    if (this.dialogueAdapter.isAnyMenuOpen()) return;
    if (!this.skillTreeGui.isOpen) {
      this.characterMenuGui.hide();
    }
    this.skillTreeGui.toggle();
  }

  public handleInteract(): void {
    if (this.currentPrompt && !this.dialogueAdapter.isAnyMenuOpen()) {
      //? Abre interface de diálogo em estado de espera e despacha saudação inicial para despertar a LLM do NPC
      this.dialogueAdapter.dialogueGui.show(this.currentPrompt.npcName, "...", this.currentPrompt.npcId, this.currentPrompt.entityTypeId);
      (this.dialogueAdapter as any).dialogueGui['onPlayerReply']("[Aproximou-se para conversar]", this.currentPrompt.npcId);
    } else if (this.hasActivePortalPrompt()) {
      //? Prioriza ativação do PortalLink ignorando abertura do menu de personagem
      return;
    } else if (!this.dialogueAdapter.isAnyMenuOpen()) {
      this.toggleCharacterMenu();
    }
  }

  /** Atualiza as GUIs com os dados mais recentes. */
  public update(
    playerState: EntityRenderableState | undefined, 
    renderables: readonly any[], 
    playerScreenPos?: {x: number, y: number}, 
    mousePos?: {x: number, y: number},
    worldToScreen?: (wx: number, wy: number) => { x: number, y: number }
  ): void {
    if (!playerState || this.levelUpRewardGui.isOpen) {
      return;
    }

    this.xpBarGui.update(playerState);
      this.playerStatusGUI.update(playerState)
      this.characterMenuGui.update(playerState);
      this.skillTreeGui.update(playerState);
      this.weaponHudGui.update(playerState, playerScreenPos, mousePos);
      this.equippedWeaponsHudGui.update(playerState);
      this.skillCooldownHudGui.update(playerState);
      
      if (worldToScreen) {
        this.dialogueAdapter.update(renderables, worldToScreen);
      }

      //? Renderiza balão de prompt quando o Domínio sinaliza proximidade com entidade interativa
      if (playerState.interactablePrompt && playerScreenPos && !this.dialogueAdapter.isAnyMenuOpen()) {
        this.currentPrompt = playerState.interactablePrompt;
        this.promptEl.style.display = 'block';
        this.promptEl.innerText = playerState.interactablePrompt.text;
        this.promptEl.style.left = `${playerScreenPos.x}px`;
        this.promptEl.style.top = `${playerScreenPos.y - 40}px`;
      } else {
        this.currentPrompt = null;
        this.promptEl.style.display = 'none';
      }
  }

  /** Limpa balões de diálogo transitórios e prompts residuais de interação. */
  public clearTransientDialogues(): void {
    this.activePortalPrompts.clear();
    this.dialogueAdapter.clear();
    this.currentPrompt = null;
    this.promptEl.style.display = 'none';
  }

  /** Exibe o balão overhead flutuante para portais interativos com coordenadas mundiais. */
  public showPortalPrompt(payload: { portalId: number; targetMapId: string; text: string; actionKey: string; coordinates: { x: number; y: number } }): void {
    this.activePortalPrompts.add(payload.portalId);
    this.dialogueAdapter.showPortalPrompt(payload);
  }

  /** Esconde o balão overhead do portal especificado. */
  public hidePortalPrompt(portalId: number): void {
    this.activePortalPrompts.delete(portalId);
    this.dialogueAdapter.hidePortalPrompt(portalId);
  }

  /** Remove e limpa todos os balões flutuantes ativos da tela (chat e portais). */
  public clearFloatingBubbles(): void {
    this.activePortalPrompts.clear();
    this.dialogueAdapter.floatingChatGui.clear();
  }

  /** Retorna se há algum prompt de portal interativo ativo na tela. */
  public hasActivePortalPrompt(): boolean {
    return this.activePortalPrompts.size > 0 || (this.dialogueAdapter?.hasActivePortalPrompt?.() ?? false);
  }

  /**
   * Exibe uma notificação flutuante toast na interface.
   * @param message Mensagem a ser exibida
   * @param variant Tipo do toast ('error' | 'warning' | 'info' | 'success')
   * @param durationMs Tempo de exibição em milissegundos (padrão: 4000)
   */
  public showToast(message: string, variant: ToastVariant = 'error', durationMs: number = 4000): number {
    return this.toastGui.createToast(message, variant, durationMs);
  }

  /**
   * Desaloca e destrói instâncias do DOM gerenciadas pelo UIManager.
   */
  public destroy(): void {
    this.toastGui.destroy();
    if (this.promptEl && this.promptEl.parentElement) {
      this.promptEl.parentElement.removeChild(this.promptEl);
    }
  }
}