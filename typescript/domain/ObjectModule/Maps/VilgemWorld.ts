import GameWorld from "../GameWorld";
import Gun from "../Items/Weapons/RangedWeapons/Gun";
import Scythe from "../Items/Weapons/MeleeWeapons/Scythe";
import SimpleStaff from "../Items/Weapons/RangedWeapons/Staffs/SimpleStaff";
import IronHelmet from "../Items/Armors/helmet/IronHelmet";
import IronChestplate from "../Items/Armors/chestplates/IronChestplate";
import IronPants from "../Items/Armors/pants/IronPants";
import IronBoots from "../Items/Armors/boots/IronBoots";
import IronGloves from "../Items/Armors/glooves/IronGloves";
import SimpleAmulet from "../Items/Armors/necklaces/SimpleAmulet";
import SimpleRing from "../Items/Armors/rings/SimpleRing";
import SimpleSword from "../Items/Weapons/MeleeWeapons/SimpleSword";
import VampireFang from "../Items/Consumables/VampireFang";
import MegaMushroom from "../Items/Consumables/MegaMushroom";
import AdrenalineFlask from "../Items/Consumables/Potions/AdrenalineFlask";
import DemonBlood from "../Items/Consumables/DemonBlood";
import ExperienceTome from "../Items/Consumables/ExperienceTome";
import FishingRod from "../Items/Weapons/RangedWeapons/FishingRod";
import ItemFactory from "../Items/ItemFactory";

export default class VilgemWorld extends GameWorld {
    public readonly mapId = 'vilgem';
    //? <!-- ASSETS_ADAPTER_MAP_DIMS_START -->
    //? Dimensões do mapa composto por chunks dinâmicos (Origem no Chunk 0,0)
    public readonly width = 5120;
    public readonly height = 6144;
    public override readonly minX = -2048;
    public override readonly minY = -3072;
    public override readonly maxX = 3072;
    public override readonly maxY = 3072;
    public override readonly originChunk = { cx: 2, cy: 3 };
    public override readonly defaultSpawn = { x: 512, y: 591 };
    public override readonly chunks: string[][] = [
        [
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r4_c0.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r4_c0.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png"
        ],
        [
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r0_c1.png",
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r0_c1.png",
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r0_c2.png",
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r0_c1.png",
                "/typescript/adapters/web/assets/maps/vilgem/chunk_r0_c3.png"
        ],
        [
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png"
        ],
        [
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "/assets/maps/vilgem/chunk_r3_c2_baked_1793045534063.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png"
        ],
        [
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png"
        ],
        [
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
                "http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png"
        ]
];
    //? <!-- ASSETS_ADAPTER_MAP_DIMS_END -->

