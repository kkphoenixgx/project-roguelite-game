import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type Player from "../Player";
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
    
    // Estado da mecânica de pesca
    private hookedEnemy: any | null = null;
    private accumulatedDamage: number = 0;
    private hookTimeout: ReturnType<typeof setTimeout> | null = null;
    private hookDeployed: boolean = false;
    
    // Cooldowns
    private lastDamageTick: number = 0;
    private lastHookTime: number = 0;
    private readonly hookCooldown: number = 1000;
    private readonly hookDurationSeconds: number = 0.7;
    private lastPetTime: number = 0;
    private readonly petCooldown: number = 10000; // 10s cooldown
    private lastLeviataTime: number = 0;
    private readonly leviataCooldown: number = 8000; // 8s de recarga
    private leviataSpawnAttack: Attack;
    
    private lastNetTime: number = 0;
    private readonly netCooldown: number = 5000;

    constructor(xpTable: IXPTable, player: Player, eventManager: IEventManager) {
        super('Pescador', xpTable, player, eventManager);
        // Exemplo de uma passiva inicial temática
        this.skillsByLevel.set(1, new Skill('pesc_t1_fisgada', 'Fisgada Perfeita', 'O seu puxão se torna mais rápido e pesado.', 'passive', 1));
        this.skillsByLevel.set(4, new Skill('pesc_t2_net', 'Rede Pesada', 'Joga uma rede mágica que enraíza inimigos em área.', 'active', 2, 'pesc_t1_fisgada'));
        this.skillsByLevel.set(8, new Skill('pesc_t3_leviata', 'Fúria do Leviatã', 'Invoca um Leviatã das profundezas para esmagar uma área.', 'active', 3, 'pesc_t2_net'));
        this.skillsByLevel.set(16, new Skill('pesc_t4_fishpet', 'Peixinho de Combate', 'Invoca um peixinho lutador imortal da dimensão aquática.', 'essential', 4));

        this.eventManager.on('hookDestroyed', (payload) => {
            if (payload.playerId === this.player.id) {
                this.hookDeployed = false;
                this.lastHookTime = Date.now(); // Impede o Chain-Hooking recomeçando o Cooldown apenas quando a habilidade acaba!
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
        
        const now = Date.now();
        if (now - this.lastPetTime < this.petCooldown) return;
        this.lastPetTime = now;

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
            // Se já pescou alguém, o clique esquerdo serve para arrastar
            this.controlHookedEnemy(mouseCoordinates);
        } else if (!this.hookDeployed) {
            // Se não tem ninguém pescado, o clique esquerdo joga o anzol
            const now = Date.now();
            if (now - this.lastHookTime < this.hookCooldown) return;
            this.lastHookTime = now;

            const px = this.player.coordinates.x + this.player.size.width / 2;
            const py = this.player.coordinates.y + this.player.size.height / 2;
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py).normalizeMut();

            // O Ataque carregado pelo anzol
            const hookAttack = new Attack(this.player, 5, 'physical', [
                (attacker, target, damageDealt) => {
                    this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Anzol bateu no ID: ${(target as any)?.id}`, params: [] });
                    // Duck Typing: Verifica se o alvo é uma entidade atacável, possui HP e não é o próprio jogador
                    if ('takeDamage' in target && target.attributes && target.attributes.hp > 0 && target.id !== this.player.id) {
                        // Ignora Bosses
                        if (!target.objectId.toString().toLowerCase().includes('boss')) {
                            this.hookEnemy(target);
                        } else {
                            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Alvo ignorado (é um Boss)`, params: [] });
                        }
                    } else {
                        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Alvo ignorado (Faltam atributos, está morto ou é o player)`, params: [] });
                    }
                }
            ]);

            // Dispara o anzol real mapeado na fábrica!
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

        // Stun no inimigo para a IA parar de lutar contra o arrasto
        try {
            if (typeof target.applyStatus === 'function') {
                // Instancia o Status real do seu domínio com a duração configurada!
                target.applyStatus(new StunStatus(this.hookDurationSeconds));
            } else {
                throw new Error("No applyStatus method");
            }
        } catch (e) {
            // Fallback de segurança extremo se o inimigo for um objeto customizado ou o Stun falhar
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
        // Um feedback visual para mostrar quem foi pescado
        this.eventManager.dispatch('particle', { effect: 'magicAura', x: target.coordinates.x, y: target.coordinates.y, color: '#00aaff' });

        // A duração sob controle
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

        // 1. Move o inimigo pescado em direção ao mouse
        const cx = this.hookedEnemy.coordinates.x + this.hookedEnemy.size.width / 2;
        const cy = this.hookedEnemy.coordinates.y + this.hookedEnemy.size.height / 2;
        const dx = mouseCoordinates.x - cx;
        const dy = mouseCoordinates.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Arrastando... Distância=${Math.floor(dist)}. Mouse: ${Math.floor(mouseCoordinates.x)},${Math.floor(mouseCoordinates.y)}`, params: [] });

        if (dist > 10) {
            const dir = new Vector2D(dx, dy).normalizeMut();
            const pullSpeed = 12; // Velocidade de arrasto
            this.hookedEnemy.coordinates.x += dir.x * pullSpeed;
            this.hookedEnemy.coordinates.y += dir.y * pullSpeed;
            
            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Inimigo forçado para as cordenadas: X=${Math.floor(this.hookedEnemy.coordinates.x)}, Y=${Math.floor(this.hookedEnemy.coordinates.y)}`, params: [] });
            
            // Sincroniza a hitbox do inimigo forçadamente para o loop do ObjectElementManager não errar
            this.hookedEnemy.hitboxes?.forEach((hb: HitBox) => hb.updatePosition({ 
                x: this.hookedEnemy!.coordinates.x + this.hookedEnemy!.size.width / 2, 
                y: this.hookedEnemy!.coordinates.y + this.hookedEnemy!.size.height / 2 
            }));
            
            // Zera a velocidade física base para ele parar de seguir a IA própria enquanto pescado
            if (this.hookedEnemy.velocity && typeof this.hookedEnemy.velocity.resetMut === 'function') {
                this.hookedEnemy.velocity.resetMut();
            }
        }

        // 2. Dano de colisão com outros inimigos (Bola de Demolição)
        const now = Date.now();
        if (now - this.lastDamageTick > 250) { // Cooldown para não dar 60 instâncias de dano por segundo!
            this.lastDamageTick = now;
            
            this.eventManager.dispatch('requestNeighbors', {
                requester: this.hookedEnemy,
                radius: this.hookedEnemy.size.width + 16, // Raio de colisão estendido
                callback: (neighbors) => {
                    neighbors.forEach(neighbor => {
                        // Duck Typing seguro no lugar do instanceof!
                        if (neighbor.id !== this.hookedEnemy!.id && 'takeDamage' in neighbor && (neighbor as any).attributes && neighbor.id !== this.player.id) {
                            
                            // Causa dano no vizinho atropelado
                            const damage = 20 + Math.floor(this.player.attributes.strength * 1.5);
                            const attack = new Attack(this.player, damage, 'physical', []);
                            
                            const knockbackDir = new Vector2D(
                                neighbor.coordinates.x - this.hookedEnemy!.coordinates.x, 
                                neighbor.coordinates.y - this.hookedEnemy!.coordinates.y
                            );
                            
                            if (knockbackDir.x === 0 && knockbackDir.y === 0) knockbackDir.x = 1; // Proteção contra NaN
                            knockbackDir.normalizeMut();

                            attack.execute(neighbor as any, knockbackDir);
                            
                            // Acumula o dano para ser descontado no final!
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

        // Salva referências e limpa o estado ANTES de despachar os eventos
        // Isso blinda a engine contra um Event Loop Infinito (Stack Overflow) síncrono!
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

        // 3. Ao final dos 3 segundos, o pescado toma todo o dano que ele causou (Retribuição!)
        if (target.attributes.hp > 0 && damage > 0) {
            const finalAttack = new Attack(this.player, damage, 'true', []);
            finalAttack.execute(target, new Vector2D(0, 0));
            
            this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `O pescado sofreu ${damage} de retribuição!`, params: [] });
            
            const cx = target.coordinates.x + target.size.width / 2;
            const cy = target.coordinates.y + target.size.height / 2;
            this.eventManager.dispatch('particle', { effect: 'criticalStrike', x: cx, y: cy });
        }
        
        // Avisa à linha de pesca que acabou a brincadeira
        this.eventManager.dispatch('releaseFishingHook', { playerId: this.player.id });
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Skill ${skillId} executada no Loadout!`, params: [] });

        if (skillId === 'pesc_t3_leviata') {
            const now = Date.now();
            if (now - this.lastLeviataTime < this.leviataCooldown) {
                this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Leviatã em recarga!`, params: [] });
                return;
            }
            this.lastLeviataTime = now;

            // Leviatã dá dano mágico maciço em área (a hitbox já é 128x128 no Leviata.ts)
            const damage = 150 + Math.floor(this.player.attributes.wisdom * 5);
            const leviataAttack = new Attack(this.player, damage, 'magical', []);

            this.eventManager.dispatch('spawn', {
                type: 'spawn-leviatã' as any,
                coordinates: mouseCoordinates,
                attack: leviataAttack
            });
        } else if (skillId === 'pesc_t2_net') {
            const now = Date.now();
            if (now - this.lastNetTime < this.netCooldown) {
                this.eventManager.dispatch('log', { channel: 'classes:pescador', message: `[Pescador] Rede Pesada em recarga!`, params: [] });
                return;
            }
            this.lastNetTime = now;
            
            // Visual de água/rede
            this.eventManager.dispatch('spawnVisual', {
                type: 'waterSplash',
                coordinates: { x: mouseCoordinates.x - 48, y: mouseCoordinates.y - 48 },
                duration: 0.5,
                size: { width: 96, height: 96 }
            });

            // Enraíza/stun em área
            const radius = 96;
            const damage = 20 + Math.floor(this.player.attributes.strength);
            // OnHitAction aplica StunStatus por 3 segundos
            const rootAction = (attacker: Entity, target: Entity) => {
                target.activeStatuses.set('stun', new StunStatus(target, 3));
            };
            const netAttack = new Attack(this.player, damage, 'physical', [rootAction]);
            
            this.eventManager.dispatch('requestNeighbors', {
                coordinates: mouseCoordinates,
                radius: radius,
                callback: (neighbors: any[]) => {
                    let hitCount = 0;
                    neighbors.forEach(n => {
                        if (n.id !== this.player.id && 'takeDamage' in n) {
                            const dir = new Vector2D(0, 0); // Sem knockback, apenas root
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