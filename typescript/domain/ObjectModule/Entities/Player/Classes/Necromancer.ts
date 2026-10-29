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
import ChanneledBeamAttackTemplate, { ActiveChanneledBeam } from "../../../../templates/attacks/ChanneledBeamAttackTemplate";
import StunStatus from "../../Status/StunStatus";
import SlowStatus from "../../Status/SlowStatus";
import VulnerableStatus from "../../Status/VulnerableStatus";
import PoisonStatus from "../../Status/PoisonStatus";
import FearStatus from "../../Status/FearStatus";
import DecayStatus from "../../Status/DecayStatus";
import AttributeBoostEffect from "../../../Items/Effects/AttributeBoostEffect";
import { NecromancerSkillsBuilder } from "./NecromancerSkillsBuilder";

/**
 * ==============================================================================
 * CLASSE NECROMANTE (Necromancer) - ÁRVORE COMPLETA DE 12 HABILIDADES
 * ==============================================================================
 * O soberano das artes proibidas, ceifador de almas e manipulador do decaimento.
 * Utiliza o catálogo de templates geométricos de combate com Zero-GC no hot path:
 * 
 * ESTRUTURA DE HABILIDADES (12 Skills canônicas de Lvl 1 a Lvl 12):
 * ------------------------------------------------------------------------------
 * TIER 1 (Pacto com o Abismo & Maldições Básicas):
 *   - Lvl 1: [n_t1_reap]            Colheita Sombria (Active Arc: Corte de Foice em arco com dreno de alma)
 *   - Lvl 2: [n_t1_death_aura]      Presença Fúnebre (Attribute: +5 Inteligência)
 *   - Lvl 3: [n_t1_soul_leech]      Dreno Vital (Passive: +5 Sabedoria e cura espiritual)
 * 
 * TIER 2 (Fantasmas, Necrose & Rituais de Sangue):
 *   - Lvl 4: [n_t2_lifesteal]       Sede de Sangue (Passive: Vampirismo e +6 Inteligência)
 *   - Lvl 5: [n_t2_bone_spear]      Lança de Ossos (Active Beam: Feixe perfurante canalizado de fragmentos ósseos)
 *   - Lvl 6: [n_t3_soul]            Ascensão do Lich (Attribute: +6 Sabedoria para dominação arcana)
 * 
 * TIER 3 (Hecatombe, Medo & Cadáveres):
 *   - Lvl 7: [n_t3_grasp_of_dead]   Garras do Além (Active Arc: Foice espectral que puxa e causa Decaimento/Decay)
 *   - Lvl 8: [n_t4_corpse_explosion] Explosão Sombria (Active Nova: Detonação cadavérica devastadora no alvo)
 *   - Lvl 9: [n_t3_spectral_veil]   Manto Espectral (Passive: +8 Sabedoria e resistência etérea)
 * 
 * TIER 4 (Lorde Sepulcral & Apocalipse Noturno):
 *   - Lvl 10: [n_t5_wail_of_banshee] Clamor da Banshee (Active Nova: Onda de terror puro que inflige Fear & Slow)
 *   - Lvl 11: [n_t4_death_warden]   Mestre da Morte (Attribute: +10 Inteligência permanente)
 *   - Lvl 12: [n_t5_dance_of_dead]  Dança das Almas Penadas (Active Orbital: Almas vorazes orbitando o Necromante)
 * ==============================================================================
 */