    protected async generateCustomElements(): Promise<void> {

        //? <!-- ASSETS_ADAPTER_SCENERY_START -->
        //? =========================================================================
        //? 1. CHUNK (-2,-2) [-2048..-1024, -2048..-1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: -1223 }, metadata: { preset: 'stone_wall_corner' } });

        //? =========================================================================
        //? 3. CHUNK (-1,-2) [-1024..0, -2048..-1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -32, y: -1180 }, size: { width: 360, height: 208 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -462, y: -1180 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -893, y: -1180 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 5. CHUNK (0,-2) [0..1024, -2048..-1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 405, y: -1715 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 582, y: -1715 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 437, y: -1680 }, size: { width: 148, height: 240 }, metadata: { preset: 'bridge_wood_planks' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 327, y: -1222 }, metadata: { preset: 'stone_wall_gate' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 723, y: -1180 }, size: { width: 360, height: 208 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 7. CHUNK (1,-2) [1024..2048, -2048..-1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1845, y: -1223 }, metadata: { preset: 'stone_wall_corner_ne' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1513, y: -1181 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1082, y: -1180 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 9. CHUNK (2,-2) [2048..3072, -2048..-1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2429, y: -1028 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 11. CHUNK (-2,-1) [-2048..-1024, -1024..0]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1765, y: -1011 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1555, y: -1007 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1666, y: -1001 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2036, y: -987 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1910, y: -982 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1472, y: -978 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1325, y: -977 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: -974 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1762, y: -881 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1673, y: -875 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1541, y: -873 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1918, y: -863 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2038, y: -857 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1326, y: -857 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1467, y: -845 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1667, y: -771 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1552, y: -770 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: -767 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1776, y: -766 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2039, y: -744 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1926, y: -742 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1334, y: -735 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1467, y: -735 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1778, y: -632 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1544, y: -625 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1666, y: -624 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1468, y: -612 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1922, y: -606 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2035, y: -605 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1321, y: -602 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: -560 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1792, y: -483 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1550, y: -471 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1667, y: -470 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1911, y: -455 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2042, y: -452 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1461, y: -452 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1329, y: -450 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: -353 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1325, y: -344 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1569, y: -344 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1888, y: -342 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1779, y: -342 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1472, y: -340 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1695, y: -334 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2033, y: -331 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1922, y: -209 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1704, y: -195 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1825, y: -190 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1476, y: -189 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2039, y: -188 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1325, y: -182 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1571, y: -180 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: -145 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1799, y: -59 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2029, y: -58 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1912, y: -58 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1469, y: -57 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1330, y: -55 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1705, y: -54 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1582, y: -54 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 13. CHUNK (-1,-1) [-1024..0, -1024..0]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -545, y: -895 }, metadata: { preset: 'stone_well' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -676, y: -869 }, metadata: { preset: 'road_junction_t' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -316, y: -849 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -910, y: -735 }, metadata: { preset: 'house_bakery_rustic', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -380, y: -720 }, metadata: { preset: 'house_small_cottage' } });
        this.eventManager.dispatch('spawn', { type: 'portalLinkRequest', coordinates: { x: -324, y: -642 }, size: { width: 64, height: 64 }, metadata: { targetMapId: 'interior_black_default', targetSpawnCoords: { x: 512, y: 700 }, promptText: 'Entrar', actionKey: 'E', cooldownMs: 1000 } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -608, y: -620 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -420, y: -620 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -900, y: -445 }, metadata: { preset: 'wooden_fence_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -380, y: -445 }, metadata: { preset: 'wooden_fence_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -385, y: -405 }, metadata: { preset: 'house_merchant_timber' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -900, y: -395 }, metadata: { preset: 'house_windmill_grain', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -579, y: -266 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -630, y: -220 }, metadata: { preset: 'barrel_stack' } });

        //? =========================================================================
        //? 15. CHUNK (0,-1) [0..1024, -1024..0]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 383, y: -939 }, metadata: { preset: 'road_crossroad_4way' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 650, y: -832 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 439, y: -790 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 75, y: -745 }, metadata: { preset: 'house_town_hall', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 630, y: -735 }, metadata: { preset: 'house_guard_barracks' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 416, y: -644 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 576, y: -644 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 344, y: -470 }, metadata: { preset: 'stone_well' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 605, y: -470 }, metadata: { preset: 'wooden_bench' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 25, y: -460 }, metadata: { preset: 'tree_oak' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 900, y: -460 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 439, y: -430 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 635, y: -375 }, metadata: { preset: 'house_forge_garret' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 34, y: -364 }, metadata: { preset: 'house_red_boro' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 416, y: -240 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 576, y: -240 }, metadata: { preset: 'street_lantern', flipX: true } });

        //? =========================================================================
        //? 17. CHUNK (1,-1) [1024..2048, -1024..0]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: -974 }, size: { width: 128, height: 212 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1374, y: -858 }, metadata: { preset: 'road_junction_t' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: -763 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1650, y: -745 }, metadata: { preset: 'house_apothecary_greenhouse' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1150, y: -720 }, metadata: { preset: 'house_log_cabin', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1436, y: -620 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1596, y: -620 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: -556 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1341, y: -500 }, metadata: { preset: 'rock_mossy' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1612, y: -500 }, metadata: { preset: 'wooden_bench' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1660, y: -410 }, metadata: { preset: 'house_witch_turret' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1155, y: -395 }, metadata: { preset: 'house_peasant_thatched', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: -349 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1459, y: -325 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: -141 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });

