import type { SpriteConfig } from "../components/renderModule/visuals/GameObjectElement"; 

export type VisualCategory = 'entity' | 'equipment' | 'weapon' | 'projectile' | 'vfx';

export interface BaseVisualConfig {
    category: VisualCategory;
    animations: Record<string, SpriteConfig>; // Mapeia 'estado' -> 'SpriteConfig'
}
export interface EntityVisualConfig extends BaseVisualConfig {
    category: 'entity';
}
export interface ItemVisualConfig extends BaseVisualConfig {
    category: 'equipment' | 'weapon';
    iconId: number; // O ID do ícone que conecta com o Domínio
    uiIconUrl: string; // Imagem mostrada na bolsa e nos slots do Paper Doll
    droppedConfig: SpriteConfig; // Configuração visual para quando o item estiver no chão
}
export interface ProjectileVisualConfig extends BaseVisualConfig {
    category: 'projectile';
}
export interface VFXVisualConfig extends BaseVisualConfig {
    category: 'vfx';
}
export interface MapVisualConfig {
    category: 'map';
    chunkSize: number;
    chunks: string[][]; // Matriz de URLs de imagens para cada pedaço do mapa
    collisionJsonUrl?: string; // URL do arquivo JSON contendo os polígonos exportados do Web Editor
}
export type AnyVisualConfig = EntityVisualConfig | ItemVisualConfig | ProjectileVisualConfig | VFXVisualConfig | MapVisualConfig;

const vilgemChunks: string[][] = Array.from({ length: 8 }, () => 
    Array(8).fill(new URL('../assets/maps/map.jpeg', import.meta.url).href)
);

