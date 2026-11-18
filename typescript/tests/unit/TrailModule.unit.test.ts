// @vitest-environment jsdom
/**
 * @file TrailModule.unit.test.ts
 * Testes unitários do módulo de rastros (trail/ribbon): TrailPath, computeTrailSlices, TrailRibbon e TrailOrchestrator.
 */
import { describe, it, expect, vi } from 'vitest';
import TrailPath from '../../adapters/web/components/renderModule/trailsModule/TrailPath';
import { computeTrailSlices, type TrailSlice } from '../../adapters/web/components/renderModule/trailsModule/TrailSlices';
import TrailRibbon from '../../adapters/web/components/renderModule/trailsModule/TrailRibbon';
import TrailOrchestrator, { TRAIL_DETACH_GRACE_SECONDS } from '../../adapters/web/components/renderModule/trailsModule/TrailOrchestrator';
import type { TrailVisualConfig } from '../../adapters/web/shared/VisualConfigMap';

const stretchConfig: TrailVisualConfig = {
    imageSrc: 'stretch.png', mode: 'stretch', width: 16, lifetime: 1, minSegmentLength: 10, maxPoints: 8, taper: 0, fade: false
};
const tileConfig: TrailVisualConfig = { ...stretchConfig, imageSrc: 'tile.png', mode: 'tile' };

const fakeImage = (w: number, h: number) => ({ naturalWidth: w, naturalHeight: h, width: w, height: h }) as unknown as HTMLImageElement;

function pathFrom(points: [number, number][], config = stretchConfig): TrailPath {
    //? Monta um caminho com pontos gravados na ordem cauda -> cabeça
    const path = new TrailPath(config.maxPoints, config.lifetime, 0.001);
    for (const [x, y] of points) path.setHead(x, y);
    return path;
}

function mockCtx() {
    return { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), globalAlpha: 1, imageSmoothingEnabled: true } as any;
}

