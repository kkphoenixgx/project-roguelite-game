import RangedWeapon from "./RangedWeapon";

export default class Gun extends RangedWeapon {
    constructor() {
        super(15, 0.3, 'Pistola Inicial', 'Uma arma de fogo confiável. Desperta o poder do Gunslinger.', 2, 'common', 2, 10, 100, [], 1, {}, false, true, 'Gunslinger');
        this.projectileType = 'simpleBullet';
        this.weaponType = 'gun';
    }
}