export const VisualConfigMap: Record<string, AnyVisualConfig> = {
   
    // ================== MAPAS ==================
    'vilgem': {
        category: 'map',
        chunkSize: 1024,
        chunks: vilgemChunks,
        // Aponta para o JSON gerado no Polygon Web Editor!
        collisionJsonUrl: new URL('../assets/maps/collision-layers/vilgem_hitboxes.json', import.meta.url).href
    },

    // ================== ENTIDADES (Corpos) ==================
    'player': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/player/player-idle.png', import.meta.url).href, frameCount: 2, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/player/player-idle.png', import.meta.url).href, frameCount: 2, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'dead': { imageSrc: new URL('../assets/entities/player/player-idle.png', import.meta.url).href, frameCount: 2, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'molor': {
        category: 'entity',
        animations: {
            // Assumimos frameCount 1 por segurança (sprite estático), mas você pode aumentar se o MolorWaiting for um spritesheet!
            'idle': { imageSrc: new URL('../assets/entities/npc/Molor/Molor.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/npc/Molor/MolorWaiting.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        }
    },
    'slime': {
        category: 'entity',
        animations: {
            'waiting': { imageSrc: new URL('../assets/entities/enemies/slime-green-walk.png', import.meta.url).href, frameCount: 8, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/enemies/slime-green-walk.png', import.meta.url).href, frameCount: 8, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'circle': {
        category: 'entity',
        animations: { 'normal': { imageSrc: '', frameCount: 1, animationSpeed: 1, frameWidth: 1, frameHeight: 1 } }
    },
    'shadowMob': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/enemies/shadowMob-waiting.png', import.meta.url).href, frameCount: 9, animationSpeed: 4, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } }, // Reciclando o slime temporariamente
            'walking': { imageSrc: new URL('../assets/entities/enemies/shadowMob-waiting.png', import.meta.url).href, frameCount: 9, animationSpeed: 4, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'dead': { imageSrc: new URL('../assets/entities/enemies/shadowMob-waiting.png', import.meta.url).href, frameCount: 9, animationSpeed: 4, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'fishPet': {
        category: 'entity',
        animations: {
            // Usando o slime como placeholder enquanto você não desenha o peixinho!
            'idle': { imageSrc: new URL('../assets/entities/pet-fish.png', import.meta.url).href, frameCount: 3, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/pet-fish.png', import.meta.url).href, frameCount: 3, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'spawn-leviatã' :{
        category: 'entity',
        animations: {
            'spawn': { 
                imageSrc: new URL('../assets/entities/spawn-leviata.png', import.meta.url).href, 
                frameCount: 19, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'environmentCollider': {
        category: 'entity',
        animations: {
            'static': { 
                // Imagem de 1 pixel 100% transparente para forçar a renderização das hitboxes em modo Debug sem pesar a GPU
                imageSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 
                frameCount: 1, animationSpeed: 1, 
                frameWidth: 1, frameHeight: 1, 
                atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 1, height: 1 } 
            }
        }
    },

    // ================== ITENS E EQUIPAMENTOS ==================
    'iron-helmet': {
        category: 'equipment',
        iconId: 10, // Liga ao iconId: 10 do Domínio
        uiIconUrl: new URL('../assets/itens/capacete-simples.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, 
        frameCount: 1, animationSpeed: 10, frameWidth: 22, frameHeight: 16, 
        atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {
            'idle': { 
                imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, 
                frameCount: 1, 
                animationSpeed: 20, 
                frameWidth: 22, 
                frameHeight: 16, 
                atlasOffset: { x: 0, y: 0 }, 
                spriteSize: { width: 22, height: 16 }, 
                renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] 
            },
            'walking': { imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 22, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 22, height: 16 }, renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] },
            'dead': { imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 22, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 22, height: 16 }, renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] }
        }
    },
    'iron-chestplate': {
        category: 'equipment', iconId: 11,
        uiIconUrl: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 7, y: 17 }, 
        spriteSize: { width: 18, height: 10 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, renderOffset: [{ x: 7, y: 17 }, { x: 7, y: 17 }] },
            'walking': { imageSrc: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, 
            renderOffset: [{ x: 7, y: 17 }, { x: 7, y: 18 }] },
        }
    },
    'iron-pants': {
        category: 'equipment', iconId: 12,
        uiIconUrl: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 3, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 10, height: 3 } },
        animations: {
            'idle': { 
                imageSrc: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 10, frameHeight: 3, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 10, height: 3 }, 
                renderOffset: [{ x: 11, y: 27 }, { x: 11, y: 27 }] 
            },
            'walking': { 
                imageSrc: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 3, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 10, height: 3 }, 
                renderOffset: [{ x: 11, y: 27 }, { x: 11, y: 27 }] 
            },
        }
    },
    'iron-boots': {
        category: 'equipment', iconId: 13,
        uiIconUrl: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 2, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 10, height: 2 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 10, frameHeight: 2, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 10, height: 2 }, renderOffset: [{ x: 11, y: 31 }, { x: 11, y: 31 }] },
            'walking': { imageSrc: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 2, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 22, height: 16 }, renderOffset: [{ x: 11, y: 31 }, { x: 11, y: 31 }] },
        }
    },
    'iron-gloves': {
        category: 'equipment', iconId: 14,
        uiIconUrl: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 18, height: 10 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, 
            renderOffset: [{ x:7 , y: 18 }, { x: 7, y: 19 }] },
            'walking': { 
                imageSrc: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, 
                renderOffset: [{ x:7 , y: 18 }, { x: 7, y: 19 }] 
            },
        }
    },
    'simple-amulet': {
        category: 'equipment', iconId: 15,
        uiIconUrl: new URL('../assets/itens/nackless-simples.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/nackless-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 16, height: 16 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/nackless-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 16, height: 16 }, 
            renderOffset: [{ x: 8, y: 17 }, { x: 8, y: 18 }] },
            'walking': { imageSrc: new URL('../assets/itens/nackless-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 16, height: 16 }, 
            renderOffset: [{ x: 8, y: 17 }, { x: 8, y: 18 }] },
        }
    },
    'simple-ring': {
        category: 'equipment', iconId: 16,
        uiIconUrl: new URL('../assets/itens/simple-ring.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/simple-ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/simple-ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 }, renderOffset: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
            'walking': { imageSrc: new URL('../assets/itens/simple-ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 }, renderOffset: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
        }
    },
    'staff': {
        category: 'weapon', iconId: 1,
        uiIconUrl: new URL('../assets/itens/staff-design-1.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/staff-design-1.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'gun': {
        category: 'weapon', iconId: 2,
        uiIconUrl: new URL('../assets/itens/gun-design-1.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/gun-design-1.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'scythe': {
        category: 'weapon', iconId: 3,
        uiIconUrl: new URL('../assets/itens/scythe-design-1.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/scythe-design-1.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'simple-sword': {
        category: 'weapon', iconId: 4,
        uiIconUrl: new URL('../assets/itens/simple-sword.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/simple-sword.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'fishing-rod': {
        category: 'weapon', iconId: 5,
        uiIconUrl: new URL('../assets/itens/vara-de-pesca.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/vara-de-pesca.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'health-potion': {
        category: 'equipment', iconId: 30,
        uiIconUrl: new URL('../assets/itens/life-potion.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/life-potion.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'mana-potion': {
        category: 'equipment', iconId: 31,
        uiIconUrl: new URL('../assets/itens/mana-potion.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/mana-potion.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'apple': {
        category: 'equipment', iconId: 32,
        uiIconUrl: new URL('../assets/itens/apple.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/apple.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'coin': {
        category: 'equipment', iconId: 33,
        uiIconUrl: new URL('../assets/itens/coin.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/coin.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'experience-tome': {
        category: 'equipment', iconId: 34,
        uiIconUrl: new URL('../assets/itens/experience-tome.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/experience-tome.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'leather-bag': {
        category: 'equipment', iconId: 100,
        uiIconUrl: new URL('../assets/itens/bag.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/bag.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'vampire-fang': {
        category: 'equipment', iconId: 40,
        uiIconUrl: new URL('../assets/itens/vampire-fang.png', import.meta.url).href, // Substitua pelas imagens reais depois
        droppedConfig: { imageSrc: new URL('../assets/itens/vampire-fang.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'mega-mushroom': {
        category: 'equipment', iconId: 41,
        uiIconUrl: new URL('../assets/itens/mega-mushroom.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/mega-mushroom.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'adrenaline-flask': {
        category: 'equipment', iconId: 42,
        uiIconUrl: new URL('../assets/itens/adranaline-flask.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/adranaline-flask.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'demon-blood': {
        category: 'equipment', iconId: 43,
        uiIconUrl: new URL('../assets/itens/demon-blood.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/demon-blood.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },

    // ================== PROJÉTEIS & VFX ==================
    'simpleBullet': {
        category: 'projectile',
        animations: { 'travelling': { imageSrc: new URL('../assets/entities/vfx/simple-bullet.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 16, height: 16 } } }
    },
    'fishingHook': {
        category: 'projectile',
        animations: { 
            'travelling': { 
                imageSrc: new URL('../assets/entities/vfx/fishing-hook.png', import.meta.url).href, 
                frameCount: 1, animationSpeed: 10, 
                frameWidth: 16, frameHeight: 16, 
                atlasOffset: { x: 0, y: 32 }, 
                spriteSize: { width: 16, height: 16 }
             } 
        }
    },
    'magicMissile': {
        category: 'projectile',
        animations: { 'travelling': { imageSrc: new URL('../assets/entities/vfx/magic-missil.png', import.meta.url).href, frameCount: 3, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } } }
    },
    'fireball': {
        category: 'projectile',
        animations: { 
            'travelling': { 
                imageSrc: new URL('../assets/entities/vfx/firebola.png', import.meta.url).href, 
                frameCount: 1, animationSpeed: 10, 
                frameWidth: 16, frameHeight: 16, 
                atlasOffset: { x: 0, y: 32 }, 
                spriteSize: { width: 16, height: 16 }
             } 
        }
    },
    'dynamicSpell': {
        category: 'projectile',
        animations: { 
            'travelling': { 
                imageSrc: new URL('../assets/entities/vfx/projectile.png', import.meta.url).href, 
                frameCount: 1, animationSpeed: 1, 
                frameWidth: 16, frameHeight: 16, 
                spriteSize: { width: 10, height: 10 }
             } 
        }
    },
    'explosion': {
        category: 'vfx',
        animations: { 'active': { imageSrc: new URL('../assets/entities/vfx/explosion.png', import.meta.url).href, frameCount: 16, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 128, height: 128 } } }
    },
    'slash' :{
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/sword-atack-spritesheet.png', import.meta.url).href, 
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 },
            }
        }
    },
    'scythe-slash' :{
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/sword-atack-spritesheet.png', import.meta.url).href, 
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 },
                anchor: 'bottom-left'
            }
        }
    },
        'knockback-vfx': {
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/knockback-vfx.png', import.meta.url).href, 
                frameCount: 15, animationSpeed: 3,
                frameWidth: 32, frameHeight: 32,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 32, height: 32 }
            }
        }
    },
    'pull-force': {
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/pull-force.png', import.meta.url).href, 
                frameCount: 5, animationSpeed: 3,
                frameWidth: 64, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 128 }
            }
        }
    },

};