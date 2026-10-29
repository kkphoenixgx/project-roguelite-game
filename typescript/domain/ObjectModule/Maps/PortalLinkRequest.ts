/**
 * @file Contém a classe PortalLinkRequest, portal com gatilho interativo que solicita
 * confirmação do jogador (ex: tecla [E] Entrar) via chat bubble / prompt antes da transição.
 */
import PortalLink from "./PortalLink";
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type { objectTypeId } from "../objectType.type";
import { RegisterSpawner, type SpawnPayload } from "../SpawnRegistry";
import type { HitBox } from "../../hitBox/HitBox";
import type { HitboxJSON } from "../../hitBox/HitboxParser";

@RegisterSpawner('portalLinkRequest')
export default class PortalLinkRequest extends PortalLink {
  /** ID do portal atualmente sob foco do jogador para desambiguação atômica em caso de payload vazio {} */
  public static focusedPortalId: number | null = null;

  public promptText: string;
  public actionKey: string;
  public isPlayerInside: boolean = false;
  private hasPlayerCollidedThisTick: boolean = false;
  /** Janela (s) sem colisões antes de considerar que o jogador saiu (latência do worker de colisão). */
  public static readonly EXIT_GRACE_SECONDS: number = 0.25;
  private timeSinceLastCollision: number = 0;
  private boundOnInteract: (payload: { portalId?: number }) => void;

  constructor(
    id: number,
    coordinates: { x: number; y: number },
    size: { width: number; height: number },
    eventManager: IEventManager,
    targetMapId: string,
    targetSpawnCoords?: { x: number; y: number } | undefined,
    hitboxes?: (HitBox | HitboxJSON)[] | null,
    transitionCooldownMs: number = 1000,
    promptText: string = "Entrar",
    actionKey: string = "E",
    objectId: objectTypeId = 'portalLinkRequest'
  ) {
    super(
      id,
      coordinates,
      size,
      eventManager,
      targetMapId,
      targetSpawnCoords,
      hitboxes,
      transitionCooldownMs,
      objectId
    );

    this.promptText = promptText;
    this.actionKey = actionKey;
    this.boundOnInteract = this.onInteract.bind(this);

    this.eventManager.on('portalInteract', this.boundOnInteract);
  }

  /**
   * Chamado quando há colisão com outra entidade.
   * Não efetua a transição imediatamente: gerencia o estado do jogador dentro da hitbox
   * e despacha o evento portalPromptShow para a camada de apresentação exibir o chat bubble.
   */
  public override handleCollision(other: any): void {
    if (!this.isTriggerActive) return;

    if (other && (other.objectId === 'player' || other.id === 1)) {
      this.hasPlayerCollidedThisTick = true;
      PortalLinkRequest.focusedPortalId = this.id;

      if (!this.isPlayerInside) {
        this.isPlayerInside = true;
        const promptX = other.coordinates
          ? Math.max(this.coordinates.x, Math.min(other.coordinates.x + (other.size?.width ?? 32) / 2, this.coordinates.x + this.size.width))
          : this.coordinates.x;
        const promptY = other.coordinates
          ? Math.max(this.coordinates.y, Math.min(other.coordinates.y, this.coordinates.y + this.size.height))
          : this.coordinates.y;
        this.eventManager.dispatch('portalPromptShow', {
          portalId: this.id,
          targetMapId: this.targetMapId,
          text: this.promptText,
          actionKey: this.actionKey,
          coordinates: { x: promptX, y: promptY }
        });
      }
    }
  }

  /**
   * Chamado no tick do jogo para atualizar timers e detectar saída do jogador da hitbox.
   * Nota Arquitetural: Em ObjectElementManager.updateAll, element.update(deltaTime)
   * executa ANTES de applyDelayedCollisions/checkCollisions no mesmo frame.
   * Portanto, hasPlayerCollidedThisTick reflete a colisão resolvida no final do frame anterior.
   */
  public override update(deltaTime: number): void {
    super.update(deltaTime);

    // A detecção de colisão roda em um Web Worker assíncrono: resultados não chegam em todo frame.
    // Só consideramos que o jogador saiu após uma janela de tolerância sem colisões.
    if (this.hasPlayerCollidedThisTick) {
      this.timeSinceLastCollision = 0;
      this.hasPlayerCollidedThisTick = false;
      return;
    }

    if (this.isPlayerInside) {
      this.timeSinceLastCollision += deltaTime;
      if (this.timeSinceLastCollision >= PortalLinkRequest.EXIT_GRACE_SECONDS) {
        this.timeSinceLastCollision = 0;
        this.isPlayerInside = false;
        if (PortalLinkRequest.focusedPortalId === this.id) {
          PortalLinkRequest.focusedPortalId = null;
        }
        this.eventManager.dispatch('portalPromptHide', { portalId: this.id });
      }
    }
  }

  /**
   * Chamado quando o jogador aciona a tecla de interação (ex: 'E') transmitida via evento 'portalInteract'.
   * Em caso de múltiplos portais com sobreposição, apenas o portal com foco ativo processa a transição.
   */
  public onInteract(payload?: { portalId?: number }): void {
    if (payload?.portalId !== undefined) {
      if (payload.portalId !== this.id) return;
    } else {
      // Se o payload for vazio {}, garante transição atômica elegendo apenas o portal atualmente focado
      if (PortalLinkRequest.focusedPortalId !== null && PortalLinkRequest.focusedPortalId !== this.id) {
        return;
      }
    }

    if (this.isPlayerInside && this.isTriggerActive) {
      this.isPlayerInside = false;
      if (PortalLinkRequest.focusedPortalId === this.id) {
        PortalLinkRequest.focusedPortalId = null;
      }
      this.eventManager.dispatch('portalPromptHide', { portalId: this.id });
      this.triggerTransition();
    }
  }

  /**
   * Limpa os listeners do barramento de eventos e desativa o prompt se estiver aberto.
   */
  public override destroy(): void {
    if (this.isPlayerInside) {
      this.eventManager.dispatch('portalPromptHide', { portalId: this.id });
      this.isPlayerInside = false;
    }

    if (PortalLinkRequest.focusedPortalId === this.id) {
      PortalLinkRequest.focusedPortalId = null;
    }

    if (this.eventManager.off) {
      this.eventManager.off('portalInteract', this.boundOnInteract);
    }

    super.destroy();
  }

  public static override createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): PortalLinkRequest {
    const size = payload.size || { width: 32, height: 32 };
    const metadata = payload.metadata || {};
    const targetMapId = metadata.targetMapId || payload.targetMapId || 'vilgem';
    const targetSpawnCoords = metadata.targetSpawnCoords || payload.targetSpawnCoords;
    const cooldownMs = metadata.cooldownMs ?? payload.cooldownMs ?? 1000;
    const promptText = metadata.promptText || payload.promptText || 'Entrar';
    const actionKey = metadata.actionKey || payload.actionKey || 'E';
    const hitboxes = payload.hitboxes || null;

    return new PortalLinkRequest(
      id,
      payload.coordinates,
      size,
      eventManager,
      targetMapId,
      targetSpawnCoords,
      hitboxes,
      cooldownMs,
      promptText,
      actionKey
    );
  }
}
