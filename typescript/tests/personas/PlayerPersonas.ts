/**
 * @file PlayerPersonas.ts
 * Implementa as personas de jogadores que jogam o rpg-roguelite-game.
 * Algumas conhecem profundamente as regras, exploits e otimizações do jogo (Veteranos/Min-Maxers/Exploradores).
 * Outras jogam de forma ingênua ou intuitiva, sem conhecer as regras internas (Iniciantes/Caóticos).
 */

export interface IPlayerPersona {
    readonly name: string;
    readonly description: string;
    readonly knowsGameRules: boolean;
    decideActions(context: PersonaPlayContext): PersonaDecision;
}

export interface PersonaPlayContext {
    tick: number;
    playerHp: number;
    playerMaxHp: number;
    playerMana: number;
    playerLevel: number;
    playerPos: { x: number; y: number };
    nearbyEnemiesCount: number;
    nearestEnemyDistance: number;
    activeBroochesCount: number;
    inventoryFreeSlots: number;
    unallocatedSkillPoints: number;
}

export interface PersonaDecision {
    movement: { x: number; y: number };
    useAttack: boolean;
    useSkill: boolean;
    skillIndex?: number | undefined;
    attemptSwapWeapon: boolean;
    allocateStats?: { strength?: number; agility?: number; constitution?: number; wisdom?: number } | undefined;
    claimRewardPreference?: 'damage' | 'speed' | 'heal' | 'random' | undefined;
}

/**
 * Persona 1: Veterano Min-Maxer (Conhece profundamente as regras)
 * Sabe otimizar DPS, respeitar cooldowns, poupar mana, priorizar atributos sinérgicos
 * e manter distância ótima de combate para não sofrer dano desnecessário.
 */
export class VeteranMinMaxerPersona implements IPlayerPersona {
    public readonly name = 'Veterano Min-Maxer';
    public readonly description = 'Domina a matemática do jogo, thresholds de crítico, regeneração de mana e rotações de cooldown.';
    public readonly knowsGameRules = true;

    public decideActions(context: PersonaPlayContext): PersonaDecision {
        const isLowHp = context.playerHp < context.playerMaxHp * 0.4;
        const hasEnemies = context.nearbyEnemiesCount > 0;
        
        let moveX = 0;
        let moveY = 0;

        // Kiting tático: se inimigo muito perto (< 60px), recua; se longe (> 120px), aproxima
        if (hasEnemies) {
            if (context.nearestEnemyDistance < 60) {
                moveX = -1; // Recua
            } else if (context.nearestEnemyDistance > 120) {
                moveX = 1;  // Avança na medida certa
            }
        }

        const decision: PersonaDecision = {
            movement: { x: moveX, y: moveY },
            useAttack: hasEnemies && context.nearestEnemyDistance <= 150,
            useSkill: hasEnemies && context.playerMana >= 20,
            skillIndex: 0,
            attemptSwapWeapon: false,
            claimRewardPreference: isLowHp ? 'heal' : 'damage'
        };

        if (context.unallocatedSkillPoints > 0) {
            decision.allocateStats = { strength: 1, agility: 1 };
        }

        return decision;
    }
}

/**
 * Persona 2: Explorador & Quebrador de Regras (Conhece regras e procura bugs/limites)
 * Testa limites extremos (BVA), transições de mapa sucessivas, troca de armas em alta frequência,
 * inventário cheio e combinações bizarras de broches.
 */
export class ExploiterRuleTesterPersona implements IPlayerPersona {
    public readonly name = 'Explorador & Rule Breaker';
    public readonly description = 'Conhece as regras a fundo e tenta quebrá-las, testando condições de corrida, limites de atributos e swap constante.';
    public readonly knowsGameRules = true;

    public decideActions(context: PersonaPlayContext): PersonaDecision {
        // Tenta alternar armas agressivamente a cada tick par
        const rapidSwap = context.tick % 2 === 0;

        return {
            movement: { x: (context.tick % 3) - 1, y: ((context.tick + 1) % 3) - 1 },
            useAttack: true,
            useSkill: true,
            skillIndex: context.tick % 4,
            attemptSwapWeapon: rapidSwap,
            allocateStats: { constitution: 2 }, // Tenta forçar overflow de HP
            claimRewardPreference: 'speed'
        };
    }
}

/**
 * Persona 3: Novato Ingênuo (NÃO conhece as regras)
 * Não sabe como a estamina/mana funciona, aperta botões aleatoriamente, anda em direção
 * ao perigo mesmo com pouca vida e não aloca atributos por desconhecimento da interface.
 */
export class NaiveNovicePersona implements IPlayerPersona {
    public readonly name = 'Novato Ingênuo';
    public readonly description = 'Não conhece as regras do jogo. Anda em linha reta contra perigos, ataca o ar e ignora gerenciamento de recursos.';
    public readonly knowsGameRules = false;

    public decideActions(context: PersonaPlayContext): PersonaDecision {
        return {
            movement: { x: 1, y: 0 }, // Anda sempre em frente
            useAttack: context.tick % 5 === 0, // Bate no ar de tempos em tempos
            useSkill: false, // Não sabe usar skill
            attemptSwapWeapon: false,
            claimRewardPreference: 'random'
        };
    }
}

/**
 * Persona 4: Bot Caótico (NÃO conhece as regras / Fuzzing)
 * Realiza entradas completamente aleatórias em alta velocidade para testar resiliência
 * de estados e prevenir crashes sob inputs imprevistos.
 */
export class ChaoticFuzzerPersona implements IPlayerPersona {
    public readonly name = 'Bot Caótico (Fuzzing)';
    public readonly description = 'Gera inputs caóticos sem discernimento de regras para simular comportamentos anômalos e fuzzer.';
    public readonly knowsGameRules = false;

    public decideActions(context: PersonaPlayContext): PersonaDecision {
        const dirs: number[] = [-1, 0, 1];
        const dirX = dirs[Math.floor(Math.random() * dirs.length)] ?? 0;
        const dirY = dirs[Math.floor(Math.random() * dirs.length)] ?? 0;

        return {
            movement: {
                x: dirX,
                y: dirY
            },
            useAttack: Math.random() > 0.5,
            useSkill: Math.random() > 0.7,
            skillIndex: Math.floor(Math.random() * 3),
            attemptSwapWeapon: Math.random() > 0.8,
            claimRewardPreference: 'random'
        };
    }
}
