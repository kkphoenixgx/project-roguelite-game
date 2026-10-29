import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type { IPlayer } from "../../../../ports/domain-contracts";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Vector2D from "../../../../shared/Vector2D";
import Attack from "../../../Items/Attack";
import OrbitalAttackTemplate, { ActiveOrbitalAttack } from "../../../../templates/attacks/OrbitalAttackTemplate";
import NovaBurstAttackTemplate, { ActiveNovaBurst } from "../../../../templates/attacks/NovaBurstAttackTemplate";
import SweepingArcAttackTemplate, { ActiveSweepingArc } from "../../../../templates/attacks/SweepingArcAttackTemplate";
import StunStatus from "../../Status/StunStatus";
import SlowStatus from "../../Status/SlowStatus";
import VulnerableStatus from "../../Status/VulnerableStatus";
import AttributeBoostEffect from "../../../Items/Effects/AttributeBoostEffect";
import { WarriorSkillsBuilder } from "./WarriorSkillsBuilder";

/**
 * ==============================================================================
 * CLASSE GUERREIRO (Warrior) - ÁRVORE COMPLETA DE 12 HABILIDADES
 * ==============================================================================
 * O mestre inabalável do combate físico, fúria corporal e domínio de lâminas pesadas.
 * 
 * Estrutura de Habilidades (12 Skills canônicas):
 * ------------------------------------------------------------------------------
 * TIER 1 (Fundamentos & Atributos Iniciais):
 *   - Lvl 1:  [w_t1_strike]         Força Bruta (Attribute: +5 Constituição)
 *   - Lvl 2:  [w_t1_heavy_blow]     Pancada Pesada (Active: Golpe frontal direto com alto knockback)
 *   - Lvl 3:  [w_t1_iron_skin]      Pele de Aço (Passive: +8 Defesa física)
 * 
 * TIER 2 (Domínio Espacial & Controle de Grupo):
 *   - Lvl 4:  [w_t2_cleave]         Turbilhão de Aço (Active Orbital: Giro contínuo com física paramétrica)
 *   - Lvl 5:  [w_t2_shield_bash]    Investida com Escudo (Active: Dash de impacto frontal que atordoa o alvo)
 *   - Lvl 6:  [w_t2_berserk]        Fúria de Batalha (Passive: +6 Força permanente)
 * 
 * TIER 3 (Poder Bruto & Rompimento):
 *   - Lvl 7:  [w_t3_war_cry]        Grito de Guerra (Active Nova: Pulso que intimida e aplica Lentidão/Slow em área)
 *   - Lvl 8:  [w_t4_ground_slam]    Impacto Sísmico (Active Nova: Onda de choque de terra com atordoamento/Stun)
 *   - Lvl 9:  [w_t3_colossus_vigor] Vigor do Colosso (Attribute: +10 Constituição permanente)
 * 
 * TIER 4 (Colosso & Devastação de Hordas):
 *   - Lvl 10: [w_t5_blade_dance]    Dança das Lâminas do Colosso (Active Arc: Corte ultra-amplo de 160°)
 *   - Lvl 11: [w_t4_armor_breaker]  Quebrador de Armaduras (Passive: Esmigalha a defesa inimiga com Vulnerável)
 *   - Lvl 12: [w_t5_avatar_of_war]  Avatar da Guerra (Active: Transformação/Buff de fúria máxima +30% velocidade e cura)
 * ==============================================================================
 */
