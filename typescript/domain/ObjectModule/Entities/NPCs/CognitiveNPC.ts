import { invoke } from '@tauri-apps/api/core';

import Entity from "../Entity";
import type { IEventManager } from "../../../eventDispacher/IGameEvents"; 
import Attributes from "../Attributes";
import Vector2D from '../../../shared/Vector2D';
import Attack from "../../Items/Attack";
import PlayerClassManager from '../Player/components/PlayerClassManager';
import Weapon from '../../Items/Weapons/Weapon';
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";

export default abstract class CognitiveNPC extends Entity {
    protected lastPlayerCoords: {x: number, y: number} | null = null;
    protected lastSentDistance: number = -1;
    protected lastSentHp: number = -1;
    protected lastEnemyScanTime: number = 0;
    protected currentTargetEnemyId: number = -1;
    
    public abstract npcName: string;
    public abstract agentName: string; 
    protected targetDestination: {x: number, y: number} | null = null;
    
    public classManager: PlayerClassManager;
    public equipment: { mainHand?: Weapon } = {};

    constructor(id: number, coordinates: { x: number, y: number }, size: {width: number, height: number}, objectId: string, attributes: Attributes, eventManager: IEventManager) {
        super(id, coordinates, size, objectId, attributes, eventManager);
        
        this.hitboxes = [
            new HitBoxCircle(
                { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
                0,
                8,
                () => {}
            )
        ];

        this.classManager = new PlayerClassManager(this as any, eventManager);
        
        this.eventManager.on('itemPickedUp', (event: any) => {
            if (event && event.itemName) {
                const normalizedName = event.itemName.replace(/\s+/g, '_').toLowerCase();
                this.notificarBDI(`item_picked_up("${normalizedName}")`);
            }
        });

        this.eventManager.on('playerMoved', (event: any) => {
            this.lastPlayerCoords = { x: event.x, y: event.y };
            this.checkAndNotifyDistance(this.lastPlayerCoords);
        });

        this.eventManager.on('entityDamaged', (event: any) => {
            if (event.entityId === this.id) {
                this.checkAndNotifyHp();
            }
        });
        
        this.eventManager.on('llmPresetChanged', (event: any) => {
            if (event && event.preset) {
                const preset = event.preset;
                if (preset.llm_model) {
                    this.notificarBDI(`current_llm_model("${preset.llm_model}")`);
                }
                const ctx = preset.num_ctx ?? 2048;
                const timeout = preset.timeout ?? 600;
                const stateless = preset.stateless ?? true;
                const temp = preset.temperature ?? 0.7;
                const maxTokens = preset.max_tokens ?? 80;
                this.notificarBDI(`update_settings(${ctx}, ${timeout}, ${stateless}, ${temp}, ${maxTokens})`, 'achieve');
            }
        });

        setTimeout(async () => {
            this.checkAndNotifyHp();
            try {
                const settings = await invoke<any>('get_settings');
                if (settings) {
                    const model = settings.llm_model || 'qwen2.5:0.5b';
                    const ctx = settings.num_ctx ?? 2048;
                    const timeout = settings.timeout ?? 600;
                    const stateless = settings.stateless ?? true;
                    const temp = settings.temperature ?? 0.7;
                    const maxTokens = settings.max_tokens ?? 80;
                    await this.notificarBDI(`current_llm_model("${model}")`);
                    await this.notificarBDI(`update_settings(${ctx}, ${timeout}, ${stateless}, ${temp}, ${maxTokens})`, 'achieve');
                } else {
                    const model = await invoke<string>('get_active_model');
                    await this.notificarBDI(`current_llm_model("${model}")`);
                }
            } catch (e) {
                this.eventManager.dispatch('log', {
                    channel: 'domain',
                    message: `[CognitiveNPC] Failed to load active model/settings in NPC ${this.npcName}: ${e}`,
                    params: []
                });
                await this.notificarBDI(`current_llm_model("qwen2.5:0.5b")`);
            }
            this.notificarBDI('game_started');
        }, 100);

        this.eventManager.on('bdiAction', (event: any) => {
            if (event.agent === this.agentName) {
                if (event.action === 'move_to') {
                    if (event.x !== undefined && event.y !== undefined) {
                        this.setDestination({x: event.x, y: event.y});
                    } else if (typeof event.content === 'string') {
                        if (event.content === 'random') {
                            const rx = this.coordinates.x + (Math.random() * 200 - 100);
                            const ry = this.coordinates.y + (Math.random() * 200 - 100);
                            this.setDestination({x: rx, y: ry});
                        } else if (event.content === 'player') {
                            if (this.lastPlayerCoords) {
                                this.setDestination({x: this.lastPlayerCoords.x, y: this.lastPlayerCoords.y});
                            }
                        } else {
                            const coords = event.content.split(',');
                            if (coords.length === 2) {
                                this.setDestination({x: parseFloat(coords[0]), y: parseFloat(coords[1])});
                            }
                        }
                    }
                } else if (event.action === 'attack') {
                    this.attackTarget();
                } else if (event.action === 'stop') {
                    this.stopMoving();
                } else if (event.action === 'speak') {
                    this.eventManager.dispatch('log', {
                        channel: 'domain',
                        message: `[LLM CHANNEL - OUT] ${this.npcName} resmungou: ${event.content}`,
                        params: []
                    });
                    this.eventManager.dispatch('npcSpoke', {
                        npcId: this.id,
                        npcName: this.npcName,
                        message: event.content
                    });
                } else if (event.action === 'dialog') {
                    this.eventManager.dispatch('log', {
                        channel: 'domain',
                        message: `[LLM CHANNEL - OUT] ${this.npcName} respondeu no diálogo: ${event.content}`,
                        params: []
                    });
                    this.eventManager.dispatch('npcDialog', {
                        npcId: this.id,
                        npcName: this.npcName,
                        entityTypeId: this.objectId,
                        message: event.content
                    });
                }
            }
        });
    }

    public receiveMessage(message: string): void {
        this.eventManager.dispatch('log', {
            channel: 'domain',
            message: `[LLM CHANNEL - IN] Jogador falou com ${this.npcName}: "${message}"`,
            params: []
        });
        this.notificarBDI(`player_spoke("${message}")`);
    }

    public setDestination(target: {x: number, y: number}): void {
        this.targetDestination = target;
    }

    public stopMoving(): void {
        this.targetDestination = null;
        this.velocity.x = 0;
        this.velocity.y = 0;
    }

    public attackTarget(): void {
        let directionToTarget = new Vector2D(this.direction.x, this.direction.y);
        
        let targetX = 0;
        let targetY = 0;
        
        // Ataca na direção do inimigo atual ou do destino
        if (this.currentTargetEnemyId !== -1) {
             const target = (this as any).eventManager?.requestEnemyPosition ? (this as any).eventManager.requestEnemyPosition(this.currentTargetEnemyId) : null;
             // Como não temos isso fácil, vamos apenas usar o destino que ele estava indo
             if (this.targetDestination) {
                 targetX = this.targetDestination.x;
                 targetY = this.targetDestination.y;
             }
        } else if (this.targetDestination) {
             targetX = this.targetDestination.x;
             targetY = this.targetDestination.y;
        }

        if (targetX !== 0 || targetY !== 0) {
            directionToTarget = new Vector2D(
                targetX - (this.coordinates.x + this.size.width / 2),
                targetY - (this.coordinates.y + this.size.height / 2)
            );
        }
        
        if (directionToTarget.x === 0 && directionToTarget.y === 0) {
            directionToTarget.x = 1; // Default direction if standing still
        }

        directionToTarget.normalizeMut();

        const weapon = (this as any).equipment?.mainHand;
        if (!weapon) {
            // Ataque base / Soco Mágico usando o sistema de colisão e dispatch nativo
            // Simula um projétil ou golpe mágico na frente
            const baseAttack = new Attack(this, this.attributes.strength || 5, 'physical');
            this.eventManager.dispatch('spawn', {
                type: 'simpleBullet', // Alterado para simpleBullet para compatibilidade com o construtor do projeto
                coordinates: { 
                    x: this.coordinates.x + this.size.width / 2 + directionToTarget.x * 20, 
                    y: this.coordinates.y + this.size.height / 2 + directionToTarget.y * 20 
                },
                direction: directionToTarget,
                attack: baseAttack
            });
            return;
        }

        weapon.attack(this, directionToTarget, this.eventManager);
    }

    public override update(deltaTime: number, _player?: any): void {
        this.updateStatuses(deltaTime);

        if (this.targetDestination) {
            const dx = this.targetDestination.x - this.coordinates.x;
            const dy = this.targetDestination.y - this.coordinates.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 32) {
                this.stopMoving();
            } else {
                this.direction.x = dx;
                this.direction.y = dy;
                this.direction.normalizeMut();
                
                const speed = this.attributes.speed || 80;
                this.velocity.x = this.direction.x * speed;
                this.velocity.y = this.direction.y * speed;
                
                this.move(deltaTime);
            }
        }

        if (this.lastPlayerCoords) {
            this.checkAndNotifyDistance(this.lastPlayerCoords);
        }

        const cx = this.coordinates.x + this.size.width / 2;
        const cy = this.coordinates.y + this.size.height / 2;
        this.hitboxes?.forEach(hb => hb.updatePosition({ x: cx, y: cy }));

        this.scanForEnemies(deltaTime);
    }

