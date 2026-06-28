import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type Player from "../Player";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents"; 
import Attack from "../../../Items/Attack";
import { BindAction } from "../../../../eventDispacher/ActionBindings";
import type { action } from "../../../../eventDispacher/actions.type";
import type { OnHitAction } from "../../../Items/IAtack";
import Vector2D from "../../../../shared/Vector2D";

import type Entity from "../../Entity";
import StunStatus from "../../Status/StunStatus";

export default class Mage extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();

    private spellBuffer: action[] = [];
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private readonly SPELL_TIMEOUT = 500;
    
    private lastTeleportTime: number = 0;
    private readonly teleportCooldown: number = 3000;

    constructor(xpTable: IXPTable, player: Player, eventManager: IEventManager) {
        super('Mago', xpTable, player, eventManager);
        this.skillsByLevel.set(1, new Skill('m_t1_fireball', 'Axioma Inicial', 'A fundação do Axiomante. Dispara um projétil puro usando as teclas de feitiço.', 'essential', 1));
        this.skillsByLevel.set(4, new Skill('m_t2_burn', 'Sobrecarga de Mana', 'Aumenta passivamente a regeneração de mana no calor da batalha.', 'passive', 2, 'm_t1_fireball'));
        this.skillsByLevel.set(6, new Skill('m_t3_knowledge', 'Erudição', 'Concede um aumento formidável em Inteligência Máxima.', 'attribute', 3, 'm_t2_burn'));
        this.skillsByLevel.set(8, new Skill('m_t4_teleport', 'Translocação (Blink)', 'Teletransporta o corpo pelo tecido da realidade numa curta distância.', 'active', 4, 'm_t3_knowledge'));
    }

    @BindAction('spell_0')
    @BindAction('spell_1')
    @BindAction('spell_2')
    @BindAction('spell_3')
    @BindAction('spell_4')
    @BindAction('spell_5')
    @BindAction('spell_6')
    @BindAction('spell_7')
    @BindAction('spell_8')
    @BindAction('spell_9')
    public onSpellInput(_mouseCoordinates: any, action: action) {
        if (this.player.activeStatuses.has('stun') || this.player.activeStatuses.has('paralyze')) return; // Concentração quebrada!
        this.spellBuffer.push(action);
        
        // Trava de segurança: se passar de 9 teclas (overload de magia), a concentração quebra e o buffer limpa
        if (this.spellBuffer.length > 9) {
            this.spellBuffer = [];
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.eventManager.dispatch('log', { channel: 'input', message: "Spell buffer overflow (>9). Concentration broken!", params: [] });
            return;
        }

        this.eventManager.dispatch('log', { channel: 'input', message: `Current Spell Buffer: [${this.spellBuffer.map(s => s.split('_')[1]).join(', ')}]`, params: [] });
        
        if (this.timeoutId) clearTimeout(this.timeoutId);

        // O timer agora é o responsável por engatilhar a magia (Auto-Cast) após o jogador parar de digitar
        this.timeoutId = setTimeout(() => {
            this.evaluateSpellBuffer();
            this.spellBuffer = [];
        }, this.SPELL_TIMEOUT);
    }

    @BindAction('castSpell')
    public onCastSpell() {
        if (this.spellBuffer.length > 0) {
            this.evaluateSpellBuffer();
            this.spellBuffer = [];
            if (this.timeoutId) clearTimeout(this.timeoutId);
        }
    }

    private evaluateSpellBuffer(): boolean {
        const sequence = this.spellBuffer.join(',');
        const direction = this.player.facingDirection.clone();

        const spawnCoordinates = {
            x: this.player.coordinates.x + this.player.size.width / 2,
            y: this.player.coordinates.y + this.player.size.height / 2
        };
        
        const manaCost: number = 5 * this.spellBuffer.length;
        if (this.player.attributes.mana < manaCost) return false;

        // Magias Estáticas (Centralizadas na estrutura Switch)
        switch (sequence) {
            case 'spell_0,spell_4,spell_0':
                return this.castFireball(direction, spawnCoordinates, manaCost);
            case 'spell_0,spell_9,spell_0':
                return this.castMagicMissile(direction, spawnCoordinates, manaCost);
            default:
                return this.parseDynamicSpell(this.spellBuffer, direction, spawnCoordinates, manaCost);
        }
    }

    //? ----------- Magias Estáticas (Prontas) -----------

    private castFireball(direction: Vector2D, spawnCoordinates: {x: number, y: number}, manaCost: number): boolean {
        const baseDamage = 30 + Math.floor(this.player.attributes.intelligence * 2);
        
        const fireballParticles: OnHitAction = (_, target) => {
            this.eventManager.dispatch('particle', { effect: 'fireExplosion', x: target.coordinates.x, y: target.coordinates.y });
        };

        const playerAttack = new Attack(this.player, baseDamage, 'magical', [fireballParticles]);
        
        this.eventManager.dispatch('spawn', {
            type: 'fireball',
            coordinates: spawnCoordinates,
            direction: direction,
            attack: playerAttack
        });
        
        this.eventManager.dispatch('particle', { effect: 'fireExplosion', x: spawnCoordinates.x, y: spawnCoordinates.y });
        this.eventManager.dispatch('log', { channel: 'domain', message: `Cast static spell: Fireball!`, params: [] });
        
        this.player.attributes.mana -= manaCost;
        return true;
    }

    private castMagicMissile(direction: Vector2D, spawnCoordinates: {x: number, y: number}, manaCost: number): boolean {
        const baseDamage = 10 + Math.floor(this.player.attributes.intelligence * 2);
        const playerAttack = new Attack(this.player, baseDamage, 'magical', []);
        
        this.eventManager.dispatch('requestNeighbors', {
            requester: this.player,
            radius: 600,
            callback: (neighbors) => {
                const potentialTargets = neighbors.filter(n => n.id !== this.player.id && 'takeDamage' in n && (n as any).attributes.hp > 0);
                potentialTargets.sort((a, b) => this.player.getDistanceTo(a) - this.player.getDistanceTo(b));

                const targets = potentialTargets.slice(0, 3);
                let missilesFired = 0;

                for (const target of targets) {
                    this.eventManager.dispatch('spawn', {
                        type: 'magicMissile',
                        coordinates: { ...spawnCoordinates },
                        attack: playerAttack,
                        target: target
                    } as any);
                    missilesFired++;
                }

                while (missilesFired < 3) {
                    this.eventManager.dispatch('spawn', {
                        type: 'magicMissile',
                        coordinates: { ...spawnCoordinates },
                        direction: this.player.facingDirection.clone(),
                        attack: playerAttack
                    });
                    missilesFired++;
                }
            }
        });

        this.eventManager.dispatch('particle', { effect: 'magicPulse', x: spawnCoordinates.x, y: spawnCoordinates.y });
        this.eventManager.dispatch('log', { channel: 'domain', message: `Cast static spell: Homing Magic Missiles!`, params: [] });

        this.player.attributes.mana -= manaCost;
        return true;
    }

    //? ----------- Solvers de Magia Dinâmica (Parser, Formas, Elementos) -----------

    private parseDynamicSpell(buffer: action[], direction: Vector2D, spawnCoordinates: {x: number, y: number}, manaCost: number): boolean {
        const formMap: Record<string, string> = {
            "spell_0" : "projectile",
            "spell_1" : "self",
        };
        const forceMap: Record<string, string> = {
            "spell_2" : "knockback",
            "spell_3" : "pull",
        };
        const elementMap: Record<string, string> = {
            'spell_4': 'fire',
            'spell_5': 'water',
            'spell_6': 'ground',
            'spell_7': 'dark',
            'spell_8': 'light',
            'spell_9': 'magic'
        };

        const forms: string[] = [];
        const forces: string[] = [];
        const rawElements: string[] = [];

        for (const act of buffer) {
            const form = formMap[act];
            if (form) forms.push(form);
            const force = forceMap[act];
            if (force) forces.push(force);
            const element = elementMap[act];
            if (element) rawElements.push(element);
        }

        // O Motor de Fusão Deep 2:
        const comboMap: Record<string, string> = {
            'magic,fire': 'potencia', 'magic,water': 'ice', 'magic,ground': 'life',
            'magic,dark': 'caos', 'magic,light': 'ordem', 'fire,water': 'air',
            'fire,ground': 'magma', 'fire,dark': 'infernous', 'fire,light': 'thunder',
            'water,ground': 'nature', 'water,dark': 'abys', 'water,light': 'holy',
            'ground,dark': 'decay', 'ground,light': 'crystal'
        };

        const elements: string[] = [];
        for (let i = 0; i < rawElements.length; i++) {
            const curr = rawElements[i]!;
            if (i < rawElements.length - 1) {
                const next = rawElements[i+1]!;
                const pair = `${curr},${next}`;
                const combo = comboMap[pair];
                if (combo) {
                    elements.push(combo);
                    i++; // Consome o segundo elemento (ele foi fundido!)
                    continue;
                }
            }
            elements.push(curr);
        }

        // Roteia para o Solver de Forma correto
        if (forms.includes('projectile')) {
            return this.solveProjectile(elements, forces, direction, spawnCoordinates, manaCost);
        } else if (forms.includes('self')) {
            return this.solveSelf(elements, forces, direction, spawnCoordinates, manaCost);
        }

        return false;
    }

    private solveProjectile(elements: string[], forces: string[], direction: Vector2D, spawnCoordinates: {x: number, y: number}, manaCost: number): boolean {
        const baseDamage = 10 + (10 * elements.length) + Math.floor(this.player.attributes.intelligence);
        const onHitActions: OnHitAction[] = [];

        // Os elementos geram efeitos e reações visuais no ponto de impacto
        if (elements.length > 0) {
            onHitActions.push((_, target) => {
                const effectMap: Record<string, string> = { 
                    'fire': 'fireExplosion', 'water': 'waterSplash', 'ground': 'rockShatter', 'dark': 'darkPulse', 'light': 'lightFlash', 'magic': 'magicPulse',
                    'potencia': 'fireExplosion', 'ice': 'iceShard', 'life': 'levelUp', 'caos': 'darkPulse', 'ordem': 'lightFlash', 'air': 'windGust',
                    'magma': 'magmaBurst', 'infernous': 'darkPulse', 'thunder': 'slashSparks', 'nature': 'natureBurst', 'abys': 'darkPulse', 'holy': 'lightFlash',
                    'decay': 'darkPulse', 'crystal': 'crystalShatter'
                };
                const cx = target.coordinates.x + target.size.width / 2;
                const cy = target.coordinates.y + target.size.height / 2;
                elements.forEach(el => {
                    if (effectMap[el]) this.eventManager.dispatch('particle', { effect: effectMap[el] as any, x: cx, y: cy });
                });
            });
        }

        // As forças são injetadas como callbacks (OnHitAction), aplicando seu vetor na colisão.
        // isSelf: false (Projétil é quem empurra/puxa o alvo)
        forces.forEach(force => {
            if (force === 'knockback') onHitActions.push((attacker, target) => this.solveKnockback(target, attacker.coordinates, false, direction));
            if (force === 'pull') onHitActions.push((attacker, target) => this.solvePull(target, attacker.coordinates, false, direction));
        });

        const playerAttack = new Attack(this.player, baseDamage, 'magical', onHitActions);

        this.eventManager.dispatch('spawn', {
            type: 'dynamicSpell' as any,
            coordinates: spawnCoordinates,
            direction: direction,
            attack: playerAttack,
            spellElements: elements
        });

        this.eventManager.dispatch('particle', { effect: 'magicAura', x: spawnCoordinates.x, y: spawnCoordinates.y });
        this.eventManager.dispatch('log', { channel: 'domain', message: `Cast Dynamic Projectile! Elements: [${elements.join(', ')}], Forces: [${forces.join(', ')}]`, params: [] });
        
        this.player.attributes.mana -= manaCost;
        return true;
    }

    private solveSelf(elements: string[], forces: string[], direction: Vector2D, spawnCoordinates: {x: number, y: number}, manaCost: number): boolean {
        // Aplicação das Forças diretamente no próprio conjurador (Self) no momento do cast.
        // isSelf: true (A magia não tem alvo colidível, é uma transição do motor de física).
        forces.forEach(force => {
            if (force === 'knockback') this.solveKnockback(this.player, spawnCoordinates, true, direction);
            if (force === 'pull') this.solvePull(this.player, spawnCoordinates, true, direction);
        });

        // Se contiver elementos puros, a magia Self gera uma área de dano envolta do Mago
        if (elements.length > 0) {
            const baseDamage = 10 + (10 * elements.length) + Math.floor(this.player.attributes.intelligence);
            const playerAttack = new Attack(this.player, baseDamage, 'magical', []);
            
            this.eventManager.dispatch('requestNeighbors', {
                requester: this.player,
                radius: 150,
                callback: (neighbors) => {
                    neighbors.forEach(n => {
                        if (n.id !== this.player.id && 'takeDamage' in n) playerAttack.execute(n as any, direction);
                    });
                }
            });

            const effectMap: Record<string, string> = { 
                'fire': 'fireExplosion', 'water': 'waterSplash', 'ground': 'rockShatter', 'dark': 'darkPulse', 'light': 'lightFlash', 'magic': 'magicPulse',
                'potencia': 'fireExplosion', 'ice': 'iceShard', 'life': 'levelUp', 'caos': 'darkPulse', 'ordem': 'lightFlash', 'air': 'windGust',
                'magma': 'magmaBurst', 'infernous': 'darkPulse', 'thunder': 'slashSparks', 'nature': 'natureBurst', 'abys': 'darkPulse', 'holy': 'lightFlash',
                'decay': 'darkPulse', 'crystal': 'crystalShatter'
            };
            elements.forEach(el => {
                if (effectMap[el]) this.eventManager.dispatch('particle', { effect: effectMap[el] as any, x: spawnCoordinates.x, y: spawnCoordinates.y });
            });
        } else {
            // Self puro apenas brilha para dar feedback que gastou mana em um coice/puxão
            this.eventManager.dispatch('particle', { effect: 'magicAura', x: spawnCoordinates.x, y: spawnCoordinates.y });
        }

        this.eventManager.dispatch('log', { channel: 'domain', message: `Cast Self Spell! Elements: [${elements.join(', ')}], Forces: [${forces.join(', ')}]`, params: [] });
        this.player.attributes.mana -= manaCost;
        return true;
    }

    //? ----------- Solvers Físicos (Forças Vetoriais) -----------

    private solveKnockback(target: Entity, sourceCoords: {x: number, y: number}, isSelf: boolean, direction: Vector2D): void {
        const forceMagnitude = 15; // 25 pixels/frame = 1500 pixels por segundo!
        
        const tCx = target.coordinates.x + target.size.width / 2;
        const tCy = target.coordinates.y + target.size.height / 2;
        
        this.eventManager.dispatch('spawnVisual', {
            type: 'knockback-vfx',
            coordinates: { x: tCx - 32, y: tCy - 32 }, // Centralizado (Assumindo que o VFX tem cerca de 64x64)
            duration: 0.2,
            size: { width: 64, height: 64 },
            rotation: direction.angle()
        });

        if (isSelf) {
            // Magia Self + Knockback: O Mago é arremessado para trás pelo coice.
            const recoil = direction.clone().invertMut().multiplyMut(forceMagnitude);
            target.applyForce(recoil);
            setTimeout(() => target.resetAccelerator(), 150);
        } else {
            // Magia Projétil + Knockback: O inimigo é empurrado seguindo a direção do ataque.
            const knockbackDir = direction.clone().normalizeMut();
            const appliedForce = knockbackDir.multiplyMut(forceMagnitude);
            
            // Freia a inércia atual, mas SEM aplicar Stun, permitindo que a física continue processando!
            target.velocity.resetMut(); 
            
            target.applyForce(appliedForce);
            
            // Drible no Game Loop: O 'takeDamage' limpa a física em 100ms. Nós injetamos a força novamente
            // para garantir que a viagem do knockback não seja cortada no meio!
            setTimeout(() => {
                if (target.attributes && target.attributes.hp > 0) target.applyForce(appliedForce.clone());
            }, 110);
            setTimeout(() => target.resetAccelerator(), 200);
        }
    }

    private solvePull(target: Entity, sourceCoords: {x: number, y: number}, isSelf: boolean, direction: Vector2D): void {
        const forceMagnitude = 20; // 30 pixels/frame = O suficiente para cruzar a tela
        
        const tCx = target.coordinates.x + target.size.width / 2;
        const tCy = target.coordinates.y + target.size.height / 2;

        if (isSelf) {
            // Magia Self + Pull: O Mago é puxado velozmente para frente (Dash).
            const dash = direction.clone().multiplyMut(forceMagnitude);
            target.applyForce(dash);
            setTimeout(() => target.resetAccelerator(), 150);
            
            // O "Dash" do jogador deixa um rastro de Pull fixo na direção que ele foi jogado
            const dist = 150; 
            this.eventManager.dispatch('spawnVisual', {
                type: 'pull-force',
                // Ajuste de offset de pivô baseado no seu novo height de 128 (- 64 para ficar no centro)
                coordinates: { x: tCx + (direction.x * dist / 2) - 32, y: tCy + (direction.y * dist / 2) - 64 },
                duration: 0.25,
                size: { width: 64, height: 128 },
                rotation: direction.angle() + Math.PI / 2
            });
        } else {
            // Magia Projétil + Pull: O inimigo é engolido em direção ao CENTRO ATUAL do jogador!
            const pCx = this.player.coordinates.x + this.player.size.width / 2;
            const pCy = this.player.coordinates.y + this.player.size.height / 2;
            
            const pullDir = Vector2D.sub({ x: pCx, y: pCy }, { x: tCx, y: tCy }).normalizeMut();
            const appliedForce = pullDir.multiplyMut(forceMagnitude);
            
            // Anula a resistência base
            target.velocity.resetMut(); 
            
            target.applyForce(appliedForce);
            // Bypassa o timer do takeDamage da Entity prolongando o tempo no ar
            setTimeout(() => {
                if (target.attributes && target.attributes.hp > 0) target.applyForce(appliedForce.clone());
            }, 110);
            setTimeout(() => target.resetAccelerator(), 250);
            
            // VFX do Pull Dinâmico: Liga a entidade do Player até o Inimigo
            const dist = Math.max(32, Math.hypot(tCx - pCx, tCy - pCy)); // Distância de estiramento do sprite
            const midX = (pCx + tCx) / 2;
            const midY = (pCy + tCy) / 2;
            
            this.eventManager.dispatch('spawnVisual', {
                type: 'pull-force',
                coordinates: { x: midX - 32, y: midY - (dist / 2) },
                duration: 0.3, // Um flash rápido simulando o golpe
                size: { width: 64, height: dist }, // Estica a Height nativa da onda mágica!
                rotation: Math.atan2(tCy - pCy, tCx - pCx) + Math.PI / 2 // Rotação para apontar o topo pro alvo!
            });
        }
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (skillId === 'm_t4_teleport') {
            const now = Date.now();
            if (now - this.lastTeleportTime < this.teleportCooldown) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Translocação em recarga!`, params: [] });
                return;
            }
            this.lastTeleportTime = now;
            
            const px = this.player.coordinates.x + this.player.size.width / 2;
            const py = this.player.coordinates.y + this.player.size.height / 2;
            
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py);
            let dist = dir.magnitude();
            const maxDist = 200; // Blink distance limit
            
            if (dist > maxDist) {
                dir.normalizeMut().multiplyMut(maxDist);
            }
            
            // Efeito de saída
            this.eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py });
            
            // Move player
            this.player.coordinates.x += dir.x;
            this.player.coordinates.y += dir.y;
            
            // Efeito de entrada
            this.eventManager.dispatch('particle', { effect: 'magicPulse', x: this.player.coordinates.x + this.player.size.width / 2, y: this.player.coordinates.y + this.player.size.height / 2 });
            
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Translocação (Blink) executada!`, params: [] });
        } else {
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Tentando usar a skill ${skillId} via Loadout (Axiomante geralmente usa digitação!)`, params: [] });
        }
    }

    //? ----------- Skills -----------
    public getSkillForLevel(level: number): Skill | null { return this.skillsByLevel.get(level) || null; }
    public get allSkills(): Skill[] { return Array.from(this.skillsByLevel.values()); }

}