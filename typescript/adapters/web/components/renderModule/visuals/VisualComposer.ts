import type { SpriteConfig } from "./GameObjectElement"; 
import { getItemVisualKeyByIconId } from "../../../shared/VisualConfigMap";

/**
 * Posições sequenciais em lista no tronco (32x32) para os broches equipados (por baixo do peitoral).
 * Cada broche (40x40 original) é renderizado como um pequeno detalhe 3x3 dentro da área útil do peito [10..21, 18..25].
 */
export const BROOCH_TORSO_SLOTS: readonly { readonly x: number; readonly y: number }[] = [
    { x: 10, y: 18 },
    { x: 13, y: 18 },
    { x: 16, y: 18 },
    { x: 19, y: 18 },
    { x: 10, y: 22 },
    { x: 13, y: 22 },
    { x: 16, y: 22 },
    { x: 19, y: 22 },
];

export const BROOCH_ID_ALIASES: Readonly<Record<string, string>> = {
    'brooch_heal': 'brooch_active_heal',
    'brooch_meteor': 'brooch_active_meteor',
    'brooch_luck': 'brooch_active_luck',
    'brooch_dash': 'brooch_active_dash',
    'brooch_shield': 'brooch_active_shield',
    'brooch_berserk': 'brooch_active_berserk',
};

export type EquipmentLayerType = 'body' | 'brooch' | 'pants' | 'boots' | 'chestplate' | 'beard' | 'helmet' | 'hand' | 'gloves' | 'amulet' | 'ring';

export interface VisualLayer {
    id: string;
    type: EquipmentLayerType | string;
}

export default class VisualComposer {
    /** Z-Index Base padrão para que os equipamentos se sobreponham de forma previsível. */
    private static defaultZIndex: Record<string, number> = {
        'body': 0,
        'brooch': 5,
        'pants': 10,
        'boots': 20,
        'chestplate': 30,
        'amulet': 32,
        'beard': 35,
        'helmet': 40,
        'gloves': 50,
        'hand': 60
    };

    private static readonly ARMOR_SLOTS = ['chestplate', 'helmet', 'pants', 'boots', 'gloves', 'amulet'] as const;

    public static extractLayers(state: any): VisualLayer[] {
        const layers: VisualLayer[] = [{ id: state.entityTypeId, type: 'body' }];

        // Extrai todos os broches equipados (ativos e passivos) em uma lista sequencial no tronco,
        // posicionados com zIndex 5 (acima do corpo e por debaixo da armadura e do colar).
        let broochSlotIndex = 0;
        const maxBroochSlots = BROOCH_TORSO_SLOTS.length;
        const activeBrooches = state.globalActiveLoadout;
        if (Array.isArray(activeBrooches)) {
            for (let i = 0; i < activeBrooches.length && broochSlotIndex < maxBroochSlots; i++) {
                const rawId = activeBrooches[i];
                if (typeof rawId === 'string' && rawId.length > 0) {
                    const canonicalId = BROOCH_ID_ALIASES[rawId] || rawId;
                    layers.push({ id: `wearable-brooch-${canonicalId}-slot-${broochSlotIndex}`, type: 'brooch' });
                    broochSlotIndex++;
                }
            }
        }

        const passiveBrooches = state.passiveLoadout;
        if (Array.isArray(passiveBrooches)) {
            for (let i = 0; i < passiveBrooches.length && broochSlotIndex < maxBroochSlots; i++) {
                const rawId = passiveBrooches[i];
                if (typeof rawId === 'string' && rawId.length > 0) {
                    const canonicalId = BROOCH_ID_ALIASES[rawId] || rawId;
                    layers.push({ id: `wearable-brooch-${canonicalId}-slot-${broochSlotIndex}`, type: 'brooch' });
                    broochSlotIndex++;
                }
            }
        }

        if (state.equipment) {
            // Extraímos o Amuleto para pintar. 
            // Ao NÃO colocar 'ring1', 'ring2', 'ring3' aqui, garantimos que eles fiquem invisíveis no corpo!
            for (let i = 0; i < this.ARMOR_SLOTS.length; i++) {
                const slot = this.ARMOR_SLOTS[i]!;
                const item = state.equipment[slot];
                if (item && item.iconId !== undefined) {
                    const key = getItemVisualKeyByIconId(Number(item.iconId));
                    if (key) layers.push({ id: key, type: slot });
                }
            }
        }

        if (state.hasBeard) {
            layers.push({ id: 'player-beard', type: 'beard' });
        }

        return layers;
    }

    /**
     * Motor de Regras: Avalia as camadas e resolve as exceções de sobreposição (Z-Index).
     */
    public static compose(layers: VisualLayer[], configs: Map<string, SpriteConfig>, state: string): { config: SpriteConfig, zIndex: number, type: EquipmentLayerType | string }[] {
        const isRollState = state === 'roll' || state === 'dodge';

        const composed = layers.map(layer => {
            let zIndex = this.defaultZIndex[layer.type] || 0;

            // REGRA DE EXCEÇÃO: Se a entidade tem Barba e Peitoral, a barba DEVE esconder parte do peito (ficar por cima).
            if (layer.type === 'beard') {
                const hasChestplate = layers.some(l => l.type === 'chestplate');
                if (hasChestplate) {
                    zIndex = 100; // Força a barba para a estratosfera do Z-Index
                }
            }

            // Broches ficam ocultos durante a cambalhota (roll/dodge)
            if (layer.type === 'brooch' && isRollState) {
                return { config: undefined, zIndex, type: layer.type };
            }

            // Resgata o Sprite correspondente à animação atual (ex: 'iron-chest-walking')
            // Caso o equipamento/acessório não possua sprite específico para o estado (ex: 'roll'/'dodge'),
            // reutiliza automaticamente o sprite estático 'idle' para transformação via Socket Rig.
            const configKey = `${layer.id}-${state}`;
            let config = configs.get(configKey);
            if (!config && layer.type !== 'body' && state !== 'idle') {
                config = configs.get(`${layer.id}-idle`);
            }
            
            return { config, zIndex, type: layer.type };
        });

        // Ignora camadas com sprites faltantes e ordena a pintura pelo Z-Index calculado
        return composed.filter(item => item.config !== undefined).sort((a, b) => a.zIndex - b.zIndex) as { config: SpriteConfig, zIndex: number, type: EquipmentLayerType | string }[];
    }
}