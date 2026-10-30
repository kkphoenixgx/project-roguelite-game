/**
 * @file Builder responsável por instanciar a árvore de habilidades canônica da classe Necromante.
 * Extraído para manter o Necromancer.ts com alta coesão e dentro dos limites de linhas do SRP.
 */
import Skill from "../../../../Skills/Skill";
import AttributeBoostEffect from "../../../Items/Effects/AttributeBoostEffect";

export class NecromancerSkillsBuilder {
    public static build(): Map<number, Skill> {
        const skills = new Map<number, Skill>();

        skills.set(1, new Skill(
            'n_t1_reap',
            'Colheita Sombria',
            'Golpeia com a foice espectral arrancando a vitalidade das criaturas vivas em um arco fechado.',
            'essential',
            1
        ));

        skills.set(2, new Skill(
            'n_t1_death_aura',
            'Presença Fúnebre',
            'O contato íntimo com o véu dos mortos expande sua mente, aumentando permanentemente a Inteligência.',
            'attribute',
            1,
            'n_t1_reap',
            new AttributeBoostEffect('intelligence', 5)
        ));

        skills.set(5, new Skill(
            'n_t2_bone_spear',
            'Lança de Ossos',
            'Projeta um raio perfurante e linear de esquírolas de ossos que atravessa e esfacela fileiras inimigas.',
            'active',
            2,
            'n_t1_death_aura'
        ));

        skills.set(4, new Skill(
            'n_t2_lifesteal',
            'Sede de Sangue',
            'A fome do Abismo amplifica seu poder: concede bônus permanente de +6 de Inteligência arcana.',
            'passive',
            2,
            'n_t2_bone_spear',
            new AttributeBoostEffect('intelligence', 6)
        ));

        skills.set(8, new Skill(
            'n_t4_corpse_explosion',
            'Explosão Sombria',
            'Detona uma fenda cáustica na posição mirada, causando dano mágico massivo e espalhando névoa venenosa.',
            'active',
            3,
            'n_t2_lifesteal'
        ));

        skills.set(11, new Skill(
            'n_t4_death_warden',
            'Mestre da Morte',
            'A transcendência como monarca do túmulo concede +10 de Inteligência permanente.',
            'attribute',
            3,
            'n_t4_corpse_explosion',
            new AttributeBoostEffect('intelligence', 10)
        ));

        skills.set(12, new Skill(
            'n_t5_dance_of_dead',
            'Dança das Almas Penadas',
            'Invoca um vórtice orbital de almas aprisionadas que circundam o Necromante, dilacerando quem ousar se aproximar.',
            'active',
            4,
            'n_t4_death_warden'
        ));

        skills.set(3, new Skill(
            'n_t1_soul_leech',
            'Dreno Vital',
            'Canaliza a essência residual das almas ceifadas, concedendo Sabedoria permanente para rituais.',
            'passive',
            2,
            'n_t1_death_aura',
            new AttributeBoostEffect('wisdom', 5)
        ));

        skills.set(6, new Skill(
            'n_t3_soul',
            'Ascensão do Lich',
            'Abandone sua humanidade: expande sua comunhão sobrenatural com +6 permanente de Sabedoria.',
            'rare',
            2,
            'n_t1_soul_leech',
            new AttributeBoostEffect('wisdom', 6)
        ));

        skills.set(7, new Skill(
            'n_t3_grasp_of_dead',
            'Garras do Além',
            'Um corte largo de energia abissal que despedaça as carnes e inflige Decaimento Contínuo nos alvos.',
            'active',
            3,
            'n_t3_soul'
        ));

        skills.set(9, new Skill(
            'n_t3_spectral_veil',
            'Manto Espectral',
            'O tecido da morte envolve sua alma: concede bônus permanente de +8 de Sabedoria mística.',
            'passive',
            3,
            'n_t3_grasp_of_dead',
            new AttributeBoostEffect('wisdom', 8)
        ));

        skills.set(10, new Skill(
            'n_t5_wail_of_banshee',
            'Clamor da Banshee',
            'Libera o grito agudo de um espectro vingativo, aterrorizando e desacelerando todos os inimigos em raio total.',
            'active',
            4,
            'n_t3_spectral_veil'
        ));

        return skills;
    }
}
