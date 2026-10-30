import RangedWeapon from "./RangedWeapon";

export default class FishingRod extends RangedWeapon {
    constructor() {
        super(
            5,
            1.0,
            'Vara de Pesca',
            'Uma vara de pesca robusta. Use para fisgar e arrastar inimigos. Desperta o poder do Pescador.',
            5,
            'uncommon',
            5,
            25,
            100,
            [],
            1,
            { dexterity: 2 },
            false,
            true,
            'Pescador'
        );
        this.projectileType = 'fishingHook'; 
    }
}