    protected scanForEnemies(deltaTime: number): void {
        this.lastEnemyScanTime += deltaTime;
        if (this.lastEnemyScanTime < 1.0) return;
        this.lastEnemyScanTime = 0;

        if (this.eventManager) {
            this.eventManager.dispatch('requestNeighbors', {
                requester: this,
                radius: 150,
                callback: (neighbors: any[]) => {
                    let foundEnemy = null;
                    for (const n of neighbors) {
                        if (n.objectId === 'enemy' || n.objectId === 'slime' || n.objectId === 'shadowMob') {
                            if (n.attributes && n.attributes.hp > 0) {
                                foundEnemy = n;
                                break;
                            }
                        }
                    }
                    if (foundEnemy) {
                        if (this.currentTargetEnemyId !== foundEnemy.id) {
                            this.currentTargetEnemyId = foundEnemy.id;
                            this.notificarBDI(`enemy_spotted(${foundEnemy.id})`);
                        }
                    } else {
                        if (this.currentTargetEnemyId !== -1) {
                            this.notificarBDI(`enemy_lost`);
                            this.currentTargetEnemyId = -1;
                        }
                    }
                }
            });
        }
    }

    protected checkAndNotifyDistance(playerCoords: {x: number, y: number}): void {
        const dist = Math.hypot(this.coordinates.x - playerCoords.x, this.coordinates.y - playerCoords.y);
        const floorDist = Math.floor(dist);
        if (Math.abs(this.lastSentDistance - floorDist) >= 15) { 
            this.lastSentDistance = floorDist;
            this.notificarBDI(`player_distance(${floorDist})`);
        }
    }

