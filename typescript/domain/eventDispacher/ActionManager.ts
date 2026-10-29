import type { IEventManager } from "./IGameEvents";
import type Player from "../ObjectModule/Entities/Player/Player";
import type { action } from "./actions.type";
import type { ILogger } from "../ports/ILogger";
import { ClassActionBindings } from "./ActionBindings";

export default class ActionManager {

  public mouseLastCoordinates:{x:number,y:number} = {x:0,y:0} 
  private activeHandlers: Map<action, Function> = new Map();
  private activePortals: Map<number, { x: number, y: number }> = new Map();

  constructor(private player: Player, private logger: ILogger, private eventManager: IEventManager){
    this.eventManager.on('log', ({ channel, message, params }) => {
      this.logger.log(channel as any, message, ...params);
    });

    this.rebuildBindings();

    // Escuta a troca de classes para reconstruir a árvore de inputs
    this.eventManager.on('classChanged', () => {
        this.rebuildBindings();
    });

    // Rastreia portais interativos ativos para simetria de interação euclidiana
    this.eventManager.on('portalPromptShow', (payload: { portalId: number; coordinates: { x: number; y: number } }) => {
        this.activePortals.set(payload.portalId, payload.coordinates);
    });

    this.eventManager.on('portalPromptHide', (payload: { portalId: number }) => {
        this.activePortals.delete(payload.portalId);
    });

    this.eventManager.on('mapTransitionRequested', () => {
        this.activePortals.clear();
    });

    this.eventManager.on('mapTransitionCompleted', () => {
        this.activePortals.clear();
    });
  }

  //? ----------- Methods -----------

  private rebuildBindings(): void {
      this.activeHandlers.clear();
      
      // 1. Registra os comandos básicos do Player
      const playerBindings = ClassActionBindings.get(this.player.constructor.name);
      if (playerBindings) {
          playerBindings.forEach((methodName, actionName) => {
              this.activeHandlers.set(actionName, (this.player as any)[methodName].bind(this.player));
          });
      }

      this.logger.log('actions', `[ActionManager] Reconstruindo atalhos. Classe ativa do Player: '${this.player.activeClass}'`);

      // 2. Registra e sobrescreve com a Classe Ativa (se houver)
      const activeClassInstance = this.player.classes.find(c => c.name === this.player.activeClass);
      if (activeClassInstance) {
          const className = activeClassInstance.constructor.name;
          this.logger.log('actions', `[ActionManager] Instância da Classe Ativa encontrada! Nome na memória: '${className}'`);
          
          const classBindings = ClassActionBindings.get(className);
          if (classBindings) {
              classBindings.forEach((methodName, actionName) => {
                  this.activeHandlers.set(actionName, (activeClassInstance as any)[methodName].bind(activeClassInstance));
                  this.logger.log('actions', `[ActionManager] SUCESSO: Ação '${actionName}' roubada pela Classe ${className}`);
              });
          } else {
              this.logger.log('actions', `[ActionManager] Nenhum atalho específico por anotação para '${className}'. Roteamento dinâmico via loadout ativo.`);
          }
      } else {
          this.logger.log('actions', `[ActionManager] Nenhuma classe ativa definida ou em transição ('${this.player.activeClass}').`);
      }
  }

  public checkEvent(actions :action[], mouseLastCoordinates: {x:number,y:number}){
    this.mouseLastCoordinates = mouseLastCoordinates
    actions.forEach(action => {
        const handler = this.activeHandlers.get(action);
        if (handler) {
            handler(this.mouseLastCoordinates, action);
        } else {
            // Roteamento Dinâmico para o Loadout (Deck Building) - Teclas 1 a 4 (Classe) e 5 a 8 (Broches Ativos)
            const loadoutMatch = action.match(/^(?:slot_|spell_)([1-8])$/);
            if (loadoutMatch) {
                const slotNum = parseInt(loadoutMatch[1] as string);
                if (slotNum <= 4) {
                    const slotIndex = slotNum - 1;
                    const skillId = this.player.activeLoadout[slotIndex];
                    if (skillId) {
                        this.player.executeActiveSkill(skillId, this.mouseLastCoordinates);
                    }
                } else {
                    const broochSlotIndex = slotNum - 5;
                    const broochId = this.player.globalActiveLoadout?.[broochSlotIndex];
                    if (broochId) {
                        if (typeof this.player.executeActiveBrooch === 'function') {
                            this.player.executeActiveBrooch(broochId, this.mouseLastCoordinates);
                        }
                    }
                }
            } else if (action === 'spell_f') {
                // Se a classe não sequestrou o spell_f diretamente, aciona a habilidade primordial genérica
                if (typeof this.player.executePrimordialSkill === 'function') {
                    this.player.executePrimordialSkill(this.mouseLastCoordinates);
                }
            } else if (action === 'interact') {
                let closestPortalId: number | undefined = undefined;
                if (this.activePortals.size > 0 && this.player?.coordinates) {
                    let minDistanceSq = Infinity;
                    const px = this.player.coordinates.x;
                    const py = this.player.coordinates.y;

                    this.activePortals.forEach((coords, id) => {
                        const dx = coords.x - px;
                        const dy = coords.y - py;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < minDistanceSq) {
                            minDistanceSq = distSq;
                            closestPortalId = id;
                        }
                    });
                }

                // Notifica portais interativos e gatilhos de interação no mapa com simetria de ID
                this.eventManager.dispatch('portalInteract', closestPortalId !== undefined ? { portalId: closestPortalId } : {});
            } else {
                this.eventManager.dispatch('log', { channel: 'actions', message: `(ActionManager) event not managed: ${action}`, params: [] });
            }
        }
    });
  }

}