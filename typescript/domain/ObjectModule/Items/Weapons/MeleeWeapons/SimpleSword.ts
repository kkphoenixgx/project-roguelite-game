import Sword from "./Sword";

export default class SimpleSword extends Sword {
    constructor() {
        super(
            12,
            0.7,
            'Espada de Madeira',
            'Uma espada simples para treinos. Desperta o poder do Guerreiro.',
            4,
            'common',
            4,
            15,
            100,
            [],
            1,
            { strength: 2 },
            false,
            true,
            'Guerreiro'
        );
    }
}