    protected checkAndNotifyHp(): void {
        const myHpPercent = Math.floor((this.attributes.hp / this.attributes.maxHp) * 100);
        if (this.lastSentHp !== myHpPercent) {
            this.lastSentHp = myHpPercent;
            this.notificarBDI(`hp_percentage(${myHpPercent})`);
        }
    }

    protected async notificarBDI(content: string, ilf: string = "tell") {
        try {
            await invoke('panteao_send', { agent: this.agentName, ilf: ilf, content: content });
        } catch (error) {
            this.eventManager.dispatch('log', {
                channel: 'domain',
                message: `[CognitiveNPC] Erro ao falar com ${this.npcName}: ${error}`,
                params: []
            });
        }
    }

    /**
     * Dispara um gatilho para mudar o estado/sprite de um asset de cenário próximo ou por preset (ex: abrir o portão do castelo).
     */
    public triggerAssetState(targetState: string, presetType?: string, options?: { passable?: boolean; radius?: number; elementId?: number }): void {
        this.eventManager.dispatch('triggerAssetState', {
            targetState,
            presetType,
            elementId: options?.elementId,
            passable: options?.passable,
            nearCoordinates: options?.elementId ? undefined : { x: this.coordinates.x, y: this.coordinates.y, radius: options?.radius ?? 400 }
        });
    }

    /**
     * Comando semântico de conveniência para abrir portões ou portas próximas.
     */
    public openGate(presetType: string = 'stone_wall_gate', radius: number = 400): void {
        this.triggerAssetState('open', presetType, { passable: true, radius });
    }

    /**
     * Comando semântico de conveniência para fechar portões ou portas próximas.
     */
    public closeGate(presetType: string = 'stone_wall_gate', radius: number = 400): void {
        this.triggerAssetState('static', presetType, { passable: false, radius });
    }
}