        //? =========================================================================
        //? 19. CHUNK (2,-1) [2048..3072, -1024..0]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2192, y: -1000 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2310, y: -1000 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2863, y: -999 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2767, y: -999 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2529, y: -991 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2651, y: -990 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2434, y: -905 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2639, y: -868 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2869, y: -867 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2768, y: -867 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2529, y: -867 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2319, y: -865 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2195, y: -864 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2428, y: -782 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2655, y: -762 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2310, y: -761 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2759, y: -758 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2525, y: -756 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2183, y: -754 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2866, y: -745 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2434, y: -641 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2313, y: -624 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2867, y: -620 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2196, y: -618 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2767, y: -614 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2539, y: -611 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2646, y: -606 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2427, y: -509 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2307, y: -480 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2655, y: -478 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2203, y: -476 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2527, y: -476 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2873, y: -473 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2761, y: -467 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2428, y: -384 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2197, y: -364 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2870, y: -355 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2543, y: -354 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2326, y: -353 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2760, y: -349 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2659, y: -344 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2441, y: -231 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2652, y: -201 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2754, y: -200 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2318, y: -195 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2864, y: -195 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2534, y: -192 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2197, y: -190 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2537, y: -73 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2196, y: -71 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2865, y: -71 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2422, y: -70 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2774, y: -70 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2655, y: -69 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2311, y: -63 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 21. CHUNK (-2,0) [-2048..-1024, 0..1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1349, y: 50 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1915, y: 53 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1574, y: 53 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1703, y: 54 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2034, y: 57 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1803, y: 59 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 62 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1489, y: 94 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1298, y: 189 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1911, y: 198 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1576, y: 198 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2020, y: 200 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1692, y: 200 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1798, y: 204 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1412, y: 209 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 269 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1265, y: 337 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1798, y: 342 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2033, y: 342 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1913, y: 342 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1686, y: 346 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1580, y: 348 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1465, y: 352 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2021, y: 455 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1909, y: 456 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1793, y: 457 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1689, y: 457 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1533, y: 472 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 476 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1285, y: 481 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1396, y: 482 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1698, y: 583 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1592, y: 600 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2024, y: 600 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1323, y: 602 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1814, y: 605 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1903, y: 605 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1457, y: 605 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 684 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1917, y: 724 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2017, y: 735 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1316, y: 736 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1416, y: 740 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1569, y: 744 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1686, y: 747 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1779, y: 764 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1793, y: 843 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1423, y: 845 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2021, y: 848 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1312, y: 848 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1684, y: 854 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1569, y: 858 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1879, y: 867 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 891 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1910, y: 979 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1676, y: 982 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1419, y: 984 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2010, y: 985 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1316, y: 986 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1796, y: 987 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1563, y: 990 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 23. CHUNK (-1,0) [-1024..0, 0..1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -375, y: 55 }, metadata: { preset: 'house_blue_leda' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -910, y: 80 }, metadata: { preset: 'house_woodcutter_shack', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -710, y: 312 }, metadata: { preset: 'barrel_stack' } });
        this.eventManager.dispatch('spawn', { type: 'portalLinkRequest', coordinates: { x: -207, y: 322 }, size: { width: 64, height: 64 }, metadata: { targetMapId: 'interior_black_default', targetSpawnCoords: { x: 512, y: 700 }, promptText: 'Entrar', actionKey: 'E', cooldownMs: 1000 } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -603, y: 380 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -420, y: 380 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -514, y: 448 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -628, y: 470 }, metadata: { preset: 'road_junction_t', flipY: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -728, y: 590 }, size: { width: 75, height: 87 }, metadata: { preset: 'camp_stone_campfire' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -603, y: 615 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -420, y: 615 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -385, y: 620 }, metadata: { preset: 'house_sawmill_carpentry' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -910, y: 635 }, metadata: { preset: 'house_stone_hovel', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -663, y: 721 }, metadata: { preset: 'props_training_dummy' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -540, y: 799 }, metadata: { preset: 'road_straight_vertical' } });

        //? =========================================================================
        //? 25. CHUNK (0,0) [0..1024, 0..1024] - Alvorada de Vilgem (Praça Central / Spawn)
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 384, y: 25 }, size: { width: 256, height: 260 }, metadata: { preset: 'road_crossroad_4way' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 569, y: 94 }, size: { width: 361, height: 119 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 90, y: 97 }, size: { width: 361, height: 119 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 737, y: 98 }, size: { width: 197, height: 183 }, metadata: { preset: 'road_corner_90', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 91, y: 102 }, size: { width: 197, height: 183 }, metadata: { preset: 'road_corner_90' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 89, y: 102 }, size: { width: 145, height: 428 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 790, y: 129 }, size: { width: 145, height: 428 }, metadata: { preset: 'road_straight_vertical' } });
        this.spawnDroppedItem({ x: 500, y: 149 }, new ExperienceTome());
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 363, y: 322 }, size: { width: 298, height: 293 }, metadata: { preset: 'fountain_awakening' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 734, y: 379 }, size: { width: 256, height: 260 }, metadata: { preset: 'road_crossroad_4way' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 34, y: 380 }, size: { width: 256, height: 260 }, metadata: { preset: 'road_crossroad_4way' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 790, y: 411 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 90, y: 445 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 973, y: 452 }, metadata: { preset: 'road_straight_horizontal' } });
        this.spawnDroppedItem({ x: 433, y: 664 }, ItemFactory.createItem('SimpleSword', { name: 'Flamejante Poderosa Espada de Madeira', baseDamage: 11 }));
        this.spawnDroppedItem({ x: 557, y: 664 }, ItemFactory.createItem('Scythe', { name: 'Flamejante Poderosa Foice das Almas', baseDamage: 32 }));
        this.spawnDroppedItem({ x: 513, y: 664 }, ItemFactory.createItem('FishingRod', { name: 'Enferrujada Vara de Pesca', baseDamage: 4 }));
        this.spawnDroppedItem({ x: 389, y: 664 }, ItemFactory.createItem('SimpleStaff', { baseDamage: 11 }));
        this.spawnDroppedItem({ x: 474, y: 665 }, ItemFactory.createItem('Gun', { name: 'Poderosa Pistola Inicial', baseDamage: 14 }));
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 384, y: 739 }, size: { width: 256, height: 260 }, metadata: { preset: 'road_crossroad_4way' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 735, y: 743 }, size: { width: 202, height: 183 }, metadata: { preset: 'road_corner_90', flipX: true, flipY: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 90, y: 744 }, size: { width: 202, height: 183 }, metadata: { preset: 'road_corner_90', flipY: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 518, y: 809 }, size: { width: 361, height: 115 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 155, y: 810 }, size: { width: 361, height: 119 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 439, y: 981 }, metadata: { preset: 'road_straight_vertical' } });

        //? =========================================================================
        //? 27. CHUNK (1,0) [1024..2048, 0..1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1670, y: 45 }, metadata: { preset: 'house_arcane_tower' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1110, y: 65 }, metadata: { preset: 'house_inn_mara', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 66 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 273 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1436, y: 380 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1596, y: 380 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1880, y: 380 }, metadata: { preset: 'stone_well' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1370, y: 423 }, metadata: { preset: 'road_junction_t', flipY: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 480 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1436, y: 615 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1596, y: 615 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1125, y: 620 }, metadata: { preset: 'house_chapel_bell', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1655, y: 620 }, metadata: { preset: 'house_watermill_river' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1463, y: 654 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 686 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 893 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });

        //? =========================================================================
        //? 29. CHUNK (2,0) [2048..3072, 0..1024]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2875, y: 38 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2654, y: 38 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2316, y: 42 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2760, y: 45 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2427, y: 49 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2539, y: 50 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2194, y: 54 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2321, y: 144 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2431, y: 175 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2654, y: 179 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2877, y: 182 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2205, y: 183 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2768, y: 184 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2534, y: 192 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2435, y: 315 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2320, y: 320 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2203, y: 321 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2762, y: 325 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2654, y: 329 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2543, y: 335 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2874, y: 336 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2332, y: 408 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2765, y: 435 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2870, y: 438 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2438, y: 441 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2543, y: 441 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2655, y: 448 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2206, y: 457 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2337, y: 555 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2876, y: 571 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2770, y: 574 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2435, y: 585 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2206, y: 589 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2545, y: 597 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2658, y: 599 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2336, y: 687 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2881, y: 706 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2773, y: 706 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2444, y: 709 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2204, y: 711 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2545, y: 728 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2663, y: 728 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2884, y: 814 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2772, y: 823 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2440, y: 823 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2554, y: 830 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2206, y: 832 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2329, y: 833 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2664, y: 838 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2439, y: 962 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2881, y: 963 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2208, y: 968 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2552, y: 970 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2331, y: 973 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2780, y: 974 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2649, y: 990 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 31. CHUNK (-2,1) [-2048..-1024, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 1098 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1447, y: 1112 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1308, y: 1115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1791, y: 1125 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2023, y: 1128 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1905, y: 1129 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1689, y: 1130 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1572, y: 1133 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1906, y: 1245 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1307, y: 1249 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1778, y: 1252 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2018, y: 1261 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1589, y: 1261 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1408, y: 1263 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1696, y: 1278 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 1305 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1800, y: 1370 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1929, y: 1373 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1411, y: 1382 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2013, y: 1386 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1315, y: 1387 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1668, y: 1388 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1561, y: 1394 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1677, y: 1495 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1560, y: 1497 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1303, y: 1506 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1791, y: 1507 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1422, y: 1510 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 1512 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2006, y: 1515 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1896, y: 1522 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1534, y: 1624 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1278, y: 1626 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1786, y: 1634 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1674, y: 1634 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2022, y: 1636 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1891, y: 1638 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1382, y: 1646 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 1720 }, size: { width: 128, height: 209 }, metadata: { preset: 'stone_wall_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1799, y: 1742 }, size: { width: 97, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2026, y: 1764 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1303, y: 1769 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1892, y: 1772 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1551, y: 1772 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1683, y: 1773 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1400, y: 1775 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -2002, y: 1890 }, size: { width: 90, height: 161 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1299, y: 1904 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1894, y: 1914 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1410, y: 1917 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1787, y: 1918 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1679, y: 1918 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1547, y: 1923 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1208, y: 1928 }, metadata: { preset: 'stone_wall_corner_sw' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1997, y: 2028 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1783, y: 2033 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1679, y: 2033 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1891, y: 2035 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1468, y: 2037 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 33. CHUNK (-1,1) [-1024..0, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -935, y: 1085 }, size: { width: 326, height: 375 }, metadata: { preset: 'house_noble_manor', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -380, y: 1130 }, metadata: { preset: 'house_fisherman_shack' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -632, y: 1352 }, metadata: { preset: 'road_junction_t' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -603, y: 1360 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -420, y: 1360 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -308, y: 1366 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -674, y: 1376 }, metadata: { preset: 'bush_flowering' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -910, y: 1440 }, metadata: { preset: 'house_bakery_rustic', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -380, y: 1455 }, metadata: { preset: 'house_small_cottage' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -432, y: 1710 }, metadata: { preset: 'stone_well' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -893, y: 1970 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -463, y: 1970 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -32, y: 1970 }, size: { width: 360, height: 208 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 35. CHUNK (0,1) [0..1024, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'portalLinkRequest', coordinates: { x: 260, y: 1055 }, size: { width: 64, height: 64 }, metadata: { targetMapId: 'interior_black_default', targetSpawnCoords: { x: 512, y: 700 }, promptText: 'Entrar', actionKey: 'E', cooldownMs: 1000 } });
        this.eventManager.dispatch('spawn', { type: 'portalLinkRequest', coordinates: { x: 757, y: 1060 }, size: { width: 64, height: 64 }, metadata: { targetMapId: 'interior_black_default', targetSpawnCoords: { x: 512, y: 700 }, promptText: 'Entrar', actionKey: 'E', cooldownMs: 1000 } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 75, y: 1085 }, metadata: { preset: 'house_tavern_brewery', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 645, y: 1085 }, metadata: { preset: 'house_alchemist_curio' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 416, y: 1226 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 576, y: 1226 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 344, y: 1300 }, size: { width: 346, height: 324 }, metadata: { preset: 'road_crossroad_4way' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 396, y: 1376 }, metadata: { preset: 'wooden_bench', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 596, y: 1376 }, metadata: { preset: 'wooden_bench' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 705, y: 1397 }, metadata: { preset: 'road_straight_horizontal' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 95, y: 1435 }, metadata: { preset: 'house_merchant_timber', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 645, y: 1455 }, metadata: { preset: 'house_peasant_thatched' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 416, y: 1650 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 576, y: 1650 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 350, y: 1700 }, metadata: { preset: 'stone_well' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 442, y: 1732 }, metadata: { preset: 'road_straight_vertical' } });
        this.eventManager.dispatch('spawn', { type: 'portalLinkRequest', coordinates: { x: 708, y: 1852 }, size: { width: 64, height: 64 }, metadata: { targetMapId: 'interior_black_default', targetSpawnCoords: { x: 512, y: 700 }, promptText: 'Entrar', actionKey: 'E', cooldownMs: 1000 } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 327, y: 1928 }, metadata: { preset: 'stone_wall_gate' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 722, y: 1970 }, size: { width: 360, height: 208 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 37. CHUNK (1,1) [1024..2048, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1135, y: 1100 }, metadata: { preset: 'house_windmill_grain', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 1100 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1655, y: 1115 }, metadata: { preset: 'house_stone_hovel' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 1307 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1405, y: 1343 }, size: { width: 197, height: 181 }, metadata: { preset: 'road_corner_90' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1436, y: 1360 }, metadata: { preset: 'street_lantern' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1596, y: 1360 }, metadata: { preset: 'street_lantern', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1400, y: 1376 }, metadata: { preset: 'barrel_stack' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1145, y: 1455 }, metadata: { preset: 'house_woodcutter_shack', flipX: true } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1655, y: 1455 }, metadata: { preset: 'house_log_cabin' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 1515 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2033, y: 1722 }, metadata: { preset: 'stone_wall_straight_vertical_east' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1845, y: 1927 }, metadata: { preset: 'stone_wall_corner_se' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1512, y: 1970 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1082, y: 1970 }, size: { width: 431, height: 207 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 39. CHUNK (2,1) [2048..3072, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2437, y: 1065 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2778, y: 1114 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2221, y: 1116 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2878, y: 1123 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2552, y: 1125 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2657, y: 1133 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2330, y: 1141 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2452, y: 1191 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2883, y: 1239 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2790, y: 1240 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2218, y: 1241 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2554, y: 1243 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2656, y: 1251 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2338, y: 1271 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2442, y: 1317 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2548, y: 1370 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2891, y: 1372 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2219, y: 1377 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2786, y: 1379 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2660, y: 1390 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2328, y: 1419 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2444, y: 1451 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2885, y: 1502 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2553, y: 1503 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2218, y: 1505 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2781, y: 1509 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2656, y: 1528 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2337, y: 1543 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2451, y: 1561 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2779, y: 1622 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2217, y: 1626 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2893, y: 1626 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2548, y: 1628 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2658, y: 1645 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2332, y: 1658 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2456, y: 1706 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2211, y: 1755 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2565, y: 1758 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2894, y: 1762 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2787, y: 1763 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2661, y: 1776 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2333, y: 1791 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2451, y: 1849 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2222, y: 1891 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2551, y: 1893 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2889, y: 1898 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2781, y: 1905 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2651, y: 1916 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2329, y: 1933 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2463, y: 1971 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2789, y: 2017 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2226, y: 2020 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2559, y: 2024 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2893, y: 2026 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2675, y: 2041 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 41. CHUNK (-2,2) [-2048..-1024, 2048..3072]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1315, y: 2055 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1554, y: 2059 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1663, y: 2169 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1215, y: 2211 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1334, y: 2217 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1965, y: 2222 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1860, y: 2234 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1757, y: 2241 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1531, y: 2243 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1081, y: 2254 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1427, y: 2263 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1664, y: 2311 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1330, y: 2343 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1970, y: 2349 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1216, y: 2350 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1754, y: 2355 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1871, y: 2360 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1534, y: 2373 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1079, y: 2383 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1419, y: 2387 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1665, y: 2425 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1221, y: 2452 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1326, y: 2453 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1965, y: 2456 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1753, y: 2471 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1874, y: 2479 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1518, y: 2489 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1080, y: 2503 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1421, y: 2506 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1663, y: 2553 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1211, y: 2589 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1319, y: 2592 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1969, y: 2594 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1857, y: 2610 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1755, y: 2615 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1520, y: 2622 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1072, y: 2634 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1423, y: 2646 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1665, y: 2712 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1209, y: 2738 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1328, y: 2739 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1960, y: 2741 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1865, y: 2756 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1522, y: 2757 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1761, y: 2766 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1075, y: 2785 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1424, y: 2788 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1652, y: 2826 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1325, y: 2860 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1206, y: 2862 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1966, y: 2868 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1868, y: 2878 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1516, y: 2889 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1754, y: 2892 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1420, y: 2910 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -1073, y: 2913 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 43. CHUNK (-1,2) [-1024..0, 2048..3072]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -421, y: 2186 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -995, y: 2207 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -878, y: 2208 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -752, y: 2211 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -538, y: 2217 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -330, y: 2217 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -193, y: 2219 }, size: { width: 98, height: 156 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -93, y: 2221 }, size: { width: 92, height: 147 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -633, y: 2262 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -418, y: 2303 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -334, y: 2335 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -991, y: 2340 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -99, y: 2344 }, size: { width: 77, height: 124 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -534, y: 2345 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -214, y: 2345 }, size: { width: 96, height: 153 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -757, y: 2347 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -878, y: 2347 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -631, y: 2386 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -425, y: 2426 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -865, y: 2447 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -73, y: 2451 }, size: { width: 69, height: 110 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -323, y: 2452 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -537, y: 2454 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -984, y: 2457 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -212, y: 2461 }, size: { width: 81, height: 129 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -760, y: 2462 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -639, y: 2507 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -413, y: 2561 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -85, y: 2577 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -533, y: 2588 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -766, y: 2588 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -869, y: 2589 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -208, y: 2590 }, size: { width: 81, height: 129 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -996, y: 2592 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -309, y: 2603 }, size: { width: 69, height: 110 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -620, y: 2639 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -415, y: 2705 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -871, y: 2731 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -214, y: 2732 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -752, y: 2734 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -86, y: 2738 }, size: { width: 69, height: 110 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -995, y: 2740 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -542, y: 2743 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -320, y: 2751 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -628, y: 2775 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -409, y: 2827 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -68, y: 2850 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -978, y: 2851 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -533, y: 2853 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -860, y: 2854 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -303, y: 2859 }, size: { width: 92, height: 147 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -198, y: 2861 }, size: { width: 73, height: 116 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -747, y: 2864 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: -630, y: 2898 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 45. CHUNK (0,2) [0..1024, 2048..3072]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 824, y: 2201 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 267, y: 2213 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 146, y: 2214 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 24, y: 2217 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 732, y: 2246 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 965, y: 2248 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 835, y: 2318 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 19, y: 2335 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 131, y: 2335 }, size: { width: 74, height: 119 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 245, y: 2341 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 950, y: 2367 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 719, y: 2382 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 841, y: 2437 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 141, y: 2442 }, size: { width: 66, height: 105 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 234, y: 2451 }, size: { width: 95, height: 152 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 25, y: 2455 }, size: { width: 85, height: 135 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 961, y: 2485 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 725, y: 2491 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 830, y: 2571 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 135, y: 2587 }, size: { width: 60, height: 96 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 247, y: 2592 }, size: { width: 89, height: 142 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 16, y: 2596 }, size: { width: 97, height: 155 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 965, y: 2625 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 723, y: 2630 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 830, y: 2725 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 22, y: 2736 }, size: { width: 90, height: 144 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 139, y: 2746 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 233, y: 2750 }, size: { width: 81, height: 129 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 951, y: 2771 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 721, y: 2775 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 839, y: 2840 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 147, y: 2840 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 36, y: 2856 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 246, y: 2866 }, size: { width: 89, height: 143 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 961, y: 2898 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 730, y: 2900 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 47. CHUNK (1,2) [1024..2048, 2048..3072]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1735, y: 2186 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1512, y: 2217 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1180, y: 2232 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1289, y: 2244 }, size: { width: 72, height: 115 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1058, y: 2246 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1623, y: 2255 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1848, y: 2259 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1388, y: 2259 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1991, y: 2276 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1737, y: 2309 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1175, y: 2328 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1509, y: 2338 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1849, y: 2370 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1615, y: 2374 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1294, y: 2375 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1398, y: 2379 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1060, y: 2381 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1996, y: 2401 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1740, y: 2425 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1177, y: 2442 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1501, y: 2455 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1855, y: 2490 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1058, y: 2491 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1630, y: 2491 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1395, y: 2496 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1290, y: 2500 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1985, y: 2523 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1745, y: 2561 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1175, y: 2577 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1517, y: 2588 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1854, y: 2627 }, size: { width: 88, height: 141 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1292, y: 2631 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1628, y: 2632 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1397, y: 2633 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1058, y: 2635 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1990, y: 2671 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1739, y: 2714 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1181, y: 2720 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1517, y: 2735 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1852, y: 2761 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1286, y: 2765 }, size: { width: 76, height: 122 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1052, y: 2771 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1395, y: 2772 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1628, y: 2773 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1988, y: 2808 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1745, y: 2836 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1174, y: 2847 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1513, y: 2859 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1306, y: 2889 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1632, y: 2890 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1846, y: 2891 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1071, y: 2895 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1407, y: 2898 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1993, y: 2918 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 49. CHUNK (2,2) [2048..3072, 2048..3072]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2353, y: 2060 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2555, y: 2193 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2088, y: 2221 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2779, y: 2238 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2304, y: 2251 }, size: { width: 71, height: 114 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2408, y: 2251 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2187, y: 2255 }, size: { width: 76, height: 121 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2913, y: 2258 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2660, y: 2280 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2544, y: 2328 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2090, y: 2354 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2776, y: 2367 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2207, y: 2370 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2308, y: 2378 }, size: { width: 83, height: 132 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2410, y: 2380 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2894, y: 2391 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2669, y: 2396 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2551, y: 2435 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2085, y: 2464 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2788, y: 2490 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2417, y: 2494 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2899, y: 2498 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2310, y: 2510 }, size: { width: 68, height: 109 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2193, y: 2517 }, size: { width: 75, height: 120 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2656, y: 2522 }, size: { width: 87, height: 139 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2562, y: 2583 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2091, y: 2602 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2310, y: 2623 }, size: { width: 78, height: 125 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2784, y: 2624 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2906, y: 2638 }, size: { width: 77, height: 123 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2187, y: 2647 }, size: { width: 76, height: 121 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2410, y: 2651 }, size: { width: 84, height: 134 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2664, y: 2656 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2548, y: 2719 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2083, y: 2746 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2793, y: 2768 }, size: { width: 85, height: 136 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2197, y: 2779 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2416, y: 2780 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2899, y: 2781 }, size: { width: 82, height: 131 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2305, y: 2783 }, size: { width: 68, height: 109 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2655, y: 2794 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2555, y: 2846 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2096, y: 2874 }, size: { width: 73, height: 117 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2784, y: 2885 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2295, y: 2904 }, size: { width: 79, height: 126 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2416, y: 2906 }, size: { width: 86, height: 138 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2918, y: 2910 }, size: { width: 74, height: 118 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2182, y: 2913 }, size: { width: 83, height: 133 }, metadata: { preset: 'tree_pine' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 2671, y: 2922 }, size: { width: 81, height: 130 }, metadata: { preset: 'tree_pine' } });

        //? =========================================================================
        //? 51. CHUNK (8,1) [8192..9216, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 9206, y: 1968 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 53. CHUNK (9,1) [9216..10240, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 9592, y: 1968 }, metadata: { preset: 'stone_wall_straight_long' } });

        //? =========================================================================
        //? 55. CHUNK (10,1) [10240..11264, 1024..2048]
        //? =========================================================================
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 10811, y: 1969 }, metadata: { preset: 'stone_wall_straight_long' } });
        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 11206, y: 1969 }, metadata: { preset: 'stone_wall_straight_long' } });
        //? <!-- ASSETS_ADAPTER_SCENERY_END -->

        //? ----------- NPCS (Habitantes de Alvorada de Vilgem no Chunk Central) -----------
        this.eventManager.dispatch('spawn', { type: 'molor', coordinates: { x: 340, y: 380 } });
        this.eventManager.dispatch('spawn', { type: 'candelion', coordinates: { x: 640, y: 380 } });
        this.eventManager.dispatch('spawn', { type: 'derocar', coordinates: { x: 536, y: 630 } });
        this.eventManager.dispatch('spawn', { type: 'molin', coordinates: { x: 655, y: 500 } });
    }
}
