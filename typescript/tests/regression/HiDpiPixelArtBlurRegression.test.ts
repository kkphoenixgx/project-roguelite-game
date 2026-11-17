// @vitest-environment jsdom
/**
 * @file HiDpiPixelArtBlurRegression.test.ts
 * Teste de regressão: pixel art borrada no Windows com escala de tela de 125%.
 *
 * Bug original: o buffer do canvas era criado em pixels CSS (window.innerWidth = 1536 numa tela 1920x1080
 * com escala de 125%) e o CSS `100vw/100vh` esticava o frame 1.25x com interpolação bilinear. Cada pixel da
 * arte (zoom 3) virava 3.75 pixels físicos borrados. A correção cria o buffer em pixels físicos, usa escala
 * inteira de pixels físicos por pixel do mundo e mantém a conversão mouse <-> mundo em pixels CSS.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Canvas from '../../adapters/web/components/renderModule/engine/Canvas';
import Camera from '../../adapters/web/components/renderModule/scene/Camera';
import ViewportTransformer from '../../adapters/web/components/ViewportTransformer';

const PLAYER = { coordinates: { x: 512, y: 591 }, size: { width: 32, height: 32 } };
const WORLD = { width: 4096, height: 4096, mapId: 'teste', minX: 0, minY: 0, maxX: 4096, maxY: 4096 } as any;

describe('HiDpiPixelArtBlurRegression (Regression Test)', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ fillStyle: '', fillRect: vi.fn() });
        Object.defineProperty(window, 'devicePixelRatio', { value: 1.25, configurable: true, writable: true });
    });

    afterEach(() => {
        container.remove();
        Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true, writable: true });
        vi.restoreAllMocks();
    });

    function setup() {
        const canvas = new Canvas(container, 1536, 864);
        const camera = new Camera(canvas, 3);
        camera.setTarget({ id: 1, ...PLAYER, rotation: 0, draw: vi.fn(), updateState: vi.fn() } as any);
        const transformer = new ViewportTransformer(
            camera,
            { canvas } as any,
            { getRenderState: () => ({ world: WORLD }) } as any,
            { renderables: new Map([[1, PLAYER]]) } as any
        );
        return { canvas, camera, transformer };
    }

    it('não estica o canvas: o buffer tem a resolução física da tela (1920x1080)', () => {
        const { canvas } = setup();

        expect(canvas.element.width).toBe(1920);
        expect(canvas.element.height).toBe(1080);
        expect(canvas.element.style.imageRendering).toBe('pixelated');
    });

    it('cada pixel da arte ocupa um número inteiro de pixels físicos (4, e não 3.75)', () => {
        const { camera } = setup();
        const ctx = { scale: vi.fn(), translate: vi.fn() } as any;

        camera.applyTransform(ctx, WORLD);

        expect(ctx.scale).toHaveBeenCalledWith(4, 4);
    });

    it('clique no centro da tela (pixels CSS) continua apontando para o centro do jogador', () => {
        const { transformer } = setup();

        const world = transformer.screenToWorld(1536 / 2, 864 / 2);

        expect(world.x).toBeCloseTo(PLAYER.coordinates.x + PLAYER.size.width / 2, 0);
        expect(world.y).toBeCloseTo(PLAYER.coordinates.y + PLAYER.size.height / 2, 0);
    });

    it('worldToScreen e screenToWorld são inversas em pixels CSS', () => {
        const { transformer } = setup();

        const screen = transformer.worldToScreen(600, 650);
        const back = transformer.screenToWorld(screen.x, screen.y);

        expect(back.x).toBeCloseTo(600, 6);
        expect(back.y).toBeCloseTo(650, 6);
        expect(screen.x).toBeGreaterThanOrEqual(0);
        expect(screen.x).toBeLessThanOrEqual(1536);
    });
});
