import type { HitBox } from "../../hitBox/HitBox";
import HitBoxPolygon from "../../hitBox/HitBoxPolygon";
import { HitBoxCircle } from "../../hitBox/HitBoxCircle";
import rawAssetHitboxes from "./asset_hitboxes.json";

export interface HitboxShapeDefinition {
    type: 'polygon' | 'circle';
    points?: { x: number; y: number }[];
    center?: { x: number; y: number };
    radius?: number;
}

export interface AssetHitboxData {
    baseWidth: number;
    baseHeight: number;
    shapes: HitboxShapeDefinition[];
}

export const ASSET_HITBOX_CATALOG: Record<string, AssetHitboxData> = rawAssetHitboxes as Record<string, AssetHitboxData>;

export interface SceneryPreset {
    type: string;
    width: number;
    height: number;
    hitboxBuilder: (coordinates: { x: number; y: number }) => HitBox[];
}

export function getAssetBaseSize(presetType: string): { width: number; height: number } {
    const data = ASSET_HITBOX_CATALOG[presetType];
    if (data) {
        return { width: data.baseWidth, height: data.baseHeight };
    }
    return { width: 64, height: 64 };
}

/**
 * Constrói as hitboxes proporcionais e orientadas para um asset específico.
 * Suporta escala uniforme, assimétrica e espelhamento horizontal/vertical.
 *
 * @param presetType Chave do asset no catálogo (ex: 'house_forge_garret')
 * @param coordinates Posição mundial (top-left) do elemento
 * @param targetSize Dimensões desejadas no mundo (se omitido, usa baseWidth e baseHeight)
 * @param flipX Espelhamento no eixo horizontal
 * @param flipY Espelhamento no eixo vertical
 */
export function buildAssetHitboxes(
    presetType: string,
    coordinates: { x: number; y: number },
    targetSize?: { width: number; height: number },
    flipX: boolean = false,
    flipY: boolean = false
): HitBox[] {
    const data = ASSET_HITBOX_CATALOG[presetType];
    if (!data) {
        const w = targetSize?.width || 64;
        const h = targetSize?.height || 64;
        return [
            new HitBoxPolygon(coordinates, 0, [
                { x: 0, y: 0 }, { x: w, y: 0 },
                { x: w, y: h }, { x: 0, y: h }
            ], { x: 0, y: 0 }, () => {})
        ];
    }

    const baseWidth = data.baseWidth;
    const baseHeight = data.baseHeight;
    const targetWidth = targetSize?.width || baseWidth;
    const targetHeight = targetSize?.height || baseHeight;

    const scaleX = targetWidth / baseWidth;
    const scaleY = targetHeight / baseHeight;

    const hitboxes: HitBox[] = [];

    for (let s = 0; s < data.shapes.length; s++) {
        const shape = data.shapes[s]!;
        if (shape.type === 'polygon' && shape.points) {
            const transformedPoints = shape.points.map(p => {
                let lx = p.x * scaleX;
                let ly = p.y * scaleY;
                if (flipX) lx = targetWidth - lx;
                if (flipY) ly = targetHeight - ly;
                return { x: lx, y: ly };
            });

      //? Espelhar apenas 1 eixo inverte o winding order dos vértices (normais do SAT).
      //? Inverte o array de pontos (.reverse()) para preservar a orientação física do polígono.
            if (flipX !== flipY) {
                transformedPoints.reverse();
            }

            hitboxes.push(new HitBoxPolygon(coordinates, 0, transformedPoints, { x: 0, y: 0 }, () => {}));
        } else if (shape.type === 'circle' && shape.center && typeof shape.radius === 'number') {
      //? Evita deformação assimétrica do polígono de colisão aplicando escala uniforme.
            const radiusScale = Math.min(scaleX, scaleY);
            const scaledRadius = shape.radius * radiusScale;

            let cx = shape.center.x * scaleX;
            let cy = shape.center.y * scaleY;
            if (flipX) cx = targetWidth - cx;
            if (flipY) cy = targetHeight - cy;

            hitboxes.push(new HitBoxCircle(
                { x: coordinates.x + cx, y: coordinates.y + cy },
                0,
                scaledRadius,
                () => {}
            ));
        }
    }

    return hitboxes;
}

export const SCENERY_PRESETS: Record<string, SceneryPreset> = {};

for (const [key, data] of Object.entries(ASSET_HITBOX_CATALOG)) {
    SCENERY_PRESETS[key] = {
        type: key,
        width: data.baseWidth,
        height: data.baseHeight,
        hitboxBuilder: (coords) => buildAssetHitboxes(key, coords)
    };
}
