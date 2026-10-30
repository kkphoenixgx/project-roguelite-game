/**
 * @file Builder responsável por instanciar a árvore de habilidades canônica da classe Guerreiro.
 * Extraído para manter o Warrior.ts com alta coesão e dentro dos limites de linhas do SRP.
 */
import Skill from "../../../../Skills/Skill";
import AttributeBoostEffect from "../../../Items/Effects/AttributeBoostEffect";

export class WarriorSkillsBuilder {
    public static build(): Map<number, Skill> {
        const skills = new Map<number, Skill>();

        skills.set(1, new Skill(
            'w_t1_strike',
            'Força Bruta',
            'A musculatura forjada em aço eleva a Constituição permanente da entidade.',
            'attribute',
            1,
            undefined,
            new AttributeBoostEffect('constitution', 5)
        ));

        skills.set(2, new Skill(
            'w_t1_heavy_blow',
            'Pancada Pesada',
            'Desfere um golpe frontal direto e impetuoso com a lâmina, causando alto dano e forte empurrão.',
            'active',
            1,
            'w_t1_strike'
        ));

        skills.set(4, new Skill(
            'w_t2_cleave',
            'Turbilhão de Aço',
            'Gira a espada em torno do corpo cortando e repelindo inimigos. Velocidade angular escala com Destreza e alcance com Força.',
            'active',
            2,
            'w_t1_heavy_blow'
        ));

        skills.set(6, new Skill(
            'w_t3_berserk',
            'Fúria de Batalha',
            'O sangue guerreiro ferve: concede bônus permanente de +6 de Força bruta.',
            'passive',
            2,
            'w_t2_cleave',
            new AttributeBoostEffect('strength', 6)
        ));

        skills.set(10, new Skill(
            'w_t5_blade_dance',
            'Dança das Lâminas do Colosso',
            'Desfere um golpe em arco devastador de 160 graus à frente, arremessando os inimigos com força tremenda.',
            'active',
            3,
            'w_t3_berserk'
        ));

        skills.set(11, new Skill(
            'w_t4_armor_breaker',
            'Quebrador de Armaduras',
            'A força dos seus golpes é tão desmedida que despedaça as armaduras inimigas, aumentando seu Dano Físico e perfuração.',
            'passive',
            3,
            'w_t5_blade_dance',
            new AttributeBoostEffect('strength', 8)
        ));

        skills.set(12, new Skill(
            'w_t5_avatar_of_war',
            'Avatar da Guerra',
            'Invoca o poder primal da matança: regenera vida instantaneamente, libera faíscas sangrentas e aumenta a Velocidade.',
            'active',
            4,
            'w_t4_armor_breaker'
        ));

        skills.set(3, new Skill(
            'w_t1_iron_skin',
            'Pele de Aço',
            'Camadas de cicatrizes e couraça endurecem a carcaça física, aumentando permanentemente a Constituição.',
            'passive',
            2,
            'w_t1_heavy_blow',
            new AttributeBoostEffect('constitution', 4)
        ));

        skills.set(5, new Skill(
            'w_t2_shield_bash',
            'Investida com Escudo',
            'Avança rapidamente contra a direção mirada, atingindo os inimigos e atordoando-os por 1.2 segundos.',
            'active',
            2,
            'w_t1_iron_skin'
        ));

        skills.set(7, new Skill(
            'w_t3_war_cry',
            'Grito de Guerra',
            'Emite um rugido estarrecedor que rompe a audição dos oponentes, infligindo lentidão em área.',
            'active',
            3,
            'w_t2_shield_bash'
        ));

        skills.set(9, new Skill(
            'w_t3_colossus_vigor',
            'Vigor do Colosso',
            'A tenacidade dos gigantes flui no corpo: concede +10 de Constituição permanente.',
            'attribute',
            3,
            'w_t3_war_cry',
            new AttributeBoostEffect('constitution', 10)
        ));

        skills.set(8, new Skill(
            'w_t4_ground_slam',
            'Impacto Sísmico',
            'Golpeia o solo com força titânica, liberando uma onda de choque expansiva que atordoa os alvos.',
            'active',
            4,
            'w_t3_colossus_vigor'
        ));

        return skills;
    }
}
