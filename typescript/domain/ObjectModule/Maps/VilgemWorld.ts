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
import FishingRod from "../Items/Weapons/RangedWeapons/FishingRod";

export default class VilgemWorld extends GameWorld {
    public readonly mapId = 'vilgem';
    // Dimensões exatas da imagem de mapa que será carregada pelo Adaptador Web
    public readonly width = 8192; // 8 chunks de 1024px
    public readonly height = 8192;

    protected async generateCustomElements(): Promise<void> {
        // Spawna Molor, o Diretor da Academia de Magia, perto da área inicial do jogador!
        this.eventManager.dispatch('spawn', {
            type: 'molor',
            coordinates: { x: 450, y: 480 } 
        });

        // Spawna a arma inicial no chão, próxima de onde o jogador nasce (512, 512)
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 550, y: 512 }, item: new Gun() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 580, y: 512 }, item: new Scythe() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 490, y: 512 }, item: new SimpleSword() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 520, y: 580 }, item: new SimpleStaff() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 450, y: 520 }, item: new IronHelmet() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 420, y: 520 }, item: new IronChestplate() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 390, y: 520 }, item: new IronPants() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 360, y: 520 }, item: new IronBoots() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 330, y: 520 }, item: new IronGloves() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 380, y: 520 }, item: new SimpleAmulet() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 400, y: 520 }, item: new SimpleRing() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 500, y: 550 }, item: new FishingRod() });

        // Teste dos Efeitos Classic Survivor/Megabonk
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 500, y: 480 }, item: new VampireFang() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 530, y: 480 }, item: new MegaMushroom() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 560, y: 480 }, item: new AdrenalineFlask() });
        this.eventManager.dispatch('spawn', { type: 'droppedItem', coordinates: { x: 590, y: 480 }, item: new DemonBlood() });
    }
}