export default class Necromancer extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();

    // Timers de Cooldown (ms)
    private lastReapTime: number = 0;
    private readonly reapCooldown: number = 2000;

    private lastBoneSpearTime: number = 0;
    private readonly boneSpearCooldown: number = 4000;

    private lastGraspTime: number = 0;
    private readonly graspCooldown: number = 5000;

    private lastExplosionTime: number = 0;
    private readonly explosionCooldown: number = 6000;

    private lastBansheeTime: number = 0;
    private readonly bansheeCooldown: number = 7000;

    private lastSoulDanceTime: number = 0;
    private readonly soulDanceCooldown: number = 10000;

    // Instâncias ativas controladas via loop de eventos/atualização (Zero-GC)
    private activeArcs: ActiveSweepingArc[] = [];
    private activeBeams: ActiveChanneledBeam[] = [];
    private activeNovas: ActiveNovaBurst[] = [];
    private activeOrbitals: ActiveOrbitalAttack[] = [];

    // Modelos de ataque reutilizáveis (Templates imutáveis)
    private readonly reapTemplate: SweepingArcAttackTemplate;
    private readonly boneSpearTemplate: ChanneledBeamAttackTemplate;
    private readonly graspTemplate: SweepingArcAttackTemplate;
    private readonly explosionTemplate: NovaBurstAttackTemplate;
    private readonly bansheeTemplate: NovaBurstAttackTemplate;
    private readonly soulDanceTemplate: OrbitalAttackTemplate;

    constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
        super('Necromante', xpTable, player, eventManager);

        // 1. ÁRVORE DE 12 HABILIDADES CANÔNICAS (Lvl 1 ao 12) via Builder
        this.skillsByLevel = NecromancerSkillsBuilder.build();

        // ========================================================================
        // 2. CONFIGURAÇÃO DOS TEMPLATES GEOMÉTRICOS DE COMBATE
        // ========================================================================

        // 2.1. Colheita Sombria (Reap) - Corte em arco rápido com roubo de vida
        this.reapTemplate = SweepingArcAttackTemplate.create(
            'necro_reap',
            'Colheita Sombria',
            (owner) => {
                const wis = owner.attributes?.wisdom || 10;
                const int = owner.attributes?.intelligence || 10;
                const damage = 25 + Math.floor(int * 1.5 + wis * 1.2);
                return new Attack(owner as any, damage, 'magical', []);
            }
        )
        .withArcAngleDegrees(110)
        .withRadius(75)
        .withDuration(0.18)
        .withDexterityScaling(0.04)
        .withParticle('darkPulse')
        .onHit((ctx) => {
            // Cura uma pequena porção ao ceifar almas
            if (typeof this.player.heal === 'function') {
                this.player.heal(4);
            }
        });

        // 2.2. Lança de Ossos (Bone Spear) - Feixe linear perfurante canalizado
        this.boneSpearTemplate = ChanneledBeamAttackTemplate.create(
            'necro_bone_spear',
            'Lança de Ossos',
            (owner) => {
                const int = owner.attributes?.intelligence || 10;
                const damage = 22 + Math.floor(int * 1.6);
                return new Attack(owner as any, damage, 'physical', []);
            }
        )
        .withLength(220)
        .withWidth(32)
        .withTickInterval(0.1)
        .withMaxChannelDuration(0.5) // Pulso rápido e perfurante de 500ms
        .withTurnRateDegreesPerSec(360)
        .withParticle('darkPulse')
        .onHit((ctx) => {
            if (ctx.target && typeof ctx.target.applyStatus === 'function') {
                ctx.target.applyStatus(new VulnerableStatus(2.0));
            }
        });

        // 2.3. Garras do Além (Grasp of the Dead) - Corte amplo que aplica Decaimento
        this.graspTemplate = SweepingArcAttackTemplate.create(
            'necro_grasp_of_dead',
            'Garras do Além',
            (owner) => {
                const wis = owner.attributes?.wisdom || 10;
                const damage = 35 + Math.floor(wis * 2.0);
                return new Attack(owner as any, damage, 'magical', []);
            }
        )
        .withArcAngleDegrees(140)
        .withRadius(85)
        .withDuration(0.22)
        .withParticle('darkPulse')
        .onHit((ctx) => {
            if (ctx.target && typeof ctx.target.applyStatus === 'function') {
                ctx.target.applyStatus(new DecayStatus(3.0, this.player as any));
            }
        });

        // 2.4. Explosão Sombria (Corpse Explosion) - Detonação em área no alvo
        this.explosionTemplate = NovaBurstAttackTemplate.create(
            'necro_corpse_explosion',
            'Explosão Sombria',
            (owner) => {
                const wis = owner.attributes?.wisdom || 10;
                const int = owner.attributes?.intelligence || 10;
                const damage = 45 + Math.floor(wis * 2.2 + int * 1.5);
                return new Attack(owner as any, damage, 'magical', []);
            }
        )
        .withStartRadius(16)
        .withMaxRadius(64)
        .withExpansionSpeed(180)
        .withRingThickness(24)
        .withParticle('darkPulse', undefined, 2)
        .onHit((ctx) => {
            if (ctx.target && typeof ctx.target.applyStatus === 'function') {
                ctx.target.applyStatus(new PoisonStatus(3.0, this.player as any));
            }
        });

        // 2.5. Clamor da Banshee (Wail of the Banshee) - Onda de choque de terror
        this.bansheeTemplate = NovaBurstAttackTemplate.create(
            'necro_wail_of_banshee',
            'Clamor da Banshee',
            (owner) => {
                const wis = owner.attributes?.wisdom || 10;
                const damage = 30 + Math.floor(wis * 1.8);
                return new Attack(owner as any, damage, 'magical', []);
            }
        )
        .withStartRadius(16)
        .withMaxRadius(150)
        .withExpansionSpeed(400)
        .withRingThickness(32)
        .withParticle('magicPulse', '#8A2BE2')
        .onHit((ctx) => {
            if (ctx.target && typeof ctx.target.applyStatus === 'function') {
                ctx.target.applyStatus(new FearStatus(2.0));
                ctx.target.applyStatus(new SlowStatus(3.0));
            }
        });

        // 2.6. Dança das Almas Penadas (Soul Dance) - Lâmina orbital paramétrica
        this.soulDanceTemplate = OrbitalAttackTemplate.create(
            'necro_soul_dance',
            'Dança das Almas Penadas',
            (owner) => {
                const int = owner.attributes?.intelligence || 10;
                const wis = owner.attributes?.wisdom || 10;
                const damage = 28 + Math.floor(int * 1.8 + wis * 1.4);
                return new Attack(owner as any, damage, 'magical', []);
            }
        )
        .withBaseRadius(45)
        .withAngularSpeed(Math.PI * 4.0) // 2 voltas rápidas por segundo
        .withRotations(3.0) // 3 voltas completas
        .withDexterityScaling(0.1)
        .withStrengthRadiusScaling(0.4)
        .withHitboxRadius(32)
        .withTargetHitCooldown(200)
        .withKnockbackMode('pull') // Almas puxam os inimigos para o centro das trevas!
        .withParticle('darkPulse');
    }

    /**
     * Atualização dos ataques contínuos no frame loop (Zero-GC).
     */
    public update(deltaTime: number): void {
        // Orbitais de almas ativas
        for (let i = this.activeOrbitals.length - 1; i >= 0; i--) {
            const orbital = this.activeOrbitals[i]!;
            orbital.update(deltaTime);
            if (orbital.isFinished) {
                this.activeOrbitals.splice(i, 1);
            }
        }

        // Ondas expansivas e detonações
        for (let i = this.activeNovas.length - 1; i >= 0; i--) {
            const nova = this.activeNovas[i]!;
            nova.update(deltaTime);
            if (nova.isFinished) {
                this.activeNovas.splice(i, 1);
            }
        }

        // Feixes e lanças ósseas
        for (let i = this.activeBeams.length - 1; i >= 0; i--) {
            const beam = this.activeBeams[i]!;
            beam.update(deltaTime);
            if (!beam.isActive) {
                this.activeBeams.splice(i, 1);
            }
        }

        // Cortes de foice em arco
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
            case 'n_t1_reap':
                this.executeReap(skillId, mouseCoordinates);
                break;
            case 'n_t2_bone_spear':
                this.executeBoneSpear(skillId, mouseCoordinates);
                break;
            case 'n_t3_grasp_of_dead':
                this.executeGraspOfTheDead(skillId, mouseCoordinates);
                break;
            case 'n_t4_corpse_explosion':
                this.executeCorpseExplosion(skillId, mouseCoordinates);
                break;
            case 'n_t5_wail_of_banshee':
                this.executeWailOfBanshee(skillId);
                break;
            case 'n_t5_dance_of_dead':
                this.executeDanceOfDeath(skillId);
                break;
        }
    }

    /**
     * Colheita Sombria (Reap)
     */
    private executeReap(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastReapTime, this.reapCooldown)) return;
        this.lastReapTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.reapCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Colheita Sombria ceifou a área!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;
        const facingAngle = Math.atan2(mouseCoordinates.y - py, mouseCoordinates.x - px);

        this.eventManager.dispatch('spawnVisual', {
            type: 'n_t1_reap',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.3,
            size: { width: 128, height: 128 },
            rotation: facingAngle
        });

        const activeArc = this.reapTemplate.sweep(this.player as any, facingAngle, this.eventManager);
        activeArc.update(0.016);
        this.activeArcs.push(activeArc);
    }

    /**
     * Lança de Ossos (Bone Spear)
     */
    private executeBoneSpear(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastBoneSpearTime, this.boneSpearCooldown)) return;
        this.lastBoneSpearTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.boneSpearCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Lança de Ossos disparada!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;
        const targetAngle = Math.atan2(mouseCoordinates.y - py, mouseCoordinates.x - px);

        this.eventManager.dispatch('spawnVisual', {
            type: 'n_t2_bone_spear',
            coordinates: { x: px - 32, y: py - 32 },
            duration: 0.4,
            size: { width: 64, height: 64 },
            rotation: targetAngle
        });

        const activeBeam = this.boneSpearTemplate.channel(this.player as any, targetAngle, this.eventManager);
        activeBeam.update(0.016);
        this.activeBeams.push(activeBeam);
    }

    /**
     * Garras do Além (Grasp of the Dead)
     */
    private executeGraspOfTheDead(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastGraspTime, this.graspCooldown)) return;
        this.lastGraspTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.graspCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Garras do Além rasgaram o plano mortal!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;
        const facingAngle = Math.atan2(mouseCoordinates.y - py, mouseCoordinates.x - px);

        this.eventManager.dispatch('spawnVisual', {
            type: 'n_t3_grasp_of_dead',
            coordinates: { x: px - 80, y: py - 80 },
            duration: 0.35,
            size: { width: 160, height: 160 },
            rotation: facingAngle
        });

        const activeArc = this.graspTemplate.sweep(this.player as any, facingAngle, this.eventManager);
        activeArc.update(0.016);
        this.activeArcs.push(activeArc);
    }

    /**
     * Explosão Sombria (Corpse Explosion)
     */
    private executeCorpseExplosion(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (this.isSkillBlocked(skillId, this.lastExplosionTime, this.explosionCooldown)) return;
        this.lastExplosionTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.explosionCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Explosão Sombria ativada no alvo: ${Math.floor(mouseCoordinates.x)}, ${Math.floor(mouseCoordinates.y)}`, params: [] });

        this.eventManager.dispatch('spawnVisual', {
            type: 'n_t4_corpse_explosion',
            coordinates: { x: mouseCoordinates.x - 64, y: mouseCoordinates.y - 64 },
            duration: 0.45,
            size: { width: 128, height: 128 }
        });

        const activeNova = this.explosionTemplate.triggerAt(mouseCoordinates, this.player as any, this.eventManager);
        activeNova.update(0.016);
        this.activeNovas.push(activeNova);
    }

    /**
     * Clamor da Banshee (Wail of the Banshee)
     */
    private executeWailOfBanshee(skillId: string): void {
        if (this.isSkillBlocked(skillId, this.lastBansheeTime, this.bansheeCooldown)) return;
        this.lastBansheeTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.bansheeCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Clamor da Banshee ecoou, espalhando pavor absoluto!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        this.eventManager.dispatch('particle', { effect: 'darkPulse', x: px, y: py, color: '#4B0082' });
        this.eventManager.dispatch('spawnVisual', {
            type: 'n_t5_wail_of_banshee',
            coordinates: { x: px - 80, y: py - 80 },
            duration: 0.5,
            size: { width: 160, height: 160 }
        });

        const activeNova = this.bansheeTemplate.triggerAt({ x: px, y: py }, this.player as any, this.eventManager);
        activeNova.update(0.016);
        this.activeNovas.push(activeNova);
    }

    /**
     * Dança das Almas Penadas (Soul Dance)
     */
    private executeDanceOfDeath(skillId: string): void {
        if (this.isSkillBlocked(skillId, this.lastSoulDanceTime, this.soulDanceCooldown)) return;
        this.lastSoulDanceTime = Date.now();
        (this.player as any).setSkillCooldown?.(skillId, this.soulDanceCooldown);
        this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Dança das Almas Penadas evocada! O turbilhão espectral gira!`, params: [] });

        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        this.eventManager.dispatch('spawnVisual', {
            type: 'n_t5_dance_of_dead',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 1.5,
            size: { width: 128, height: 128 }
        });

        const activeOrbital = this.soulDanceTemplate.applyTo(this.player as any, this.eventManager);
        activeOrbital.update(0.016);
        this.activeOrbitals.push(activeOrbital);
    }

    /**
     * Validador de cooldown Zero-GC
     */
    private isSkillBlocked(skillId: string, lastTime: number, cooldown: number): boolean {
        if ((this.player as any).isSkillOnCooldown?.(skillId)) {
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Habilidade em recarga!`, params: [] });
            return true;
        }
        const now = Date.now();
        if (now - lastTime < cooldown) {
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Habilidade em recarga!`, params: [] });
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