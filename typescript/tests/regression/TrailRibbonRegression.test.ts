// @vitest-environment jsdom
/**
 * @file TrailRibbonRegression.test.ts
 * Testes de regressão da integração do rastro (trail/ribbon) com a cena:
 * - F6 / cycleMouseTrailTest alterna desligado -> stretch -> tile -> desligado e o rastro segue o mouse;
 * - rastro de entidade com `trailId` continua visível depois que a entidade some, até expirar;
 * - o Renderer não descarta o orquestrador no frustum culling;
 * - o GameAdapter desenha os rastros por baixo das entidades.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import SceneManager, { MOUSE_TRAIL_TEST_SEQUENCE } from '../../adapters/web/components/renderModule/scene/SceneManager';
import Renderer from '../../adapters/web/components/renderModule/engine/Renderer';
import { RenderRegistry } from '../../adapters/web/shared/RenderRegistry';
import { TrailVisuals } from '../../adapters/web/shared/VisualConfigMap';

const fakeImage = (w: number, h: number) => ({ naturalWidth: w, naturalHeight: h, width: w, height: h, complete: true }) as unknown as HTMLImageElement;

function mockCtx() {
    return {
        save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(),
        fillRect: vi.fn(), globalAlpha: 1, imageSmoothingEnabled: true, fillStyle: ''
    } as any;
}

describe('TrailRibbonRegression (Regression Test)', () => {
    const cachedBefore = new Map(RenderRegistry.imageCache);

    beforeEach(() => {
        for (const cfg of Object.values(TrailVisuals)) RenderRegistry.imageCache.set(cfg.imageSrc, fakeImage(64, 16));
    });

    afterEach(() => {
        RenderRegistry.imageCache.clear();
        for (const [k, v] of cachedBefore) RenderRegistry.imageCache.set(k, v);
    });

    it('os presets de teste existem no catálogo: stretch, tile, animado por quadros e rolagem', () => {
        expect(MOUSE_TRAIL_TEST_SEQUENCE).toEqual(['trail_test_stretch', 'trail_test_tile', 'trail_test_animated', 'trail_test_scroll']);
        expect(TrailVisuals['trail_test_stretch']!.mode).toBe('stretch');
        expect(TrailVisuals['trail_test_tile']!.mode).toBe('tile');
        expect(TrailVisuals['trail_test_animated']).toMatchObject({ frameCount: 4, frameHeight: 32 });
        expect(TrailVisuals['trail_test_animated']!.imageSrc).toContain('animated-test-trail-128hpxx.png');
        expect(TrailVisuals['trail_test_scroll']!.textureAnchor).toBe('path');
        expect(TrailVisuals['trail_test_scroll']!.imageSrc).toContain('medium-test-trail-32hpx.png');
    });

    it('F6 percorre todos os presets de teste e depois desliga', () => {
        const scene = new SceneManager({} as any, false);
        const seen = [scene.cycleMouseTrailTest(), scene.cycleMouseTrailTest(), scene.cycleMouseTrailTest(), scene.cycleMouseTrailTest(), scene.cycleMouseTrailTest()];
        expect(seen).toEqual([...MOUSE_TRAIL_TEST_SEQUENCE, null]);
    });

    it('[Bug F6 #4] corrente mágica com textura presa ao caminho: o desenho não desliza quando o mouse avança nem quando para', () => {
        RenderRegistry.imageCache.set(TrailVisuals['trail_test_scroll']!.imageSrc, fakeImage(128, 32));
        const scene = new SceneManager({} as any, false);
        scene.mouseTrailTestId = 'trail_test_scroll';
        scene.updateAnimations(0.016, { x: 0, y: 0 });
        scene.updateAnimations(0.016, { x: 40, y: 0 });

        //? Coluna da textura desenhada no início do rastro (x = 0), antes e depois de o mouse avançar e parar
        const tailColumn = () => {
            const ctx = mockCtx();
            scene.trailOrchestrator.draw(ctx);
            const idx = ctx.translate.mock.calls.findIndex((c: any[]) => Math.abs(c[0]) < 1e-6 && Math.abs(c[1]) < 1e-6);
            return ctx.drawImage.mock.calls[idx][1];
        };
        const before = tailColumn();
        scene.updateAnimations(0.016, { x: 80, y: 0 });
        const afterMoving = tailColumn();
        scene.updateAnimations(0.1, { x: 80, y: 0 });
        const afterStopping = tailColumn();

        expect(afterMoving).toBeCloseTo(before);
        expect(afterStopping).toBeCloseTo(before);
    });

    it('o rastro animado troca de quadro e a rolagem desloca a textura com o tempo', () => {
        RenderRegistry.imageCache.set(TrailVisuals['trail_test_animated']!.imageSrc, fakeImage(32, 128));
        const scrolling = 'test_scrolling_trail';
        (TrailVisuals as any)[scrolling] = { ...TrailVisuals['trail_test_scroll']!, textureAnchor: 'head', scrollSpeed: 80 };
        RenderRegistry.imageCache.set(TrailVisuals['trail_test_scroll']!.imageSrc, fakeImage(128, 32));
        const scene = new SceneManager({} as any, false);
        scene.mouseTrailTestId = 'trail_test_animated';
        scene.updateAnimations(0.016, { x: 0, y: 0 });
        scene.updateAnimations(0.016, { x: 60, y: 0 });

        const ctxA = mockCtx();
        scene.trailOrchestrator.draw(ctxA);
        scene.updateAnimations(0.13, { x: 60, y: 0 });
        const ctxB = mockCtx();
        scene.trailOrchestrator.draw(ctxB);
        const syA = ctxA.drawImage.mock.calls[0][2];
        const syB = ctxB.drawImage.mock.calls[0][2];
        expect(ctxA.drawImage.mock.calls[0][4]).toBe(32);
        expect(syB).not.toBe(syA);
        expect(syB % 32).toBe(0);

        scene.trailOrchestrator.clear();
        scene.mouseTrailTestId = scrolling;
        scene.updateAnimations(0.016, { x: 0, y: 0 });
        scene.updateAnimations(0.016, { x: 60, y: 0 });
        const ctxC = mockCtx();
        scene.trailOrchestrator.draw(ctxC);
        scene.updateAnimations(0.1, { x: 60, y: 0 });
        const ctxD = mockCtx();
        scene.trailOrchestrator.draw(ctxD);
        expect(ctxD.drawImage.mock.calls[0][1]).not.toBeCloseTo(ctxC.drawImage.mock.calls[0][1]);
        delete (TrailVisuals as any)[scrolling];
    });

    it('F6 alterna desligado -> stretch -> tile e o rastro acompanha o mouse; desligar solta o rastro', () => {
        const scene = new SceneManager({} as any, false);

        expect(scene.cycleMouseTrailTest()).toBe('trail_test_stretch');
        scene.updateAnimations(0.016, { x: 0, y: 0 });
        scene.updateAnimations(0.016, { x: 40, y: 0 });
        const ctx = mockCtx();
        scene.trailOrchestrator.draw(ctx);
        expect(ctx.drawImage).toHaveBeenCalled();

        expect(scene.cycleMouseTrailTest()).toBe('trail_test_tile');
        scene.updateAnimations(0.016, { x: 80, y: 0 });
        expect(scene.trailOrchestrator.detachedTrailsCount).toBe(1);

        scene.mouseTrailTestId = null;
        scene.updateAnimations(0.3, { x: 120, y: 0 });
        expect(scene.trailOrchestrator.activeTrailsCount).toBe(0);
    });

    it('o atalho F6 chama window.toggleTrailTest', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../adapters/web/components/WebWindowManager.ts'), 'utf-8');
        expect(source).toMatch(/e\.key === 'F6'[\s\S]{0,80}toggleTrailTest\(\)/);
    });

    it('entidade com trailId deixa rastro que continua visível depois que ela some, até expirar', () => {
        const scene = new SceneManager({} as any, false);
        const projectile = (x: number) => ({
            id: 77, entityTypeId: 'fireball', coordinates: { x, y: 0 }, size: { width: 10, height: 10 },
            state: 'travelling', rotation: 0, trailId: 'trail_test_stretch'
        }) as any;

        scene.syncRenderables([projectile(0)]);
        scene.updateAnimations(0.016);
        scene.syncRenderables([projectile(50)]);
        scene.updateAnimations(0.016);
        expect(scene.trailOrchestrator.getTrail(77)).toBeDefined();

        //? Projétil explodiu: some dos estados do domínio
        scene.syncRenderables([]);
        scene.updateAnimations(0.2);
        expect(scene.trailOrchestrator.activeTrailsCount).toBe(0);
        expect(scene.trailOrchestrator.detachedTrailsCount).toBe(1);
        const ctx = mockCtx();
        scene.trailOrchestrator.draw(ctx);
        expect(ctx.drawImage).toHaveBeenCalled();

        scene.updateAnimations(TrailVisuals['trail_test_stretch']!.lifetime + 0.1);
        expect(scene.trailOrchestrator.detachedTrailsCount).toBe(0);
    });

    it('o Renderer desenha o orquestrador de rastros mesmo sem coordenadas (sem frustum culling)', async () => {
        const scene = new SceneManager({} as any, false);
        scene.trailOrchestrator.draw = vi.fn();
        const camera = { applyTransform: vi.fn(), isInViewport: vi.fn(() => false) } as any;
        const renderer = new Renderer({ ctx: mockCtx() } as any, camera);

        await renderer.drawFrame({ world: {} as any, renderables: [scene.trailOrchestrator] }, undefined);

        expect(scene.trailOrchestrator.draw).toHaveBeenCalled();
    });

    it('o GameAdapter coloca os rastros no início do buffer do Canvas 2D (por baixo das entidades)', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../../adapters/web/components/GameAdapter.ts'), 'utf-8');
        const sortIdx = source.indexOf('this.canvasRenderBuffer.sort(GameAdapter.ySortComparator)');
        const unshiftIdx = source.indexOf('this.canvasRenderBuffer.unshift(this.sceneManager.trailOrchestrator)');
        const particlesIdx = source.indexOf('this.canvasRenderBuffer.push(this.sceneManager.particleOrchestrator)');
        expect(sortIdx).toBeGreaterThan(-1);
        expect(unshiftIdx).toBeGreaterThan(sortIdx);
        expect(particlesIdx).toBeGreaterThan(unshiftIdx);
    });
});
