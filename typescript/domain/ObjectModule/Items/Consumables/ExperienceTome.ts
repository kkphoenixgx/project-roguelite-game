import Consumable from "./Consumable";
import ExperienceEffect from "../Effects/ExperienceEffect";

export default class ExperienceTome extends Consumable {
    constructor() {
    //? Item épico consumível que concede experiência imediata
        super('Tomo do Conhecimento Perdido', 'Páginas que sussurram verdades antigas. Concede grande quantidade de experiência.', 34, 'epic', 'quest', 34, 500, [new ExperienceEffect(500)]);
    }
}