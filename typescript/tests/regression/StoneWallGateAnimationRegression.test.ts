import { describe, it, expect } from 'vitest';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';
import hitboxesData from '../../domain/ObjectModule/Scenery/asset_hitboxes.json';

/**
 * @file StoneWallGateAnimationRegression.test.ts
 * Testes de regressão para blindar a paridade de dimensões, registros e hitboxes
 * da animação do portão da muralha de pedra (stone_wall_gate).
 */

describe('StoneWallGateAnimation Regression Tests', () => {
    it('deve registrar stone_wall_gate no VisualConfigMap com animações static, idle e open', () => {
        const config = (VisualConfigMap as Record<string, any>)['stone_wall_gate'];
        expect(config).toBeDefined();
        expect(config.animations).toBeDefined();

        // Animação static (fechado limpo)
        expect(config.animations['static']).toBeDefined();
        expect(config.animations['static'].frameCount).toBe(1);
        expect(config.animations['static'].frameWidth).toBe(396);
        expect(config.animations['static'].frameHeight).toBe(250);

        // Animação idle (spritesheet animada)
        expect(config.animations['idle']).toBeDefined();
        expect(config.animations['idle'].frameCount).toBe(4);
        expect(config.animations['idle'].frameWidth).toBe(396);
        expect(config.animations['idle'].frameHeight).toBe(250);
        expect(config.animations['idle'].imageSrc).toContain('stone_wall_gate_anim.png');

        // Animação open (spritesheet de abertura)
        expect(config.animations['open']).toBeDefined();
        expect(config.animations['open'].frameCount).toBe(4);
        expect(config.animations['open'].frameWidth).toBe(396);
        expect(config.animations['open'].frameHeight).toBe(250);
        expect(config.animations['open'].imageSrc).toContain('stone_wall_gate_anim.png');
    });

    it('deve blindar as dimensões no KNOWN_ASSET_DIMENSIONS para clean e anim', () => {
        expect(KNOWN_ASSET_DIMENSIONS['stone_wall_gate_clean']).toEqual({ width: 396, height: 250 });
        expect(KNOWN_ASSET_DIMENSIONS['stone_wall_gate_anim']).toEqual({ width: 396, height: 250 });
    });

    it('deve blindar o asset_hitboxes.json de stone_wall_gate para preservar a passagem central', () => {
        const gateHitbox = (hitboxesData as Record<string, any>)['stone_wall_gate'];
        expect(gateHitbox).toBeDefined();
        expect(gateHitbox.baseWidth).toBe(396);
        expect(gateHitbox.baseHeight).toBe(250);

        // Deve possuir dois flancos sólidos (esquerdo e direito), deixando o vão central livre
        expect(gateHitbox.shapes.length).toBe(2);

        // Flanco esquerdo: x até 130
        const leftFlank = gateHitbox.shapes[0];
        const leftXs = leftFlank.points.map((p: any) => p.x);
        expect(Math.max(...leftXs)).toBe(130);

        // Flanco direito: x a partir de 266
        const rightFlank = gateHitbox.shapes[1];
        const rightXs = rightFlank.points.map((p: any) => p.x);
        expect(Math.min(...rightXs)).toBe(266);

        // Vão livre central entre 130px e 266px (136px de largura)
        const passageWidth = Math.min(...rightXs) - Math.max(...leftXs);
        expect(passageWidth).toBe(136);
    });
});