export default class Warrior extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();

    // Timers de Cooldown (ms)
    private lastHeavyBlowTime: number = 0;
    private readonly heavyBlowCooldown: number = 2500;

    private lastCleaveTime: number = 0;
    private readonly cleaveCooldown: number = 4000;

    private lastShieldBashTime: number = 0;
    private readonly shieldBashCooldown: number = 5000;

    private lastWarCryTime: number = 0;
    private readonly warCryCooldown: number = 6000;

    private lastSlamTime: number = 0;
    private readonly slamCooldown: number = 6000;

    private lastBladeDanceTime: number = 0;
    private readonly bladeDanceCooldown: number = 8000;

    private lastAvatarTime: number = 0;
    private readonly avatarCooldown: number = 15000;

    // Instâncias ativas controladas no frame loop (Zero-GC)
    private activeOrbitals: ActiveOrbitalAttack[] = [];
    private activeNovas: ActiveNovaBurst[] = [];
    private activeArcs: ActiveSweepingArc[] = [];

    // Modelos de ataque reutilizáveis (Templates imutáveis)
    private readonly heavyBlowTemplate: SweepingArcAttackTemplate;
    private readonly whirlwindTemplate: OrbitalAttackTemplate;
    private readonly warCryTemplate: NovaBurstAttackTemplate;
    private readonly groundSlamTemplate: NovaBurstAttackTemplate;
    private readonly bladeDanceTemplate: SweepingArcAttackTemplate;

    // Cache Zero-GC de vetores de direção
    private _scratchDir: Vector2D = new Vector2D(0, 0);

    constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
        super('Guerreiro', xpTable, player, eventManager);

        // 1. ÁRVORE DE 12 HABILIDADES CANÔNICAS (Lvl 1 ao 12) via Builder
        this.skillsByLevel = WarriorSkillsBuilder.build();

        // ========================================================================
        // 2. CONFIGURAÇÃO DOS TEMPLATES GEOMÉTRICOS DE ATAQUE
        // ========================================================================

        // 2.1. Pancada Pesada (Heavy Blow) - Arco frontal coeso sem zona morta
        this.heavyBlowTemplate = SweepingArcAttackTemplate.create(
            'warrior_heavy_blow',
            'Pancada Pesada',
            (owner) => {
                const str = owner.attributes?.strength || 10;
                const damage = 30 + Math.floor(str * 2.2);
                return new Attack(owner as any, damage, 'physical', []);
            }
        )
        .withArcAngleDegrees(90)
        .withRadius(48)
        .withHitboxRadius(32)
        .withDuration(0.18)
        .withDexterityScaling(0.05)
        .withParticle('slashSparks');

        // 2.2. Turbilhão de Aço (Whirlwind) - Lâmina orbital paramétrica cobrindo 360 graus sem ponto cego
        this.whirlwindTemplate = OrbitalAttackTemplate.create(
            'warrior_whirlwind',
            'Turbilhão de Aço',
            (owner) => {
                const str = owner.attributes?.strength || 10;
                const damage = 25 + Math.floor(str * 2);
                return new Attack(owner as any, damage, 'physical', []);
            }
        )
        .withBaseRadius(36)
        .withAngularSpeed(Math.PI * 3.5)
        .withRotations(2.5)
        .withDexterityScaling(0.12)
        .withStrengthRadiusScaling(1.4)
        .withHitboxRadius(48)
        .withTargetHitCooldown(220)
        .withKnockbackMode('tangential')
        .withParticle('slashSparks');

        // 2.3. Grito de Guerra (War Cry) - Onda sonora rápida com Slow
        this.warCryTemplate = NovaBurstAttackTemplate.create(
            'warrior_war_cry',
            'Grito de Guerra',
            (owner) => {
                const str = owner.attributes?.strength || 10;
                const damage = 15 + Math.floor(str * 1.2);
                return new Attack(owner as any, damage, 'physical', []);
            }
        )
        .withStartRadius(16)
        .withMaxRadius(140)
        .withExpansionSpeed(420)
        .withRingThickness(28)
        .withParticle('magicPulse', '#FFD700')
        .onHit((ctx) => {
            if (ctx.target && typeof ctx.target.applyStatus === 'function') {
                ctx.target.applyStatus(new SlowStatus(2.5));
                ctx.target.applyStatus(new VulnerableStatus(3.0));
            }
        });

        // 2.4. Impacto Sísmico (Ground Slam) - Onda de terra que atordoa
        this.groundSlamTemplate = NovaBurstAttackTemplate.create(
            'warrior_ground_slam',
            'Impacto Sísmico',
            (owner) => {
                const str = owner.attributes?.strength || 10;
                const damage = 35 + Math.floor(str * 2.5);
                return new Attack(owner as any, damage, 'physical', []);
            }
        )
        .withStartRadius(20)
        .withMaxRadius(160)
        .withExpansionSpeed(380)
        .withRingThickness(32)
        .withParticle('rockShatter')
        .onHit((ctx) => {
            if (ctx.target && typeof ctx.target.applyStatus === 'function') {
                ctx.target.applyStatus(new StunStatus(1.5));
            }
        });

        // 2.5. Dança das Lâminas (Blade Dance) - Corte frontal devastador em 160°
        this.bladeDanceTemplate = SweepingArcAttackTemplate.create(
            'warrior_blade_dance',
            'Dança das Lâminas do Colosso',
            (owner) => {
                const str = owner.attributes?.strength || 10;
                const damage = 55 + Math.floor(str * 3.2);
                return new Attack(owner as any, damage, 'physical', []);
            }
        )
        .withArcAngleDegrees(160)
        .withRadius(72)
        .withHitboxRadius(40)
        .withDuration(0.24)
        .withDexterityScaling(0.04)
        .withParticle('slashSparks');
    }

    /**
     * Atualização dos ataques ativos contínuos (Zero-GC).
     */
    public update(deltaTime: number): void {
        // Orbitais ativos
        for (let i = this.activeOrbitals.length - 1; i >= 0; i--) {
            const orbital = this.activeOrbitals[i]!;
            orbital.update(deltaTime);
            if (orbital.isFinished) {
                this.activeOrbitals.splice(i, 1);
            }
        }

        // Ondas expansivas ativas
        for (let i = this.activeNovas.length - 1; i >= 0; i--) {
            const nova = this.activeNovas[i]!;
            nova.update(deltaTime);
            if (nova.isFinished) {
                this.activeNovas.splice(i, 1);
            }
        }

        // Cortes em arco ativos
        for (let i = this.activeArcs.length - 1; i >= 0; i--) {
            const arc = this.activeArcs[i]!;
            arc.update(deltaTime);
            if (arc.isFinished) {
                this.activeArcs.splice(i, 1);
            }
        }
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        switch (skillId) {
            case 'w_t1_heavy_blow':
                this.executeHeavyBlow(skillId, mouseCoordinates);
                break;
            case 'w_t2_cleave':
            case 'w_t2_whirlwind':
                this.executeWhirlwind(skillId);
                break;
            case 'w_t2_shield_bash':
                this.executeShieldBash(skillId, mouseCoordinates);
                break;
            case 'w_t3_war_cry':
                this.executeWarCry(skillId);
                break;
            case 'w_t4_ground_slam':
                this.executeGroundSlam(skillId);
                break;
            case 'w_t5_blade_dance':
                this.executeBladeDance(skillId, mouseCoordinates);
                break;
            case 'w_t5_avatar_of_war':
                this.executeAvatarOfWar(skillId);
                break;
        }
    }

    /**
     * Pancada Pesada (Heavy Blow)
     */
    private executeHeavyBlow(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastHeavyBlowTime, this.heavyBlowCooldown)) return;
        this.lastHeavyBlowTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.heavyBlowCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Pancada Pesada desferida!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;
        const facingAngle = Math.atan2(mouseCoordinates.y - py, mouseCoordinates.x - px);
        const dirX = Math.cos(facingAngle);
        const dirY = Math.sin(facingAngle);
        const forwardOffset = 24;

        this.eventManager.dispatch('spawnVisual', {
            type: 'heavy-blow',
            coordinates: { x: px + dirX * forwardOffset - 32, y: py + dirY * forwardOffset - 32 },
            duration: 0.25,
            size: { width: 64, height: 64 },
            rotation: facingAngle
        });

        const activeArc = this.heavyBlowTemplate.sweep(this.player as any, facingAngle, this.eventManager);
        activeArc.update(0.016);
        this.activeArcs.push(activeArc);
    }

    /**
     * Turbilhão de Aço (Whirlwind) com física orbital contínua.
     */
    private executeWhirlwind(skillId: string): void {
        if (this.isSkillBlocked(skillId, this.lastCleaveTime, this.cleaveCooldown)) return;
        this.lastCleaveTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.cleaveCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Turbilhão de Aço ativado!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        this.eventManager.dispatch('spawnVisual', {
            type: 'cleave',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.6,
            size: { width: 128, height: 128 }
        });

        const activeOrbital = this.whirlwindTemplate.applyTo(this.player as any, this.eventManager);
        activeOrbital.update(0.016);
        this.activeOrbitals.push(activeOrbital);
    }

    /**
     * Investida com Escudo (Shield Bash)
     */
    private executeShieldBash(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastShieldBashTime, this.shieldBashCooldown)) return;
        this.lastShieldBashTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.shieldBashCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Investida com Escudo disparada!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        this._scratchDir.x = mouseCoordinates.x - px;
        this._scratchDir.y = mouseCoordinates.y - py;
        if (this._scratchDir.x === 0 && this._scratchDir.y === 0) this._scratchDir.x = 1;
        this._scratchDir.normalizeMut();

        // Arremesso do jogador (Dash de impacto)
        if ('accelerator' in this.player && (this.player as any).accelerator) {
            (this.player as any).accelerator.x += this._scratchDir.x * 12;
            (this.player as any).accelerator.y += this._scratchDir.y * 12;
        }

        const str = this.player.attributes?.strength || 10;
        const damage = 20 + Math.floor(str * 1.8);
        const attack = new Attack(this.player as any, damage, 'physical', []);

        // Dano e Stun na frente da investida
        const targetX = px + this._scratchDir.x * 60;
        const targetY = py + this._scratchDir.y * 60;

        this.eventManager.dispatch('spawnVisual', {
            type: 'shield-bash',
            coordinates: { x: targetX - 32, y: targetY - 32 },
            duration: 0.35,
            size: { width: 64, height: 64 },
            rotation: Math.atan2(this._scratchDir.y, this._scratchDir.x)
        });
        this.eventManager.dispatch('particle', { effect: 'slashSparks', x: targetX, y: targetY });
        this.eventManager.dispatch('requestNeighbors', {
            coordinates: { x: targetX, y: targetY },
            radius: 48,
            callback: (neighbors: any[]) => {
                if (!neighbors) return;
                for (let i = 0; i < neighbors.length; i++) {
                    const n = neighbors[i]!;
                    if (n.id !== this.player.id && 'takeDamage' in n) {
                        attack.execute(n, this._scratchDir);
                        if (typeof n.applyStatus === 'function') {
                            n.applyStatus(new StunStatus(1.2));
                        }
                    }
                }
            }
        });
    }

    /**
     * Grito de Guerra (War Cry)
     */
    private executeWarCry(skillId: string): void {
        if (this.isSkillBlocked(skillId, this.lastWarCryTime, this.warCryCooldown)) return;
        this.lastWarCryTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.warCryCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Grito de Guerra ecoou pelo campo!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        this.eventManager.dispatch('spawnVisual', {
            type: 'war-cry',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.45,
            size: { width: 128, height: 128 }
        });

        const activeNova = this.warCryTemplate.triggerAt({ x: px, y: py }, this.player as any, this.eventManager);
        activeNova.update(0.016);
        this.activeNovas.push(activeNova);
    }

    /**
     * Impacto Sísmico (Ground Slam)
     */
    private executeGroundSlam(skillId: string): void {
        if (this.isSkillBlocked(skillId, this.lastSlamTime, this.slamCooldown)) return;
        this.lastSlamTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.slamCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Impacto Sísmico estrondou o solo!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        this.eventManager.dispatch('particle', { effect: 'rockShatter', x: px, y: py, color: '#8B4513' });
        this.eventManager.dispatch('spawnVisual', {
            type: 'ground-slam',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.5,
            size: { width: 128, height: 128 }
        });

        const activeNova = this.groundSlamTemplate.triggerAt({ x: px, y: py }, this.player as any, this.eventManager);
        activeNova.update(0.016);
        this.activeNovas.push(activeNova);
    }

    /**
     * Dança das Lâminas do Colosso (Blade Dance)
     */
    private executeBladeDance(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastBladeDanceTime, this.bladeDanceCooldown)) return;
        this.lastBladeDanceTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.bladeDanceCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Dança das Lâminas do Colosso desferida!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;
        const facingAngle = Math.atan2(mouseCoordinates.y - py, mouseCoordinates.x - px);

        this.eventManager.dispatch('spawnVisual', {
            type: 'blade-dance',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.45,
            size: { width: 128, height: 128 },
            rotation: facingAngle
        });

        const activeArc = this.bladeDanceTemplate.sweep(this.player as any, facingAngle, this.eventManager);
        activeArc.update(0.016);
        this.activeArcs.push(activeArc);
    }

    /**
     * Avatar da Guerra (Avatar of War) - Buff e cura instantânea
     */
    private executeAvatarOfWar(skillId: string): void {
        if (this.isSkillBlocked(skillId, this.lastAvatarTime, this.avatarCooldown)) return;
        this.lastAvatarTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.avatarCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Avatar da Guerra despertado! A furia corre nas veias!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        // Cura 25% da vida máxima do guerreiro
        const healAmount = Math.max(30, Math.floor(this.player.attributes.maxHp * 0.25));
        if (typeof this.player.heal === 'function') {
            this.player.heal(healAmount);
        }

        this.eventManager.dispatch('particle', { effect: 'bloodSplatter', x: px, y: py });
        this.eventManager.dispatch('particle', { effect: 'criticalStrike', x: px, y: py, color: '#FF0000' });
        this.eventManager.dispatch('spawnVisual', {
            type: 'avatar-of-war',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.7,
            size: { width: 128, height: 128 }
        });
    }

    /**
     * Validador de cooldown Zero-GC
     */
    private isSkillBlocked(skillId: string, lastTime: number, cooldown: number): boolean {
        if ((this.player as any).isSkillOnCooldown?.(skillId)) {
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Habilidade em recarga!`, params: [] });
            return true;
        }
        const now = Date.now();
        if (now - lastTime < cooldown) {
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Habilidade em recarga!`, params: [] });
            return true;
        }
        return false;
    }

    public getSkillForLevel(level: number): Skill | null {
        return this.skillsByLevel.get(level) || null;
    }

    public get allSkills(): Skill[] {
        return Array.from(this.skillsByLevel.values());
    }
}