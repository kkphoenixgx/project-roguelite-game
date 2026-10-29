// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';

describe('Assets Editor - Ferramentas de Produtividade & Alinhamento (Regression)', () => {
    let mockMap: SelectedMapConfig;
    let containerEl: HTMLElement;
    let propsEl: HTMLElement;
    let canvas: MapCanvas;
    let panel: PropertiesPanel;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container"></div>
            <div id="properties-panel"></div>
        `;
        containerEl = document.getElementById('canvas-container')!;
        propsEl = document.getElementById('properties-panel')!;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 4096,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 }
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.snapToGrid = false; // testes puristas sem forçar arredondamento de grade
        panel = new PropertiesPanel('properties-panel', canvas);
    });

    it('1. Deve alinhar múltiplos assets à esquerda, direita e à base (chão 2.5D)', () => {
        const a1: PlacedAssetModel = {
            uid: 'asset_1',
            presetId: 'house_1',
            name: 'Casa 1',
            x: 100,
            y: 100,
            width: 100,
            height: 150,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/house1.png'
        };
        const a2: PlacedAssetModel = {
            uid: 'asset_2',
            presetId: 'house_2',
            name: 'Casa 2',
            x: 400,
            y: 200,
            width: 80,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/house2.png'
        };

        canvas.placedAssets = [a1, a2];
        canvas.selectedAssets = [a1, a2];

        // 1.1 Alinhamento à Esquerda (left)
        canvas.alignSelected('left');
        expect(a1.x).toBe(100);
        expect(a2.x).toBe(100);

        // 1.2 Alinhamento à Direita (right)
        // O limite direito máximo é max(100+100, 100+80) = 200
        canvas.alignSelected('right');
        expect(a1.x + a1.width).toBe(200);
        expect(a2.x + a2.width).toBe(200);

        // 1.3 Alinhamento à Base (bottom / plano de chão do 2.5D)
        // O limite inferior maxY original é 100 + 150 = 250 vs 200 + 100 = 300 => maxY = 300
        canvas.alignSelected('bottom');
        expect(a1.y + a1.height).toBe(300);
        expect(a2.y + a2.height).toBe(300);
        expect(a1.y).toBe(150); // 300 - 150
        expect(a2.y).toBe(200); // 300 - 100
    });

    it('2. Deve distribuir uniformemente o espaçamento horizontal e vertical entre 3 ou mais objetos', () => {
        const a1: PlacedAssetModel = {
            uid: 'a1',
            presetId: 'fence_1',
            name: 'Cerca 1',
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/fence.png'
        };
        const a2: PlacedAssetModel = {
            uid: 'a2',
            presetId: 'fence_2',
            name: 'Cerca 2',
            x: 80,
            y: 0,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/fence.png'
        };
        const a3: PlacedAssetModel = {
            uid: 'a3',
            presetId: 'fence_3',
            name: 'Cerca 3',
            x: 250,
            y: 0,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/fence.png'
        };

        canvas.placedAssets = [a1, a2, a3];
        canvas.selectedAssets = [a1, a2, a3];

        // Total Span: (250 + 50) - 0 = 300.
        // Total Widths: 50 * 3 = 150.
        // Espaço Livre: 300 - 150 = 150.
        // 2 intervalos => gap = 150 / 2 = 75.
        canvas.distributeSelected('horizontal');

        expect(a1.x).toBe(0);
        expect(a2.x).toBe(50 + 75); // 125
        expect(a3.x).toBe(250);
    });

    it('3. Deve alternar bloqueio (Lock) e proteger assets bloqueados contra movimentação e exclusão acidental', () => {
        const a1: PlacedAssetModel = {
            uid: 'asset_locked_1',
            presetId: 'monument_1',
            name: 'Monumento',
            x: 500,
            y: 500,
            width: 120,
            height: 120,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/monument.png'
        };
        canvas.placedAssets = [a1];
        canvas.selectedAsset = a1;

        // Alterna para bloqueado
        canvas.toggleLockSelected();
        expect(a1.locked).toBe(true);

        // Tentativa de exclusão com Delete não deve apagá-lo
        canvas.deleteSelected();
        expect(canvas.placedAssets).toContain(a1);
        expect(canvas.placedAssets.length).toBe(1);

        // Tentativa de alinhamento com outro elemento não deve deslocá-lo
        const a2: PlacedAssetModel = {
            uid: 'asset_unlocked_2',
            presetId: 'tree_1',
            name: 'Árvore',
            x: 100,
            y: 100,
            width: 60,
            height: 60,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/tree.png'
        };
        canvas.placedAssets.push(a2);
        canvas.selectedAssets = [a1, a2];

        canvas.alignSelected('left');
        // a1 permanece imóvel em 500 porque está travado; a2 se move
        expect(a1.x).toBe(500);

        // Neste momento a1 está locked e a2 está unlocked (seleção mista).
        // Chamar toggleLockSelected nivelará travando todos:
        canvas.toggleLockSelected();
        expect(a1.locked).toBe(true);
        expect(a2.locked).toBe(true);

        // Chamar novamente com todos já travados desbloqueia todos:
        canvas.toggleLockSelected();
        expect(a1.locked).toBe(false);
        expect(a2.locked).toBe(false);
    });

    it('4. Deve alternar Modo Carimbo (Stamp Tool) e emitir notificações de modo ativo', () => {
        let stampActive = false;
        canvas.onStampModeChanged = (active) => {
            stampActive = active;
        };

        const def = {
            id: 'tree_oak',
            name: 'Carvalho Alto',
            category: 'trees',
            imageSrc: '/tree_oak.png',
            width: 80,
            height: 120,
            frameCount: 1,
            frameWidth: 80,
            frameHeight: 120
        };

        canvas.toggleStampMode(def);
        expect(canvas.isStampMode).toBe(true);
        expect(stampActive).toBe(true);
        expect(canvas.activeStampAsset?.id).toBe('tree_oak');

        // Alterna novamente para desligar
        canvas.toggleStampMode();
        expect(canvas.isStampMode).toBe(false);
        expect(stampActive).toBe(false);
        expect(canvas.activeStampAsset).toBeNull();
    });

    it('5. Deve mover a câmera e centralizar o viewport diretamente sobre o asset com panToAsset', () => {
        canvas['canvas'].width = 1000;
        canvas['canvas'].height = 800;
        canvas.zoom = 1;

        const targetAsset: PlacedAssetModel = {
            uid: 'target_fountain',
            presetId: 'fountain_center',
            name: 'Fonte Central',
            x: 500,
            y: 600,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/fountain.png'
        };

        canvas.placedAssets = [targetAsset];
        canvas.panToAsset(targetAsset);

        // Centro do asset: (550, 650)
        // Canvas center: (500, 400)
        // panX = 500 - 550 = -50
        // panY = 400 - 650 = -250
        expect(canvas.panX).toBe(-50);
        expect(canvas.panY).toBe(-250);
        expect(canvas.selectedAsset?.uid).toBe('target_fountain');
    });

    it('6. Deve renderizar os controles de Alinhamento, Bloqueio e Hierarquia no PropertiesPanel', () => {
        // 6.1 Visão Geral (Overview): Deve renderizar a lista de Hierarquia de Objetos
        const sampleAsset: PlacedAssetModel = {
            uid: 'asset_test_jump',
            presetId: 'house_red',
            name: 'Casa Vermelha',
            x: 200,
            y: 300,
            width: 150,
            height: 180,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/house.png'
        };
        canvas.placedAssets = [sampleAsset];
        canvas.selectedAsset = null;
        canvas.selectedAssets = [];

        panel.render();

        expect(propsEl.querySelector('#input-filter-placed-assets')).not.toBeNull();
        expect(propsEl.querySelector('#placed-assets-jump-list')).not.toBeNull();
        expect(propsEl.innerHTML).toContain('Hierarquia de Objetos');
        expect(propsEl.innerHTML).toContain('Casa Vermelha');

        // 6.2 Seleção Individual: Deve conter botão de Travar/Destravar e Carimbo
        canvas.selectedAsset = sampleAsset;
        panel.render();

        expect(propsEl.querySelector('#btn-toggle-lock-asset')).not.toBeNull();
        expect(propsEl.querySelector('#btn-stamp-asset')).not.toBeNull();

        // 6.3 Seleção Múltipla: Deve conter botões de Alinhamento e Distribuição
        const sampleAsset2: PlacedAssetModel = {
            uid: 'asset_test_jump_2',
            presetId: 'house_blue',
            name: 'Casa Azul',
            x: 400,
            y: 500,
            width: 150,
            height: 180,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/house_blue.png'
        };
        canvas.placedAssets.push(sampleAsset2);
        canvas.selectedAssets = [sampleAsset, sampleAsset2];
        panel.render();

        expect(propsEl.querySelector('#btn-align-left')).not.toBeNull();
        expect(propsEl.querySelector('#btn-align-bottom')).not.toBeNull();
        expect(propsEl.querySelector('#btn-distribute-h')).not.toBeNull();
        expect(propsEl.querySelector('#btn-group-toggle-lock')).not.toBeNull();
    });
});
