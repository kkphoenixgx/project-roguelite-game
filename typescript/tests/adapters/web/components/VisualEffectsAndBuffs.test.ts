// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GameObjectElement from '../../../../adapters/web/components/renderModule/visuals/GameObjectElement';
import ParticleOrchestrator from '../../../../adapters/web/components/renderModule/particlesModule/ParticleOrchestrator';
import PlayerStatusGui from '../../../../adapters/web/GUIS/playerStatusHudModule/PlayerStatusGui';
import WeaponHudGui from '../../../../adapters/web/GUIS/weaponHudModule/WeaponHudGui';

describe('Apresentação Visual: Efeitos, Infusões, Buffs e RenderModule', () => {

    describe('GameObjectElement (visualScale, visualTint, auras)', () => {
        let mockCtx: any;

        beforeEach(() => {
            mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                translate: vi.fn(),
                rotate: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                createRadialGradient: vi.fn().mockReturnValue({
                    addColorStop: vi.fn()
                }),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                shadowColor: '',
                shadowBlur: 0,
                globalAlpha: 1,
                globalCompositeOperation: 'source-over',
                imageSmoothingEnabled: true
            };
        });

        it('deve armazenar e atualizar visualTint, visualScale, spellElements e activeStatuses', () => {
            const initial = {
                id: 1,
                entityTypeId: 'player' as any,
                coordinates: { x: 100, y: 200 },
                size: { width: 32, height: 32 },
                rotation: 0,
                visualTint: '#8B0000',
                visualScale: 1.3,
                spellElements: ['air'],
                activeStatuses: [{ id: 'blade_infusion_air', description: 'Infusão de ar', remaining: 5 }]
            };
            const config = {
                imageSrc: 'test.png',
                frameCount: 1,
                animationSpeed: 1,
                frameWidth: 32,
                frameHeight: 32
            };
            const img = document.createElement('img');
            const el = new GameObjectElement(initial, config, img);

            el.draw(mockCtx);

            // Verifica se a imagem foi desenhada com escala mantendo o chão (bottom-center)
            // drawWidth = 32 * 1.3 = 41.6
            // drawHeight = 32 * 1.3 = 41.6
            // drawX = 100 - (41.6 - 32)/2 = 95.2
            // drawY = 200 - (41.6 - 32) = 190.4
            expect(mockCtx.drawImage).toHaveBeenCalledWith(
                img,
                0, 0, 32, 32,
                expect.closeTo(95.2, 1),
                expect.closeTo(190.4, 1),
                expect.closeTo(41.6, 1),
                expect.closeTo(41.6, 1)
            );

            // Verifica se visualTint foi aplicado via source-atop com opacidade de 0.4
            expect(mockCtx.fillRect).toHaveBeenCalledWith(
                expect.closeTo(95.2, 1),
                expect.closeTo(190.4, 1),
                expect.closeTo(41.6, 1),
                expect.closeTo(41.6, 1)
            );
        });

        it('deve desenhar o halo brilhante alargado quando houver infusão de luz (light)', () => {
            const state = {
                id: 1,
                entityTypeId: 'player' as any,
                coordinates: { x: 50, y: 50 },
                size: { width: 32, height: 32 },
                rotation: 0,
                spellElements: ['light'],
                activeStatuses: [{ id: 'blade_infusion_light', description: 'Luz', remaining: 4 }]
            };
            const config = {
                imageSrc: 'test.png',
                frameCount: 1,
                animationSpeed: 1,
                frameWidth: 32,
                frameHeight: 32
            };
            const el = new GameObjectElement(state, config, document.createElement('img'));
            el.draw(mockCtx);

            expect(mockCtx.createRadialGradient).toHaveBeenCalled();
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });
    });

    describe('ParticleOrchestrator (windGust, lightFlash, demonTransformation)', () => {
        let orchestrator: ParticleOrchestrator;

        beforeEach(() => {
            orchestrator = new ParticleOrchestrator(500);
        });

        it('deve disparar windGust com 5 lâminas curvas rápidas', () => {
            const spy = vi.spyOn((orchestrator as any).particles, 'emit');
            orchestrator.windGust(100, 100, 1.57);

            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                x: 100,
                y: 100,
                count: 5,
                angle: 1.57,
                lifeMax: 0.25,
                isCircle: true
            }));
        });

        it('deve disparar lightFlash com fade-out suave em 0.2s', () => {
            const spy = vi.spyOn((orchestrator as any).particles, 'emit');
            orchestrator.lightFlash(50, 50);

            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                x: 50,
                y: 50,
                count: 50,
                lifeMax: 0.2,
                fade: true,
                isCircle: true
            }));
        });

        it('deve sobrepor fogo e pulso negro na transmutação demoníaca', () => {
            const fireSpy = vi.spyOn(orchestrator, 'fireExplosion');
            const darkSpy = vi.spyOn(orchestrator, 'darkPulse');

            orchestrator.demonTransformation(200, 200);

            expect(fireSpy).toHaveBeenCalledWith(200, 200);
            expect(darkSpy).toHaveBeenCalledWith(200, 200);
        });

        it('deve rotear windGust e demonTransformation via executeEffect', () => {
            const windSpy = vi.spyOn(orchestrator, 'windGust');
            const demonSpy = vi.spyOn(orchestrator, 'demonTransformation');

            orchestrator.executeEffect({ effect: 'windGust', x: 10, y: 20, angle: 0.5 });
            expect(windSpy).toHaveBeenCalledWith(10, 20, 0.5);

            orchestrator.executeEffect({ effect: 'demonTransformation', x: 30, y: 40 });
            expect(demonSpy).toHaveBeenCalledWith(30, 40);
        });
    });

    describe('PlayerStatusGui (Buffs com temporizador circular e tooltips)', () => {
        let gui: PlayerStatusGui;

        beforeEach(() => {
            document.body.innerHTML = '';
            gui = new PlayerStatusGui();
        });

        it('deve renderizar ícones circulares com conic-gradient e contagem para os buffs', () => {
            gui.update({
                hp: 100,
                maxHp: 100,
                mana: 50,
                maxMana: 50,
                activeStatuses: [
                    { id: 'abyssal_demon_active', description: 'Forma Demoníaca Abissal', remaining: 15 },
                    { id: 'blade_infusion_air', description: 'Infusão de Ar na Lâmina', remaining: 4.5 },
                    { id: 'blade_infusion_light', description: 'Infusão de Luz na Lâmina', remaining: 2.5 }
                ]
            });

            const demonBuff = document.getElementById('status-abyssal_demon_active');
            expect(demonBuff).not.toBeNull();
            expect(demonBuff?.classList.contains('buff-circular-container')).toBe(true);

            const demonRing = demonBuff?.querySelector('.buff-circular-ring') as HTMLElement;
            expect(demonRing.style.background).toContain('conic-gradient');

            const demonText = demonBuff?.querySelector('.buff-countdown-text');
            expect(demonText?.textContent).toBe('15s');

            const airBuff = document.getElementById('status-blade_infusion_air');
            expect(airBuff).not.toBeNull();
            const airText = airBuff?.querySelector('.buff-countdown-text');
            expect(airText?.textContent).toBe('5s');

            // Verifica tooltips ricos
            expect(demonBuff?.getAttribute('data-tooltip')).toContain('FORMA DEMONÍACA');
            expect(demonBuff?.getAttribute('data-tooltip')).toContain('+100 HP');
        });
    });

    describe('WeaponHudGui (Infusões elementais na arma)', () => {
        let weaponGui: WeaponHudGui;

        beforeEach(() => {
            document.body.innerHTML = '';
            weaponGui = new WeaponHudGui();
        });

        it('deve ativar classes infused-air e infused-light na arma e no círculo', () => {
            const playerState = {
                id: 1,
                entityTypeId: 'player' as any,
                coordinates: { x: 100, y: 100 },
                size: { width: 32, height: 32 },
                rotation: 0,
                equipment: {
                    mainHand: { iconId: 1, name: 'Espada', weaponType: 'sword' }
                },
                spellElements: ['air'],
                activeStatuses: [{ id: 'blade_infusion_air', description: '', remaining: 5 }]
            };

            weaponGui.update(playerState, { x: 200, y: 200 }, { x: 250, y: 200 });

            const icon = document.getElementById('weapon-icon');
            const circle = document.getElementById('weapon-circle');

            expect(icon?.classList.contains('infused-air')).toBe(true);
            expect(circle?.classList.contains('infused-air')).toBe(true);
        });
    });
});
