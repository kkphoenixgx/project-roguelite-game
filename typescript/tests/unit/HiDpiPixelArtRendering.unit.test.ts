// @vitest-environment jsdom
/**
 * @file HiDpiPixelArtRendering.unit.test.ts
 * Testes unitários do suporte a telas com escala do sistema (devicePixelRatio != 1):
 * - Canvas: buffer em pixels físicos, dimensões CSS expostas e `image-rendering: pixelated`.
 * - Camera: escala inteira de pixels físicos por pixel do mundo e câmera encaixada na grade física.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Canvas from '../../adapters/web/components/renderModule/engine/Canvas';
import Camera from '../../adapters/web/components/renderModule/scene/Camera';

function setDevicePixelRatio(ratio: number): void {
    Object.defineProperty(window, 'devicePixelRatio', { value: ratio, configurable: true, writable: true });
}

function makeTarget(x: number, y: number) {
    return { id: 1, coordinates: { x, y }, size: { width: 32, height: 32 }, rotation: 0, draw: vi.fn(), updateState: vi.fn() } as any;
}

const bigWorld = { width: 100000, height: 100000, mapId: 'teste', minX: -50000, minY: -50000, maxX: 50000, maxY: 50000 } as any;

describe('HiDpiPixelArtRendering (Unit)', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ fillStyle: '', fillRect: vi.fn() });
    });

    afterEach(() => {
        container.remove();
        setDevicePixelRatio(1);
        vi.restoreAllMocks();
    });

    describe('Canvas', () => {
        it('com escala de 100% mantém buffer igual ao tamanho CSS', () => {
            setDevicePixelRatio(1);
            const canvas = new Canvas(container, 800, 600);

            expect(canvas.pixelRatio).toBe(1);
            expect(canvas.element.width).toBe(800);
            expect(canvas.element.height).toBe(600);
            expect(canvas.viewportWidth).toBe(800);
            expect(canvas.viewportHeight).toBe(600);
        });

        it('com escala de 125% cria o buffer na resolução física da tela', () => {
            setDevicePixelRatio(1.25);
            const canvas = new Canvas(container, 1536, 864);

            expect(canvas.pixelRatio).toBe(1.25);
            expect(canvas.element.width).toBe(1920);
            expect(canvas.element.height).toBe(1080);
            expect(canvas.viewportWidth).toBe(1536);
            expect(canvas.viewportHeight).toBe(864);
        });

        it('aplica image-rendering: pixelated mantendo o canvas em tela cheia', () => {
            const canvas = new Canvas(container, 800, 600);

            expect(canvas.element.style.imageRendering).toBe('pixelated');
            expect(canvas.element.style.width).toBe('100vw');
            expect(canvas.element.style.height).toBe('100vh');
        });

        it('resize() recalcula o buffer com o devicePixelRatio atual (ex: janela movida para outro monitor)', () => {
            setDevicePixelRatio(1);
            const canvas = new Canvas(container, 800, 600);

            setDevicePixelRatio(1.5);
            canvas.resize(1000, 500);

            expect(canvas.pixelRatio).toBe(1.5);
            expect(canvas.element.width).toBe(1500);
            expect(canvas.element.height).toBe(750);
            expect(canvas.viewportWidth).toBe(1000);
        });

        it('responde ao evento resize da janela usando pixels físicos', () => {
            setDevicePixelRatio(1.25);
            const canvas = new Canvas(container, 800, 600);

            window.innerWidth = 1600;
            window.innerHeight = 900;
            window.dispatchEvent(new Event('resize'));

            expect(canvas.element.width).toBe(2000);
            expect(canvas.element.height).toBe(1125);
            expect(canvas.viewportWidth).toBe(1600);
        });
    });

    describe('Camera', () => {
        it.each([
            [1, 3, 3],
            [1.25, 3, 4],
            [1.5, 3, 5],
            [2, 3, 6],
            [1.25, 1, 1]
        ])('dpr %s com zoom %s usa renderScale inteiro %s', (ratio, zoom, expected) => {
            setDevicePixelRatio(ratio);
            const camera = new Camera(new Canvas(container, 1000, 1000), zoom);

            expect(camera.renderScale).toBe(expected);
            expect(Number.isInteger(camera.renderScale)).toBe(true);
            expect(camera.zoom).toBeCloseTo(expected / ratio, 10);
        });

        it('sem pixelRatio no canvas (mocks/legado) assume escala de 100%', () => {
            const camera = new Camera({ element: { width: 600, height: 600 } } as any, 2);

            expect(camera.renderScale).toBe(2);
            expect(camera.zoom).toBe(2);
        });

        it('o setter de zoom altera o zoom base', () => {
            setDevicePixelRatio(1.25);
            const camera = new Camera(new Canvas(container, 1000, 1000), 3);

            camera.zoom = 2;

            expect(camera.baseZoom).toBe(2);
            expect(camera.renderScale).toBe(3);
        });

        it('applyTransform usa escala inteira e encaixa a translação na grade de pixels físicos', () => {
            setDevicePixelRatio(1.25);
            const camera = new Camera(new Canvas(container, 1536, 864), 3);
            camera.setTarget(makeTarget(100.37, 200.81));
            const ctx = { scale: vi.fn(), translate: vi.fn() } as any;

            camera.applyTransform(ctx, bigWorld);

            const [sx, sy] = ctx.scale.mock.calls[0];
            const [tx, ty] = ctx.translate.mock.calls[0];
            expect(sx).toBe(4);
            expect(sy).toBe(4);
            expect(Number.isInteger(Math.round(tx * sx * 1e6) / 1e6)).toBe(true);
            expect(Number.isInteger(Math.round(ty * sy * 1e6) / 1e6)).toBe(true);
        });

        it('isInViewport usa a área visível em pixels do mundo calculada com renderScale', () => {
            setDevicePixelRatio(1.25);
            const camera = new Camera(new Canvas(container, 1536, 864), 3);
            camera.setTarget(makeTarget(0, 0));
            camera.applyTransform({ scale: vi.fn(), translate: vi.fn() } as any, bigWorld);

            //? 1920 px físicos / 4 = 480 px de mundo visíveis na horizontal, centrados no alvo (x ≈ 16)
            expect(camera.isInViewport(16 + 230, 0, 1, 1, 0)).toBe(true);
            expect(camera.isInViewport(16 + 250, 0, 1, 1, 0)).toBe(false);
        });
    });
});
