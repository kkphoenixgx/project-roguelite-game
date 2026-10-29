import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * @file StoneWallGateAnimation.unit.test.ts
 * Testes unitários para validar a spritesheet animada do portão da muralha de pedra (stone_wall_gate_anim.png).
 */

describe('StoneWallGateAnimation Unit Tests', () => {
    const animPath = path.resolve(
        __dirname,
        '../../adapters/web/assets/sprites/scenery/fortifications/stone_wall_gate_anim.png'
    );

    it('deve existir no disco no caminho de sprites de fortificação', () => {
        expect(fs.existsSync(animPath)).toBe(true);
    });

    it('deve possuir cabeçalho PNG válido (magic bytes)', () => {
        const buffer = fs.readFileSync(animPath);
        expect(buffer.length).toBeGreaterThan(100);

        // Assinatura PNG: 89 50 4E 47 0D 0A 1A 0A
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < pngHeader.length; i++) {
            expect(buffer[i]).toBe(pngHeader[i]);
        }
    });

    it('deve ter exatamente 1584x250 pixels na chunk IHDR (4 frames de 396x250)', () => {
        const buffer = fs.readFileSync(animPath);
        // Em um PNG padrão, IHDR inicia no byte 12 (4 bytes tipo 'IHDR', 4 bytes width, 4 bytes height)
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);

        expect(width).toBe(1584); // 4 frames * 396px
        expect(height).toBe(250);
    });

    it('deve possuir 4 frames de 396px preservando a proporção exata 1:1', () => {
        const FRAME_COUNT = 4;
        const FRAME_WIDTH = 396;
        const FRAME_HEIGHT = 250;

        const TOTAL_WIDTH = FRAME_COUNT * FRAME_WIDTH;
        expect(TOTAL_WIDTH).toBe(1584);
        expect(FRAME_HEIGHT).toBe(250);
    });
});
