import type Entity from "../../Entity";
import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type { IPlayer } from "../../../../ports/domain-contracts";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import { BindAction } from "../../../../eventDispacher/ActionBindings";
import type { action } from "../../../../eventDispacher/actions.type";
import Vector2D from "../../../../shared/Vector2D";
import Attack from "../../../Items/Attack";
import type { HitBox } from "../../../../hitBox/HitBox"; 
import StunStatus from "../../Status/StunStatus";
import "../../Casted/Leviata";

export default class Pescador extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();
    
    private hookedEnemy: any | null = null;
    private accumulatedDamage: number = 0;
    private hookTimeout: ReturnType<typeof setTimeout> | null = null;
    private hookDeployed: boolean = false;
    
    private lastDamageTick: number = 0;
    private lastHookTime: number = 0;
    private readonly hookCooldown: number = 1000;
    private readonly hookDurationSeconds: number = 0.7;
    private lastPetTime: number = 0;
    private readonly petCooldown: number = 10000;
    private lastLeviataTime: number = 0;
    private readonly leviataCooldown: number = 8000;
    private leviataSpawnAttack!: Attack;
    
    private lastNetTime: number = 0;
    private readonly netCooldown: number = 5000;

    constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
        super('Pescador', xpTable, player, eventManager);
        this.skillsByLevel.set(1, new Skill('pesc_t1_fisgada', 'Fisgada Perfeita', 'O seu puxão se torna mais rápido e pesado.', 'passive', 1));
        this.skillsByLevel.set(4, new Skill('pesc_t2_net', 'Rede Pesada', 'Joga uma rede mágica que enraíza inimigos em área.', 'active', 2, 'pesc_t1_fisgada'));
        this.skillsByLevel.set(8, new Skill('pesc_t3_leviata', 'Fúria do Leviatã', 'Invoca um Leviatã das profundezas para esmagar uma área.', 'active', 3, 'pesc_t2_net'));
        this.skillsByLevel.set(16, new Skill('pesc_t4_fishpet', 'Peixinho de Combate', 'Invoca um peixinho lutador imortal da dimensão aquática.', 'essential', 4, 'pesc_t3_leviata'));

        this.eventManager.on('hookDestroyed', (payload) => {
            if (payload.playerId === this.player.id) {
                this.hookDeployed = false;
                //? Impede chain-hooking recomeçando o cooldown apenas quando a habilidade termina.
                this.lastHookTime = Date.now();
                if (this.hookedEnemy) {
                    this.releaseEnemy();
                }
            }
        });
    }

    /**
     * Invoca o peixinho de combate usando a tecla F
     */
    @BindAction('spell_f')
    public onSummonPet() {
        if (!this.player.unlockedSkills.has('pesc_t4_fishpet')) return;
        
        if ((this.player as any).isSkillOnCooldown?.('pesc_t4_fishpet')) return;
        
        const now = Date.now();
        if (now - this.lastPetTime < this.petCooldown) return;
        this.lastPetTime = now;
        (this.player as any).setSkillCooldown?.('pesc_t4_fishpet', this.petCooldown);

        this.eventManager.dispatch('spawn', {
            type: 'fishPet',
            coordinates: { x: this.player.coordinates.x, y: this.player.coordinates.y }
        });

        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: 'Peixinho de Combate invocado!', params: [] });
    }

    /**
     * Joga o anzol ou move o pescado usando o clique esquerdo
     */
    @BindAction('leftClick')
    public onLeftClick(mouseCoordinates: {x: number, y: number}, _action: action) {
        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] onLeftClick disparado! hookDeployed=${this.hookDeployed} hookedEnemy=${!!this.hookedEnemy}`, params: [] });

        if (this.hookedEnemy) {
            this.controlHookedEnemy(mouseCoordinates);
        } else if (!this.hookDeployed) {
            const now = Date.now();
            if (now - this.lastHookTime < this.hookCooldown) return;
            this.lastHookTime = now;

            const px = this.player.coordinates.x + this.player.size.width / 2;
            const py = this.player.coordinates.y + this.player.size.height / 2;
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py).normalizeMut();

            const hookAttack = new Attack(this.player as any, 5, 'physical', [
                (attacker, target, damageDealt) => {
                    this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Anzol bateu no ID: ${(target as any)?.id}`, params: [] });
                    //? Duck Typing: Garante que o alvo possui HP e não é o próprio jogador nem invocações aliadas.
                    const isAlliedOrSelf = target.id === this.player.id || 
                        target.objectId === 'player' || 
                        target.objectId === 'spawn-leviatã' || 
                        target.objectId === 'spawn-leviata' || 
                        target.objectId === 'fishPet';

                    if ('takeDamage' in target && target.attributes && target.attributes.hp > 0 && !isAlliedOrSelf) {
                        if (!target.objectId.toString().toLowerCase().includes('boss')) {
                            this.hookEnemy(target);
                        } else {
                            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Alvo ignorado (é um Boss)`, params: [] });
                        }
                    } else {
                        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Alvo ignorado (Faltam atributos, está morto, é o player ou invocação aliada)`, params: [] });
                    }
                }
            ]);

            this.eventManager.dispatch('spawn', {
                type: 'fishingHook', 
                coordinates: { x: px, y: py },
                direction: dir,
                attack: hookAttack
            });
            
            this.hookDeployed = true;
            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: 'Anzol lançado!', params: [] });
        }
    }

    private hookEnemy(target: any) {
        if (this.hookedEnemy) return; 
        
        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] hookEnemy: Inimigo ${target.id} fisgado e atordoado!`, params: [] });

        this.hookedEnemy = target;
        this.accumulatedDamage = 0;

        //? Aplica Stun no alvo para suspender o comportamento de IA durante o arrasto.
        try {
            if (typeof target.applyStatus === 'function') {
                target.applyStatus(new StunStatus(this.hookDurationSeconds));
            } else {
                throw new Error("No applyStatus method");
            }
        } catch (e) {
            //? Fallback defensivo para objetos customizados que não implementem applyStatus.
            if (!target.activeStatuses || typeof target.activeStatuses.set !== 'function') {
                target.activeStatuses = new Map<string, any>();
            }
            target.activeStatuses.set('stun', { 
                id: 'stun', description: 'Pescado', duration: this.hookDurationSeconds, elapsed: 0, 
                update: function(dt: number) { this.elapsed += dt; return this.elapsed >= this.duration; }, 
                apply: () => {} 
            });
        }

        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: 'Inimigo pescado!', params: [] });
        this.eventManager.dispatch('particle', { effect: 'magicAura', x: target.coordinates.x, y: target.coordinates.y, color: '#00aaff' });

        this.hookTimeout = setTimeout(() => {
            this.releaseEnemy();
        }, this.hookDurationSeconds * 1000);
    }

    private controlHookedEnemy(mouseCoordinates: {x: number, y: number}) {
        if (!this.hookedEnemy || !this.hookedEnemy.attributes || this.hookedEnemy.attributes.hp <= 0 || !mouseCoordinates) {
            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] controlHookedEnemy: Abortando (Sem alvo ou HP <= 0)`, params: [] });
            this.releaseEnemy();
            return;
        }

        const cx = this.hookedEnemy.coordinates.x + this.hookedEnemy.size.width / 2;
        const cy = this.hookedEnemy.coordinates.y + this.hookedEnemy.size.height / 2;
        const dx = mouseCoordinates.x - cx;
        const dy = mouseCoordinates.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Arrastando... Distância=${Math.floor(dist)}. Mouse: ${Math.floor(mouseCoordinates.x)},${Math.floor(mouseCoordinates.y)}`, params: [] });

        if (dist > 10) {
            const dir = new Vector2D(dx, dy).normalizeMut();
            const pullSpeed = 12;
            this.hookedEnemy.coordinates.x += dir.x * pullSpeed;
            this.hookedEnemy.coordinates.y += dir.y * pullSpeed;
            
            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Inimigo forçado para as cordenadas: X=${Math.floor(this.hookedEnemy.coordinates.x)}, Y=${Math.floor(this.hookedEnemy.coordinates.y)}`, params: [] });
            
            //? Sincroniza a hitbox do alvo imediatamente com a nova posição para evitar atraso no ObjectElementManager.
            this.hookedEnemy.hitboxes?.forEach((hb: HitBox) => hb.updatePosition({ 
                x: this.hookedEnemy!.coordinates.x + this.hookedEnemy!.size.width / 2, 
                y: this.hookedEnemy!.coordinates.y + this.hookedEnemy!.size.height / 2 
            }));
            
            //? Zera a velocidade física base para sobrepor o steering da IA durante o puxão.
            if (this.hookedEnemy.velocity && typeof this.hookedEnemy.velocity.resetMut === 'function') {
                this.hookedEnemy.velocity.resetMut();
            }
        }

        //? Mecânica de Bola de Demolição: causa dano por colisão em inimigos adjacentes durante o arrasto.
        const now = Date.now();
        //? Throttling de dano de colisão a cada 250ms para evitar spikes de dano por frame.
        if (now - this.lastDamageTick > 250) {
            this.lastDamageTick = now;
            
            this.eventManager.dispatch('requestNeighbors', {
                requester: this.hookedEnemy,
                radius: this.hookedEnemy.size.width + 16,
                callback: (neighbors) => {
                    neighbors.forEach(neighbor => {
                        if (neighbor.id !== this.hookedEnemy!.id && 'takeDamage' in neighbor && (neighbor as any).attributes && neighbor.id !== this.player.id) {
                            const damage = 20 + Math.floor(this.player.attributes.strength * 1.5);
                            const attack = new Attack(this.player as any, damage, 'physical', []);
                            
                            const knockbackDir = new Vector2D(
                                neighbor.coordinates.x - this.hookedEnemy!.coordinates.x, 
                                neighbor.coordinates.y - this.hookedEnemy!.coordinates.y
                            );
                            
                            //? Proteção contra divisão por zero e vetor NaN quando as coordenadas coincidem.
                            if (knockbackDir.x === 0 && knockbackDir.y === 0) knockbackDir.x = 1;
                            knockbackDir.normalizeMut();

                            attack.execute(neighbor as any, knockbackDir);
                            this.accumulatedDamage += damage; 
                            this.eventManager.dispatch('particle', { effect: 'bloodSplatter', x: neighbor.coordinates.x, y: neighbor.coordinates.y });
                        }
                    });
                }
            });
        }
    }

    private releaseEnemy() {
        if (!this.hookedEnemy) return;

        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] releaseEnemy acionado.`, params: [] });

        //! Limpa o estado interno antes de despachar eventos para evitar stack overflow em listeners reentrantes.
        const target = this.hookedEnemy;
        const damage = this.accumulatedDamage;

        this.hookedEnemy = null;
        this.accumulatedDamage = 0;
        if (this.hookTimeout) {
            clearTimeout(this.hookTimeout);
            this.hookTimeout = null;
        }
        
        if (target.activeStatuses && typeof target.activeStatuses.delete === 'function') {
            target.activeStatuses.delete('stun');
        }

        //? Retribuição: ao soltar o alvo, aplica o dano total acumulado como true damage.
        if (target && target.attributes && target.attributes.hp > 0 && damage > 0) {
            const finalAttack = new Attack(this.player as any, damage, 'true', []);
            finalAttack.execute(target, new Vector2D(0, 0));
            
            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `O pescado sofreu ${damage} de retribuição!`, params: [] });
            
            const cx = target.coordinates.x + target.size.width / 2;
            const cy = target.coordinates.y + target.size.height / 2;
            this.eventManager.dispatch('particle', { effect: 'criticalStrike', x: cx, y: cy });
        }
        
        this.eventManager.dispatch('releaseFishingHook', { playerId: this.player.id });
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Skill ${skillId} executada no Loadout!`, params: [] });

        if (skillId === 'pesc_t3_leviata') {
            if ((this.player as any).isSkillOnCooldown?.(skillId)) {
                this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Leviatã em recarga!`, params: [] });
                return;
            }
            const now = Date.now();
            if (now - this.lastLeviataTime < this.leviataCooldown) {
                this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Leviatã em recarga!`, params: [] });
                return;
            }
            this.lastLeviataTime = now;
            (this.player as any).setSkillCooldown?.(skillId, this.leviataCooldown);

            const damage = 150 + Math.floor(this.player.attributes.wisdom * 5);
            const leviataAttack = new Attack(this.player as any, damage, 'magical', []);

            this.eventManager.dispatch('spawn', {
                type: 'spawn-leviatã' as any,
                coordinates: mouseCoordinates,
                attack: leviataAttack
            });
        } else if (skillId === 'pesc_t2_net') {
            if ((this.player as any).isSkillOnCooldown?.(skillId)) {
                this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Rede Pesada em recarga!`, params: [] });
                return;
            }
            const now = Date.now();
            if (now - this.lastNetTime < this.netCooldown) {
                this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Rede Pesada em recarga!`, params: [] });
                return;
            }
            this.lastNetTime = now;
            (this.player as any).setSkillCooldown?.(skillId, this.netCooldown);
            
            this.eventManager.dispatch('spawnVisual', {
                type: 'fishing-net',
                coordinates: { x: mouseCoordinates.x - 48, y: mouseCoordinates.y - 48 },
                duration: 0.6,
                size: { width: 96, height: 96 }
            });

            const radius = 96;
            const damage = 20 + Math.floor(this.player.attributes.strength);
            const rootAction = (attacker: Entity, target: Entity) => {
                target.activeStatuses.set('stun', new StunStatus(3) as any);
            };
            const netAttack = new Attack(this.player as any, damage, 'physical', [rootAction]);
            
            this.eventManager.dispatch('requestNeighbors', {
                coordinates: mouseCoordinates,
                radius: radius,
                callback: (neighbors: any[]) => {
                    let hitCount = 0;
                    neighbors.forEach(n => {
                        if (n.id !== this.player.id && 'takeDamage' in n) {
                            //? Vetor nulo para manter o alvo imobilizado sem knockback.
                            const dir = new Vector2D(0, 0);
                            netAttack.execute(n, dir);
                            this.eventManager.dispatch('particle', { effect: 'waterSplash', x: n.coordinates.x, y: n.coordinates.y });
                            hitCount++;
                        }
                    });
                    this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Rede Pesada atingiu ${hitCount} alvos!`, params: [] });
                }
            });
        }
    }

    //? ----------- Skills -----------
    public getSkillForLevel(level: number): Skill | null { return this.skillsByLevel.get(level) || null; }
    public get allSkills(): Skill[] { return Array.from(this.skillsByLevel.values()); }
}