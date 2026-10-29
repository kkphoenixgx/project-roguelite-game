import type { SpriteConfig, GameObjectConstructorParams } from "../components/renderModule/visuals/GameObjectElement";
import type GameObjectElement from "../components/renderModule/visuals/GameObjectElement";
import { VisualConfigMap, SkillIcons, type ItemVisualConfig } from "./VisualConfigMap";
import { BROOCH_TORSO_SLOTS, BROOCH_ID_ALIASES } from "../components/renderModule/visuals/VisualComposer";

export { BROOCH_TORSO_SLOTS, BROOCH_ID_ALIASES };

/**
 * Sistema Central de Registro de Renderização.
 * Armazena dinamicamente as estratégias de criação e os sprites de cada objeto do jogo.
 */
export class RenderRegistry {
    public static strategies = new Map<string, (params: GameObjectConstructorParams) => GameObjectElement>();
    public static spriteConfigs = new Map<string, SpriteConfig>();
    public static imageCache = new Map<string, HTMLImageElement>();

    static {
        for (const [objectId, config] of Object.entries(VisualConfigMap)) {
            if ('animations' in config && config.animations) {
                for (const [state, spriteConfig] of Object.entries(config.animations)) {
                    RenderRegistry.spriteConfigs.set(`${objectId}-${state}`, spriteConfig);
                }
            }
            if (config.category === 'equipment' || config.category === 'weapon') {
                const itemConfig = config as ItemVisualConfig;
                if (itemConfig.droppedConfig && itemConfig.iconId !== undefined) {
                    //? Mapeia o item dropado pelo seu iconId para compatibilidade com o Domínio
                    RenderRegistry.spriteConfigs.set(`droppedItem-${itemConfig.iconId}`, itemConfig.droppedConfig);
                }
            }
        }

        //? Registra broches como camadas corporais reduzidas (3x3) para sobreposição no personagem
        for (const [key, entry] of Object.entries(SkillIcons)) {
            if (entry.classId !== 'brooch') continue;
            for (let slotIdx = 0; slotIdx < BROOCH_TORSO_SLOTS.length; slotIdx++) {
                const pos = BROOCH_TORSO_SLOTS[slotIdx]!;
                const idleCfg: SpriteConfig = {
                    imageSrc: entry.icon40Url,
                    frameCount: 1,
                    animationSpeed: 20,
                    frameWidth: 40,
                    frameHeight: 40,
                    atlasOffset: { x: 0, y: 0 },
                    spriteSize: { width: 40, height: 40 },
                    renderSize: { width: 3, height: 3 },
                    renderOffset: [{ x: pos.x, y: pos.y }, { x: pos.x, y: pos.y + 1 }],
                };
                const walkingCfg: SpriteConfig = {
                    ...idleCfg,
                    animationSpeed: 10,
                };
                const layerBaseId = `wearable-brooch-${key}-slot-${slotIdx}`;
                RenderRegistry.spriteConfigs.set(`${layerBaseId}-idle`, idleCfg);
                RenderRegistry.spriteConfigs.set(`${layerBaseId}-walking`, walkingCfg);
            }
        }
    }
}

/**
 * Decorator: Registra a classe de renderização (Fábrica) atrelada ao seu objectId.
 */
export function RegisterRenderer(entityId: string) {
    return function (target: any) {
        //? Prioriza método estático de fábrica createWithSprite se fornecido pela classe
        if (target.createWithSprite && !RenderRegistry.strategies.has(entityId)) {
            RenderRegistry.strategies.set(entityId, target.createWithSprite.bind(target));
        } else if (!RenderRegistry.strategies.has(entityId)) {
            RenderRegistry.strategies.set(entityId, (params: GameObjectConstructorParams) => new target(params));
        }
    };
}