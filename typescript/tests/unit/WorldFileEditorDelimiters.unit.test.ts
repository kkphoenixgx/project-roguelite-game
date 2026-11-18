// @vitest-environment jsdom
/**
 * @file WorldFileEditorDelimiters.unit.test.ts
 * Testes unitários do contrato de delimitadores entre o Assets Editor (WorldCodeSync) e o arquivo
 * real do domínio VilgemWorld.ts: o parser deve isolar exatamente o bloco entre
 * `// <!-- ASSETS_ADAPTER_SCENERY_START -->` e `// <!-- ASSETS_ADAPTER_SCENERY_END -->`.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WorldCodeSync } from '../../../typescript/adapters/assets-adapter/Components/WorldCodeSync';
import { AssetScanner } from '../../../typescript/adapters/assets-adapter/Components/AssetScanner';

const VILGEM_FILE = path.resolve(__dirname, '../../domain/ObjectModule/Maps/VilgemWorld.ts');
const SCENERY_SPAWN = /this\.eventManager\.dispatch\('spawn',\s*\{\s*type:\s*'scenery'/g;

describe('WorldFileEditorDelimiters (Unit)', () => {
    const content = fs.readFileSync(VILGEM_FILE, 'utf-8');
    const start = content.indexOf(WorldCodeSync.START_DELIMITER);
    const end = content.indexOf(WorldCodeSync.END_DELIMITER);

    it('localiza o bloco de cenário do VilgemWorld.ts pelos delimitadores exatos', () => {
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
    });

    it('parseSceneryFromCode lê do arquivo completo exatamente o que existe no bloco delimitado', () => {
        const block = content.substring(start, end + WorldCodeSync.END_DELIMITER.length);
        const scanner = new AssetScanner();

        const fromFile = new WorldCodeSync().parseSceneryFromCode(content, scanner);
        const fromBlock = new WorldCodeSync().parseSceneryFromCode(block, scanner);

        expect((block.match(SCENERY_SPAWN) || []).length).toBeGreaterThan(0);
        expect(fromFile.length).toBeGreaterThan(0);
        expect(fromFile.length).toBe(fromBlock.length);
    });

    it('parseSceneryFromCode ignora spawns de cenário fora do bloco delimitado', () => {
        const outsideSpawn = "this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 9999, y: 9999 } });";
        const withOutside = content.substring(0, start) + outsideSpawn + '\n' + content.substring(start);

        const parsed = new WorldCodeSync().parseSceneryFromCode(withOutside, new AssetScanner());

        expect(parsed.some(a => a.x === 9999 && a.y === 9999)).toBe(false);
    });
});
