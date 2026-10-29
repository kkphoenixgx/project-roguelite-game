import { describe, it, expect, beforeEach, vi } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import SkillTreeGateway from '../../domain/facadeComponents/SkillTreeGateway';
import DomainRenderState from '../../domain/facadeComponents/DomainRenderState';
import Warrior from '../../domain/ObjectModule/Entities/Player/Classes/Warrior';
import Pescador from '../../domain/ObjectModule/Entities/Player/Classes/Pescador';
import Necromancer from '../../domain/ObjectModule/Entities/Player/Classes/Necromancer';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import * as fs from 'fs';
import * as path from 'path';

describe('Blackbox QA - Exclusão de Ramos, Habilidades e Catálogos', () => {
    let eventManager: EventHandler;
    let mockLogger: any;
    let mockCollision: any;
    let player: Player;
    let skillTreeGateway: SkillTreeGateway;
    let renderState: DomainRenderState;
    let dummyXpTable: any;

    beforeEach(() => {
        eventManager = new EventHandler();
        mockLogger = { log: vi.fn() };
        mockCollision = {
            checkCollisions: vi.fn(),
            getPossibleCollisions: vi.fn(),
            updateEntityPosition: vi.fn(),
            removeEntity: vi.fn(),
            clear: vi.fn()
        };

        dummyXpTable = {
            getLevelForXp: vi.fn(() => 20),
            getXpForLevel: vi.fn(() => 100),
            getMaxLevel: vi.fn(() => 50)
        };

        player = new Player(1, { x: 100, y: 100 }, new Attributes(10, 10, 10, 10, 10, 10, 10, 10), eventManager);
        (player.attributes as any)._level = 20;
        (player.attributes as any)._availablePoints = 15;
        player.unlockedSkills.clear();

        skillTreeGateway = new SkillTreeGateway(player, mockLogger, eventManager, vi.fn());
        renderState = new DomainRenderState(mockLogger, () => 'Guerreiro');
    });

    const buildState = (cls: string) => {
        const rsb = new DomainRenderState(mockLogger, () => cls);
        const mockWorld = { width: 1000, height: 1000, mapId: 'test', chunks: [] } as any;
        const mockObjManager = { getNearActiveElements: () => [], getAllRenderableStates: () => [] } as any;
        rsb.getRenderState(mockWorld, player, mockObjManager);
        return (rsb as any).cachedPlayerState;
    };

    describe('1. Exclusão Mútua de Ramos na Árvore de Classes (Blackbox)', () => {
        describe('Guerreiro: Colosso vs Titã', () => {
            beforeEach(() => {
                player.unlockClass('Guerreiro');
                player.setActiveClass('Guerreiro');
            });

            it('deve permitir desbloquear o tronco comum sem bloquear ramos', () => {
                // Tronco comum: Força Bruta (w_t1_strike) -> Pancada Pesada (w_t1_heavy_blow)
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
                expect(player.unlockedSkills.has('w_t1_strike')).toBe(true);

                skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });
                expect(player.unlockedSkills.has('w_t1_heavy_blow')).toBe(true);

                // Ambos os ramos devem estar disponíveis para escolha
                const state = buildState('Guerreiro');
                const cleaveNode = state.skillTree.find((s: any) => s.id === 'w_t2_cleave');
                const ironSkinNode = state.skillTree.find((s: any) => s.id === 'w_t1_iron_skin');

                expect(cleaveNode?.canUnlock).toBe(true);
                expect(ironSkinNode?.canUnlock).toBe(true);
            });

            it('ao escolher o Ramo Colosso (w_t2_cleave), deve bloquear permanentemente todas as habilidades do Ramo Titã', () => {
                // 1. Desbloqueia o tronco
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });

                // 2. Escolhe o Colosso
                skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });
                expect(player.unlockedSkills.has('w_t2_cleave')).toBe(true);

                const pointsBefore = player.attributes.availablePoints;

                // 3. Tenta desbloquear habilidades do Ramo Titã (deve ser rejeitado!)
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_iron_skin' });
                skillTreeGateway.manage('unlock', { skillId: 'w_t2_shield_bash' });
                skillTreeGateway.manage('unlock', { skillId: 'w_t3_war_cry' });
                skillTreeGateway.manage('unlock', { skillId: 'w_t4_ground_slam' });

                expect(player.unlockedSkills.has('w_t1_iron_skin')).toBe(false);
                expect(player.unlockedSkills.has('w_t2_shield_bash')).toBe(false);
                expect(player.unlockedSkills.has('w_t3_war_cry')).toBe(false);
                expect(player.unlockedSkills.has('w_t4_ground_slam')).toBe(false);

                // Nenhum ponto deve ter sido gasto
                expect(player.attributes.availablePoints).toBe(pointsBefore);

                // 4. No estado de renderização, todos os nós do Titã devem estar marcados como canUnlock = false
                const state = buildState('Guerreiro');
                const titaSkills = ['w_t1_iron_skin', 'w_t2_shield_bash', 'w_t3_war_cry', 'w_t4_ground_slam'];
                for (const skillId of titaSkills) {
                    const node = state.skillTree.find((s: any) => s.id === skillId);
                    expect(node?.canUnlock, `Nó ${skillId} do Titã deveria estar bloqueado`).toBe(false);
                }

                // E o Colosso deve poder continuar progredindo
                const berserkNode = state.skillTree.find((s: any) => s.id === 'w_t3_berserk');
                expect(berserkNode?.canUnlock).toBe(true);
            });

            it('ao escolher o Ramo Titã (w_t1_iron_skin), deve bloquear permanentemente o Ramo Colosso', () => {
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });

                // Escolhe Titã
                skillTreeGateway.manage('unlock', { skillId: 'w_t1_iron_skin' });
                expect(player.unlockedSkills.has('w_t1_iron_skin')).toBe(true);

                // Tenta destravar Colosso
                skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });
                skillTreeGateway.manage('unlock', { skillId: 'w_t5_blade_dance' });
                expect(player.unlockedSkills.has('w_t2_cleave')).toBe(false);
                expect(player.unlockedSkills.has('w_t5_blade_dance')).toBe(false);

                const state = buildState('Guerreiro');
                const cleaveNode = state.skillTree.find((s: any) => s.id === 'w_t2_cleave');
                expect(cleaveNode?.canUnlock).toBe(false);
            });
        });

        describe('Necromante: Senhor dos Ossos vs Espectro Abissal', () => {
            beforeEach(() => {
                player.unlockClass('Necromante');
                player.setActiveClass('Necromante');
            });

            it('ao escolher Lança de Ossos (n_t2_bone_spear), deve bloquear o ramo Espectro (n_t1_soul_leech)', () => {
                // Tronco
                skillTreeGateway.manage('unlock', { skillId: 'n_t1_reap' });
                skillTreeGateway.manage('unlock', { skillId: 'n_t1_death_aura' });

                // Escolhe Senhor dos Ossos
                skillTreeGateway.manage('unlock', { skillId: 'n_t2_bone_spear' });
                expect(player.unlockedSkills.has('n_t2_bone_spear')).toBe(true);

                // Tenta destravar Espectro Abissal
                skillTreeGateway.manage('unlock', { skillId: 'n_t1_soul_leech' });
                expect(player.unlockedSkills.has('n_t1_soul_leech')).toBe(false);

                const state = buildState('Necromante');
                const leechNode = state.skillTree.find((s: any) => s.id === 'n_t1_soul_leech');
                expect(leechNode?.canUnlock).toBe(false);
            });
        });
    });

    describe('2. Ajustes de Sprites, Projeções e Hitboxes das Habilidades (Blackbox)', () => {
        it('Guerreiro - w_t1_heavy_blow deve disparar spawnVisual 64x64 projetado à frente do jogador com rotação', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));

            player.coordinates.x = 200;
            player.coordinates.y = 200;
            player.size.width = 32;
            player.size.height = 32;

            // Mira para a direita (X: 300, Y: 216)
            warrior.executeSkill('w_t1_heavy_blow', { x: 300, y: 216 });

            expect(visuals.length).toBe(1);
            const v = visuals[0];
            expect(v.type).toBe('heavy-blow');
            expect(v.size).toEqual({ width: 64, height: 64 });
            expect(v.duration).toBe(0.25);
            expect(v.rotation).toBeCloseTo(0, 1);
            // Projeção à frente: px (216) + dirX (1) * 24 - 32 = 208
            expect(v.coordinates.x).toBe(208);
            expect(v.coordinates.y).toBe(184);
        });

        it('Guerreiro - w_t2_cleave deve disparar spawnVisual 128x128 em torno do jogador', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));

            player.coordinates.x = 100;
            player.coordinates.y = 100;

            warrior.executeSkill('w_t2_cleave', { x: 100, y: 100 });

            expect(visuals.length).toBe(1);
            const v = visuals[0];
            expect(v.type).toBe('cleave');
            expect(v.size).toEqual({ width: 128, height: 128 });
            expect(v.duration).toBe(0.6);
        });

        it('Guerreiro - w_t2_shield_bash deve disparar spawnVisual shield-bash 64x64 com rotação e partículas', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            const particles: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));
            eventManager.on('particle', (p) => particles.push(p));

            warrior.executeSkill('w_t2_shield_bash', { x: 200, y: 100 });

            expect(visuals.length).toBe(1);
            expect(visuals[0].type).toBe('shield-bash');
            expect(visuals[0].size).toEqual({ width: 64, height: 64 });
            expect(particles.some(p => p.effect === 'slashSparks')).toBe(true);
        });

        it('Guerreiro - w_t3_war_cry deve disparar spawnVisual war-cry 128x128', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));

            warrior.executeSkill('w_t3_war_cry', { x: 0, y: 0 });

            expect(visuals.length).toBe(1);
            expect(visuals[0].type).toBe('war-cry');
            expect(visuals[0].size).toEqual({ width: 128, height: 128 });
        });

        it('Guerreiro - w_t4_ground_slam deve disparar spawnVisual ground-slam 128x128 e partícula rockShatter', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            const particles: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));
            eventManager.on('particle', (p) => particles.push(p));

            warrior.executeSkill('w_t4_ground_slam', { x: 0, y: 0 });

            expect(visuals.length).toBe(1);
            expect(visuals[0].type).toBe('ground-slam');
            expect(visuals[0].size).toEqual({ width: 128, height: 128 });
            expect(particles.some(p => p.effect === 'rockShatter')).toBe(true);
        });

        it('Guerreiro - w_t5_blade_dance deve disparar spawnVisual blade-dance 128x128', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));

            warrior.executeSkill('w_t5_blade_dance', { x: 150, y: 100 });

            expect(visuals.length).toBe(1);
            expect(visuals[0].type).toBe('blade-dance');
            expect(visuals[0].size).toEqual({ width: 128, height: 128 });
        });

        it('Guerreiro - w_t5_avatar_of_war deve disparar spawnVisual avatar-of-war 128x128 e curar o jogador', () => {
            const warrior = new Warrior(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));

            player.attributes.hp = 20;

            warrior.executeSkill('w_t5_avatar_of_war', { x: 0, y: 0 });

            expect(visuals.length).toBe(1);
            expect(visuals[0].type).toBe('avatar-of-war');
            expect(visuals[0].size).toEqual({ width: 128, height: 128 });
            // Deve curar pelo menos 25% da vida máxima (25 HP)
            expect(player.attributes.hp).toBeGreaterThan(20);
        });

        it('Pescador - pesc_t2_net deve disparar spawnVisual fishing-net 96x96 centralizado na posição mirada', () => {
            const pescador = new Pescador(dummyXpTable, player as any, eventManager);
            const visuals: any[] = [];
            eventManager.on('spawnVisual', (p) => visuals.push(p));

            pescador.executeSkill('pesc_t2_net', { x: 300, y: 250 });

            expect(visuals.length).toBe(1);
            const v = visuals[0];
            expect(v.type).toBe('fishing-net');
            expect(v.size).toEqual({ width: 96, height: 96 });
            // Coordenadas centralizadas: x - 48, y - 48
            expect(v.coordinates.x).toBe(300 - 48);
            expect(v.coordinates.y).toBe(250 - 48);
        });
    });

    describe('3. Catálogo de Apresentação VisualConfigMap (Blackbox)', () => {
        it('deve possuir aliases w_t1_heavy_blow e w_t2_cleave mapeados como VFX válidos', () => {
            const heavyBlow = VisualConfigMap['w_t1_heavy_blow'] as any;
            expect(heavyBlow).toBeDefined();
            expect(heavyBlow?.category).toBe('vfx');
            expect(heavyBlow?.animations?.['active']?.imageSrc).toContain('heavy-blow-spritesheet.png');

            const cleave = VisualConfigMap['w_t2_cleave'] as any;
            expect(cleave).toBeDefined();
            expect(cleave?.category).toBe('vfx');
            expect(cleave?.animations?.['active']?.imageSrc).toContain('cleave-spritesheet.png');
        });

        it('deve conter todos os novos VFXs visuais das habilidades registradas no catálogo', () => {
            const expectedVfx = [
                'shield-bash',
                'war-cry',
                'ground-slam',
                'blade-dance',
                'avatar-of-war',
                'fishing-net'
            ];

            for (const vfxKey of expectedVfx) {
                const config = VisualConfigMap[vfxKey] as any;
                expect(config, `VisualConfigMap deve conter entrada para ${vfxKey}`).toBeDefined();
                expect(config?.category).toBe('vfx');
                expect(config?.animations?.['active']).toBeDefined();
            }
        });
    });

    describe('4. Auditoria de Ausência de Emojis em Arquivos de Código do Domínio', () => {
        it('não deve conter emojis ou glifos decorativos nos arquivos do Domínio de Habilidades e Classes', () => {
            const filesToAudit = [
                'typescript/domain/Skills/SkillBranchManager.ts',
                'typescript/domain/ObjectModule/Entities/Player/Classes/Warrior.ts',
                'typescript/domain/ObjectModule/Entities/Player/Classes/Pescador.ts',
                'typescript/domain/ObjectModule/Entities/Player/Classes/WarriorSkillsBuilder.ts',
                'typescript/domain/ObjectModule/Entities/Player/Classes/NecromancerSkillsBuilder.ts',
                'typescript/domain/facadeComponents/DomainRenderState.ts',
                'typescript/domain/facadeComponents/SkillTreeGateway.ts'
            ];

            // Regex abrangente para caracteres de emoji Unicode
            const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

            for (const relPath of filesToAudit) {
                const fullPath = path.resolve(relPath);
                if (!fs.existsSync(fullPath)) continue;

                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i]!;
                    const match = emojiRegex.exec(line);
                    if (match) {
                        throw new Error(`Emoji detectado no arquivo ${relPath} na linha ${i + 1}: "${match[0]}" em: ${line.trim()}`);
                    }
                }
            }
        });
    });
});
