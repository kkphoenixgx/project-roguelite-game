/**
 * @file VisualConfigSync.ts
 * Gerencia a persistência e sincronização de definições de sprites no arquivo VisualConfigMap.ts
 * entre os delimitadores <!-- ASSETS_ADAPTER_SPRITES_START --> e <!-- ASSETS_ADAPTER_SPRITES_END -->.
 */

import type { AssetDefinition } from "../Models/AssetDefinition";

export class VisualConfigSync {
    public static readonly SPRITES_START_DELIMITER = '// <!-- ASSETS_ADAPTER_SPRITES_START -->';
    public static readonly SPRITES_END_DELIMITER = '// <!-- ASSETS_ADAPTER_SPRITES_END -->';
    public static readonly IMPORTS_START_DELIMITER = '// <!-- ASSETS_ADAPTER_IMPORTS_START -->';
    public static readonly IMPORTS_END_DELIMITER = '// <!-- ASSETS_ADAPTER_IMPORTS_END -->';
    public static readonly CONSTS_START_DELIMITER = '// <!-- ASSETS_ADAPTER_CONSTS_START -->';
    public static readonly CONSTS_END_DELIMITER = '// <!-- ASSETS_ADAPTER_CONSTS_END -->';

    /**
     * Gera o código TypeScript de cada sprite customizado em estrita conformidade com o contrato
     * AnyVisualConfig / BaseVisualConfig / SpriteConfig do VisualConfigMap.
     */
    public generateSpritesCode(sprites: AssetDefinition[]): string {
        if (!sprites || sprites.length === 0) {
            return '    // (Nenhum sprite dinâmico cadastrado no momento)';
        }

        const lines: string[] = [];

        sprites.forEach(sprite => {
            const frameCount = sprite.frameCount || 1;
            const animationSpeed = sprite.animationSpeed || 10;
            const frameWidth = sprite.frameWidth || sprite.width;
            const frameHeight = sprite.frameHeight || sprite.height;
            const atlasOffsetX = sprite.atlasOffset?.x || 0;
            const atlasOffsetY = sprite.atlasOffset?.y || 0;
            const anchor = sprite.anchor || 'bottom-center';

            lines.push(`    '${sprite.id}': {`);
            lines.push(`        category: 'entity',`);
            lines.push(`        animations: {`);
            lines.push(`            'static': { imageSrc: '${sprite.imageSrc}', frameCount: ${frameCount}, animationSpeed: ${animationSpeed}, frameWidth: ${frameWidth}, frameHeight: ${frameHeight}, atlasOffset: { x: ${atlasOffsetX}, y: ${atlasOffsetY} }, spriteSize: { width: ${sprite.width}, height: ${sprite.height} }, anchor: '${anchor}' },`);
            lines.push(`            'idle': { imageSrc: '${sprite.imageSrc}', frameCount: ${frameCount}, animationSpeed: ${animationSpeed}, frameWidth: ${frameWidth}, frameHeight: ${frameHeight}, atlasOffset: { x: ${atlasOffsetX}, y: ${atlasOffsetY} }, spriteSize: { width: ${sprite.width}, height: ${sprite.height} }, anchor: '${anchor}' }`);
            lines.push(`        }`);
            lines.push(`    },`);
        });

        return lines.join('\n');
    }

    /**
     * Sincroniza a lista de sprites customizados no VisualConfigMap.ts em disco via API do Vite.
     */
    public async syncToDisk(sprites: AssetDefinition[]): Promise<boolean> {
        try {
            const spritesCode = this.generateSpritesCode(sprites);
            const res = await fetch('/api/assets-adapter?target=visualConfig', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spritesCode })
            });

            if (res.ok) {
                const data = await res.json();
                return data.success === true;
            }
            return false;
        } catch {
            return false;
        }
    }
}