describe('TrailModule (Unit)', () => {
    describe('TrailPath', () => {
        it('primeiro setHead cria âncora + cabeça no mesmo ponto', () => {
            const path = new TrailPath(8, 1, 10);
            path.setHead(5, 5);
            expect(path.count).toBe(2);
            expect([path.getX(0), path.getY(0), path.getX(1), path.getY(1)]).toEqual([5, 5, 5, 5]);
        });

        it('só grava um ponto novo quando a cabeça se afasta minSegmentLength', () => {
            const path = new TrailPath(8, 1, 10);
            path.setHead(0, 0);
            path.setHead(5, 0);
            expect(path.count).toBe(2);
            expect(path.getX(0)).toBe(5);

            path.setHead(12, 0);
            expect(path.count).toBe(3);
            expect([path.getX(0), path.getX(1), path.getX(2)]).toEqual([12, 12, 0]);
        });

        it('a cabeça presa ao objeto não envelhece; os demais pontos expiram pela cauda', () => {
            const path = new TrailPath(8, 1, 1);
            path.setHead(0, 0);
            path.setHead(5, 0);
            path.update(0.6);
            expect(path.getAge(0)).toBe(0);
            expect(path.getAge(1)).toBeCloseTo(0.6);

            path.update(0.6);
            //? Âncora e ponto intermediário expiraram e só sobraria a cabeça: sem segmento, o caminho fica vazio
            expect(path.count).toBe(0);
        });

        it('anel cheio descarta o ponto mais antigo', () => {
            const path = new TrailPath(3, 10, 1);
            for (let x = 0; x <= 40; x += 10) path.setHead(x, 0);
            expect(path.count).toBe(3);
            expect([path.getX(0), path.getX(1), path.getX(2)]).toEqual([40, 40, 30]);
        });

        it('guarda a distância percorrida por ponto: fixa nos gravados, crescente na cabeça viva', () => {
            const path = new TrailPath(8, 10, 10);
            path.setHead(0, 0);
            path.setHead(6, 0);
            expect(path.getTravelled(0)).toBeCloseTo(6);
            expect(path.getTravelled(1)).toBe(0);

            path.setHead(12, 0);
            path.setHead(15, 0);
            expect([path.getTravelled(2), path.getTravelled(1), path.getTravelled(0)].map(v => +v.toFixed(3))).toEqual([0, 12, 15]);
        });

        it('detach para de acompanhar o objeto e faz todo o rastro envelhecer até sumir', () => {
            const path = new TrailPath(8, 1, 1);
            path.setHead(0, 0);
            path.setHead(5, 0);
            path.detach();
            path.setHead(100, 100);
            expect(path.getX(0)).toBe(5);

            path.update(1.1);
            expect(path.isEmpty).toBe(true);
            expect(path.isDetached).toBe(true);
        });
    });

    describe('computeTrailSlices', () => {
        it('stretch: a cabeça usa a borda direita da imagem e a cauda a esquerda, cobrindo a imagem inteira', () => {
            const path = pathFrom([[0, 0], [30, 0], [40, 0]]);
            const out: TrailSlice[] = [];

            const n = computeTrailSlices(path, stretchConfig, 64, 16, out);

            expect(n).toBe(2);
            //? Fatia 0 = segmento da cabeça (30->40), fatia 1 = segmento da cauda (0->30)
            expect(out[0]!.sx + out[0]!.sw).toBeCloseTo(64);
            expect(out[1]!.sx).toBeCloseTo(0);
            expect(out[0]!.sw + out[1]!.sw).toBeCloseTo(64);
            expect(out[0]!.sw).toBeCloseTo(16);
            expect(out[1]!.x).toBe(0);
            expect(out[0]!.angle).toBeCloseTo(0);
            expect(out[0]!.length).toBeCloseTo(10);
        });

        it('stretch: ângulo da fatia aponta da cauda para a cabeça', () => {
            const path = pathFrom([[0, 0], [0, 20]]);
            const out: TrailSlice[] = [];
            computeTrailSlices(path, stretchConfig, 64, 16, out);
            expect(out[0]!.angle).toBeCloseTo(Math.PI / 2);
        });

        it('tile: repete a imagem em 1:1 e divide o segmento na borda da imagem', () => {
            //? Imagem 16x16 com espessura 16 => período de 16 px; segmento de 40 px vira pedaços de 8 + 16 + 16
            const path = pathFrom([[0, 0], [40, 0]], tileConfig);
            const out: TrailSlice[] = [];

            const n = computeTrailSlices(path, tileConfig, 16, 16, out);

            expect(n).toBe(3);
            expect(out.slice(0, n).map(s => s.length)).toEqual([8, 16, 16]);
            expect(out.slice(0, n).map(s => s.sx)).toEqual([8, 0, 0]);
            //? Último pedaço termina exatamente na cabeça usando a borda direita da imagem
            expect(out[2]!.sx + out[2]!.sw).toBe(16);
            expect(out.slice(0, n).reduce((a, s) => a + s.length, 0)).toBeCloseTo(40);
        });

        it('tile: espessura diferente da altura da imagem escala o período mantendo a proporção', () => {
            const cfg = { ...tileConfig, width: 32 };
            const path = pathFrom([[0, 0], [32, 0]], cfg);
            const out: TrailSlice[] = [];

            const n = computeTrailSlices(path, cfg, 16, 16, out);

            expect(n).toBe(1);
            expect(out[0]!.sw).toBe(16);
            expect(out[0]!.length).toBe(32);
        });

        it('taper afina até a cauda e fade reduz a opacidade com a idade', () => {
            const cfg = { ...stretchConfig, taper: 1, fade: true };
            const path = new TrailPath(8, 1, 0.001);
            path.setHead(0, 0);
            path.setHead(50, 0);
            path.update(0.5);
            path.setHead(100, 0);
            const out: TrailSlice[] = [];

            const n = computeTrailSlices(path, cfg, 64, 16, out);

            expect(n).toBe(2);
            expect(out[0]!.thickness).toBeGreaterThan(out[1]!.thickness);
            expect(out[1]!.thickness).toBeCloseTo(16 * (1 - 0.75));
            expect(out[0]!.alpha).toBeGreaterThan(out[1]!.alpha);
        });

        it('caminho sem comprimento ou imagem inválida não gera fatias', () => {
            const out: TrailSlice[] = [];
            expect(computeTrailSlices(pathFrom([[5, 5]]), stretchConfig, 64, 16, out)).toBe(0);
            expect(computeTrailSlices(pathFrom([[0, 0], [10, 0]]), stretchConfig, 0, 16, out)).toBe(0);
        });

        it('rolagem: desloca a coluna da textura e divide o segmento onde a textura cruza a borda', () => {
            //? stretch de 64 px de imagem sobre 40 px de rastro, rolado 16 texels: um único segmento vira 2 fatias
            const path = pathFrom([[0, 0], [40, 0]]);
            const out: TrailSlice[] = [];

            const n = computeTrailSlices(path, stretchConfig, 64, 16, out, 16);

            expect(n).toBe(2);
            expect(out[0]!.sx).toBeCloseTo(16);
            expect(out[0]!.sw).toBeCloseTo(48);
            expect(out[1]!.sx).toBeCloseTo(0);
            expect(out[1]!.sw).toBeCloseTo(16);
            expect(out[0]!.length + out[1]!.length).toBeCloseTo(40);
        });

        it('rolagem de uma volta inteira da imagem equivale a nenhuma rolagem (tile)', () => {
            const path = pathFrom([[0, 0], [40, 0]], tileConfig);
            const a: TrailSlice[] = [];
            const b: TrailSlice[] = [];
            const na = computeTrailSlices(path, tileConfig, 16, 16, a, 0);
            const nb = computeTrailSlices(path, tileConfig, 16, 16, b, 16);
            expect(nb).toBe(na);
            expect(b.slice(0, nb).map(s => s.sx)).toEqual(a.slice(0, na).map(s => s.sx));
        });

        it("textureAnchor 'path': a coluna da textura no início do rastro não muda quando a cabeça avança", () => {
            const cfg: TrailVisualConfig = { ...tileConfig, textureAnchor: 'path' };
            const path = new TrailPath(16, 10, 0.001);
            path.setHead(0, 0);
            path.setHead(20, 0);
            const before: TrailSlice[] = [];
            const nBefore = computeTrailSlices(path, cfg, 16, 16, before);
            const tailBefore = before.slice(0, nBefore).find(s => s.x === 0)!;

            path.setHead(50, 0);
            const after: TrailSlice[] = [];
            const nAfter = computeTrailSlices(path, cfg, 16, 16, after);
            const tailAfter = after.slice(0, nAfter).find(s => s.x === 0)!;

            expect(tailBefore.sx).toBe(0);
            expect(tailAfter.sx).toBe(tailBefore.sx);
            expect(tailAfter.sw).toBe(tailBefore.sw);
        });

        it("textureAnchor 'head' (padrão): a textura desliza junto com a cabeça", () => {
            const path = new TrailPath(16, 10, 0.001);
            path.setHead(0, 0);
            path.setHead(20, 0);
            const before: TrailSlice[] = [];
            const nb = computeTrailSlices(path, tileConfig, 16, 16, before);
            const sxBefore = before.slice(0, nb).find(s => s.x === 0)!.sx;
            path.setHead(28, 0);
            const after: TrailSlice[] = [];
            const na = computeTrailSlices(path, tileConfig, 16, 16, after);
            expect(after.slice(0, na).find(s => s.x === 0)!.sx).not.toBe(sxBefore);
        });

        it("textureAnchor 'path' é ignorado no modo stretch (a imagem continua cobrindo o rastro inteiro)", () => {
            const path = pathFrom([[0, 0], [40, 0]]);
            const a: TrailSlice[] = [];
            const b: TrailSlice[] = [];
            const na = computeTrailSlices(path, stretchConfig, 64, 16, a);
            const nb = computeTrailSlices(path, { ...stretchConfig, textureAnchor: 'path' }, 64, 16, b);
            expect(b.slice(0, nb)).toEqual(a.slice(0, na));
        });

        it('reaproveita os objetos de fatia entre frames (Zero-GC)', () => {
            const out: TrailSlice[] = [];
            const path = pathFrom([[0, 0], [30, 0]]);
            computeTrailSlices(path, stretchConfig, 64, 16, out);
            const first = out[0];
            computeTrailSlices(path, stretchConfig, 64, 16, out);
            expect(out[0]).toBe(first);
        });
    });

    describe('TrailRibbon', () => {
        it('desenha uma fatia por segmento com o recorte do sprite, sem suavização', () => {
            const img = fakeImage(64, 16);
            const ribbon = new TrailRibbon('t', stretchConfig, img);
            ribbon.setHead(0, 0);
            ribbon.setHead(20, 0);
            const ctx = mockCtx();

            ribbon.draw(ctx);

            expect(ctx.imageSmoothingEnabled).toBe(false);
            expect(ctx.drawImage).toHaveBeenCalledTimes(1);
            const [image, sx, sy, sw, sh, dx, dy, dw, dh] = ctx.drawImage.mock.calls[0];
            expect(image).toBe(img);
            expect([sx, sy, sw, sh]).toEqual([0, 0, 64, 16]);
            expect([dx, dy, dh]).toEqual([0, -8, 16]);
            expect(dw).toBeCloseTo(20.5);
        });

        it('animação por quadros: recorta o quadro atual empilhado na vertical e avança com o tempo', () => {
            const cfg = { ...tileConfig, frameCount: 4, frameHeight: 32, animationSpeed: 8 };
            const ribbon = new TrailRibbon('anim', cfg, fakeImage(32, 128));
            ribbon.setHead(0, 0);
            ribbon.setHead(20, 0);

            expect(ribbon.currentFrame).toBe(0);
            ribbon.update(0.13);
            expect(ribbon.currentFrame).toBe(1);
            ribbon.update(0.4);
            expect(ribbon.currentFrame).toBe(0);

            ribbon.update(0.13);
            const ctx = mockCtx();
            ribbon.draw(ctx);
            const [, , sy, , sh] = ctx.drawImage.mock.calls[0];
            expect(sy).toBe(32);
            expect(sh).toBe(32);
        });

        it('sem frameHeight, divide a altura da imagem pela quantidade de quadros', () => {
            const cfg = { ...tileConfig, frameCount: 4, animationSpeed: 0 };
            const ribbon = new TrailRibbon('anim', cfg, fakeImage(32, 128));
            ribbon.setHead(0, 0);
            ribbon.setHead(20, 0);
            const ctx = mockCtx();
            ribbon.draw(ctx);
            expect(ctx.drawImage.mock.calls[0][4]).toBe(32);
            expect(ctx.drawImage.mock.calls[0][2]).toBe(0);
        });

        it('rolagem: o deslocamento cresce com o tempo conforme scrollSpeed', () => {
            const ribbon = new TrailRibbon('scroll', { ...tileConfig, scrollSpeed: 80 }, fakeImage(64, 16));
            expect(ribbon.scrollTexels).toBe(0);
            ribbon.update(0.5);
            expect(ribbon.scrollTexels).toBeCloseTo(40);
            expect(new TrailRibbon('static', tileConfig, fakeImage(64, 16)).scrollTexels).toBe(0);
        });

        it('não desenha enquanto a imagem não carregou', () => {
            const ribbon = new TrailRibbon('t', stretchConfig, fakeImage(0, 0));
            ribbon.setHead(0, 0);
            ribbon.setHead(20, 0);
            const ctx = mockCtx();
            ribbon.draw(ctx);
            expect(ctx.drawImage).not.toHaveBeenCalled();
        });
    });

    describe('TrailOrchestrator', () => {
        const catalog = { stretch: stretchConfig, tile: tileConfig };
        const make = () => new TrailOrchestrator(catalog, () => fakeImage(64, 16));

        it('cria um rastro por chave e ignora trailId desconhecido', () => {
            const orch = make();
            orch.track(1, 0, 0, 'stretch');
            orch.track(2, 0, 0, 'nao_existe');
            expect(orch.activeTrailsCount).toBe(1);
            expect(orch.getTrail(1)?.trailId).toBe('stretch');
        });

        it('rastro não rastreado por mais que o tempo de tolerância é solto, some e é removido', () => {
            const orch = make();
            orch.track(1, 0, 0, 'stretch');
            orch.track(1, 30, 0, 'stretch');

            orch.update(TRAIL_DETACH_GRACE_SECONDS + 0.01);
            expect(orch.activeTrailsCount).toBe(0);
            expect(orch.detachedTrailsCount).toBe(1);

            orch.update(1.1);
            expect(orch.detachedTrailsCount).toBe(0);
        });

        it('trocar o trailId de um objeto solta o rastro antigo e começa um novo', () => {
            const orch = make();
            orch.track(1, 0, 0, 'stretch');
            orch.track(1, 0, 0, 'tile');
            expect(orch.getTrail(1)?.trailId).toBe('tile');
            expect(orch.detachedTrailsCount).toBe(1);
        });

        it('é camada global (id -999999), desenha soltos e ativos e clear() limpa tudo', () => {
            const orch = make();
            orch.track(1, 0, 0, 'stretch');
            orch.track(1, 30, 0, 'stretch');
            orch.track(2, 0, 0, 'stretch');
            orch.track(2, 0, 30, 'stretch');
            orch.update(0.01);
            const ctx = mockCtx();

            orch.draw(ctx);

            expect(orch.id).toBe(-999999);
            expect(ctx.drawImage).toHaveBeenCalledTimes(2);
            orch.clear();
            expect(orch.activeTrailsCount + orch.detachedTrailsCount).toBe(0);
        });
    });
});
