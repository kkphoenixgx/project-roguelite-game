import Attributes from "../ObjectModule/Entities/Attributes";

export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export interface GeneratedGlobalNode {
    id: string;
    level: 1 | 2 | 3 | 4;
    name: string;
    description: string;
    cost: number;
    rarity: Rarity;
    dependencies: string[]; // IDs
    
    // Para Níveis 1-3
    statType?: string; 
    statValue?: number;
    
    // Para Nível 4 (Broche)
    broochId?: string;
}

export interface BroochConfig {
    id: string;
    type: 'ativo' | 'passivo';
    shape: 'circle' | 'triangle'; // circle = ativo, triangle = passivo
    tags: string[]; // ex: ['fogo', 'dano'], ['sorte', 'utilidade']
    name: string;
    description: string;
}

export const RarityMultipliers: Record<Rarity, number> = {
    'comum': 1.0,
    'incomum': 1.5,
    'raro': 2.0,
    'epico': 3.0,
    'lendario': 5.0
};

export const GlobalStatPool = [
    // --- ATRIBUTOS BASE ---
    { type: 'str', category: 'base', name: 'Força', desc: 'Aumenta a Força Base', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.strength += val; } },
    { type: 'dex', category: 'base', name: 'Destreza', desc: 'Aumenta a Destreza Base', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.dexterity += val; } },
    { type: 'con', category: 'base', name: 'Constituição', desc: 'Aumenta a Constituição Base', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.constitution += val; } },
    { type: 'int', category: 'base', name: 'Inteligência', desc: 'Aumenta a Inteligência Base', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.intelligence += val; } },
    { type: 'wis', category: 'base', name: 'Sabedoria', desc: 'Aumenta a Sabedoria Base', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.wisdom += val; } },
    { type: 'cha', category: 'base', name: 'Carisma', desc: 'Aumenta o Carisma Base', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.charisma += val; } },

    // --- ATRIBUTOS DERIVADOS ---
    { type: 'hp', category: 'derived', name: 'Vida Máxima', desc: 'Aumenta a Vida Máxima', baseValue: 15, apply: (attr: Attributes, val: number) => { attr.addBonusMaxHp(val); } },
    { type: 'mana', category: 'derived', name: 'Mana Máxima', desc: 'Aumenta a Mana Máxima', baseValue: 10, apply: (attr: Attributes, val: number) => { attr.mana += val; } },
    { type: 'speed', category: 'derived', name: 'Velocidade', desc: 'Aumenta a Velocidade de Movimento', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.speed = val; } },
    { type: 'defence', category: 'derived', name: 'Defesa', desc: 'Aumenta a Defesa', baseValue: 2, apply: (attr: Attributes, val: number) => { attr.defence = val; } },
    { type: 'crit', category: 'derived', name: 'Chance Crítico', desc: 'Aumenta a Chance de Crítico', baseValue: 2, apply: (attr: Attributes, val: number) => { attr.critChance = val; } },
    { type: 'crit_dmg', category: 'derived', name: 'Dano Crítico', desc: 'Aumenta o Dano Crítico', baseValue: 10, apply: (attr: Attributes, val: number) => { attr.critDamage = val; } },
    { type: 'dodge', category: 'derived', name: 'Esquiva', desc: 'Aumenta a Chance de Esquiva', baseValue: 2, apply: (attr: Attributes, val: number) => { attr.dodge = val; } },
    { type: 'accuracy', category: 'derived', name: 'Precisão', desc: 'Aumenta a Precisão do Ataque', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.accuracy = val; } },
    { type: 'recharge', category: 'derived', name: 'Recarga', desc: 'Reduz o Tempo de Recarga (CDR)', baseValue: 3, apply: (attr: Attributes, val: number) => { attr.recharge = val; } },
    { type: 'piercing', category: 'derived', name: 'Perfuração', desc: 'Aumenta a Perfuração de Inimigos', baseValue: 1, apply: (attr: Attributes, val: number) => { attr.piercing = val; } },
    { type: 'splash', category: 'derived', name: 'Dano em Área', desc: 'Aumenta o Dano em Área', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.splashDamage = val; } },
    { type: 'tenacity', category: 'derived', name: 'Tenacidade', desc: 'Reduz o Tempo de Controle de Grupo', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.tenacity = val; } },
    { type: 'vigor', category: 'derived', name: 'Vigor', desc: 'Aumenta a Eficácia de Cura Recebida', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.vigor = val; } },
    { type: 'lucky', category: 'derived', name: 'Sorte', desc: 'Aumenta a Chance de Sorte e Crítico', baseValue: 2, apply: (attr: Attributes, val: number) => { attr.lucky = val; } },
    { type: 'insight', category: 'derived', name: 'Percepção', desc: 'Aumenta o Ganho de Experiência', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.insight = val; } },
    { type: 'lifesteal', category: 'derived', name: 'Roubo de Vida', desc: 'Cura uma porcentagem do dano causado a inimigos', baseValue: 2, apply: (attr: Attributes, val: number) => { attr.lifesteal = val; } },
    { type: 'area', category: 'derived', name: 'Área de Efeito', desc: 'Aumenta o tamanho e área de efeito dos ataques e projéteis', baseValue: 5, apply: (attr: Attributes, val: number) => { attr.bonusArea = val; } },
    { type: 'dash', category: 'derived', name: 'Cargas de Dash', desc: 'Aumenta Cargas de Dash', baseValue: 1, apply: (attr: Attributes, val: number) => { /* Handled in ActionManager */ } },

    // --- AFINIDADES ELEMENTAIS ---
    { type: 'fire_dmg', category: 'elemental', name: 'Afinidade Ígnea', desc: 'Aumenta a Potência e Dano de Fogo', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'water_dmg', category: 'elemental', name: 'Afinidade Aquática', desc: 'Aumenta a Potência e Dano de Água', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'ground_dmg', category: 'elemental', name: 'Afinidade com a Terra', desc: 'Aumenta a Potência e Dano de Terra', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'thunder_dmg', category: 'elemental', name: 'Afinidade Elétrica', desc: 'Aumenta a Potência e Dano de Trovão', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'nature_dmg', category: 'elemental', name: 'Afinidade Natural', desc: 'Aumenta a Potência e Dano da Natureza', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'light_dmg', category: 'elemental', name: 'Afinidade Sagrada', desc: 'Aumenta a Potência e Dano de Luz', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'dark_dmg', category: 'elemental', name: 'Afinidade Sombria', desc: 'Aumenta a Potência e Dano das Trevas', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'ice_dmg', category: 'elemental', name: 'Afinidade Glacial', desc: 'Aumenta a Potência e Dano de Gelo', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'air_dmg', category: 'elemental', name: 'Afinidade Eólica', desc: 'Aumenta a Potência e Dano de Vento', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'poison_dmg', category: 'elemental', name: 'Afinidade Tóxica', desc: 'Aumenta a Potência e Dano de Veneno', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'magic_dmg', category: 'elemental', name: 'Afinidade Arcana', desc: 'Aumenta a Potência e Dano Mágico Puro', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'abyss_dmg', category: 'elemental', name: 'Afinidade Abissal', desc: 'Aumenta a Potência e Dano do Abismo', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'crystal_dmg', category: 'elemental', name: 'Afinidade Cristalina', desc: 'Aumenta a Potência e Dano de Cristal', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'decay_dmg', category: 'elemental', name: 'Afinidade Decadente', desc: 'Aumenta a Potência e Dano de Podridão', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'holy_dmg', category: 'elemental', name: 'Afinidade Divina', desc: 'Aumenta a Potência e Dano Sagrado', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'infernous_dmg', category: 'elemental', name: 'Afinidade Infernal', desc: 'Aumenta a Potência e Dano Infernal', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'life_dmg', category: 'elemental', name: 'Afinidade Vital', desc: 'Aumenta a Potência e Dano de Vida', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'magma_dmg', category: 'elemental', name: 'Afinidade Vulcânica', desc: 'Aumenta a Potência e Dano de Magma', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'ordem_dmg', category: 'elemental', name: 'Afinidade Ordeira', desc: 'Aumenta a Potência e Dano de Ordem', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'potencia_dmg', category: 'elemental', name: 'Afinidade de Potência', desc: 'Aumenta a Potência Cinética e Impacto', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } },
    { type: 'caos_dmg', category: 'elemental', name: 'Afinidade Caótica', desc: 'Aumenta a Potência e Dano do Caos', baseValue: 5, apply: (attr: Attributes, val: number) => { /* Handled in damage calculation */ } }
];

export const GlobalBroochPool: BroochConfig[] = [
    // BROCHES PASSIVOS (Triangulares)
    { id: 'brooch_phoenix', type: 'passivo', shape: 'triangle', tags: ['sobrevivência', 'vida'], name: 'Broche da Fênix', description: 'Ressuscita uma vez com 50% de HP ao morrer.' },
    { id: 'brooch_titan', type: 'passivo', shape: 'triangle', tags: ['defesa', 'imunidade'], name: 'Broche do Titã', description: 'Garante imunidade a atordoamentos e empurrões.' },
    { id: 'brooch_shadow', type: 'passivo', shape: 'triangle', tags: ['agilidade', 'furtividade'], name: 'Broche das Sombras', description: 'Fica invisível e inalvejável por 3s após usar um dash.' },
    { id: 'brooch_pyro_core', type: 'passivo', shape: 'triangle', tags: ['dano', 'fogo'], name: 'Núcleo Piromante', description: 'Seus ataques normais têm 20% de chance de causar queimadura.' },
    { id: 'brooch_luck_charm', type: 'passivo', shape: 'triangle', tags: ['sorte', 'loot'], name: 'Amuleto do Leprechaun', description: 'Inimigos têm o dobro de chance de dropar itens raros.' },
    { id: 'brooch_vampiric', type: 'passivo', shape: 'triangle', tags: ['sustento', 'dano'], name: 'Dente do Vampiro', description: 'Cura 5% do HP máximo sempre que causar dano crítico.' },
    { id: 'brooch_reroll_master', type: 'passivo', shape: 'triangle', tags: ['sorte', 'utilidade'], name: 'Ampulheta do Destino', description: 'Permite roletar as opções de recompensa ao subir de nível até 3 vezes por run.' },

    // BROCHES ATIVOS (Redondos)
    { id: 'brooch_active_heal', type: 'ativo', shape: 'circle', tags: ['cura', 'vida'], name: 'Cálice da Vida', description: 'Ativo: Cura 30% da Vida Máxima. Recarga: 60s.' },
    { id: 'brooch_active_meteor', type: 'ativo', shape: 'circle', tags: ['dano', 'fogo'], name: 'Chamado do Meteoro', description: 'Ativo: Evoca um meteoro na posição do cursor causando dano em área massivo. Recarga: 90s.' },
    { id: 'brooch_active_luck', type: 'ativo', shape: 'circle', tags: ['sorte', 'buff'], name: 'Dados da Fortuna', description: 'Ativo: Aumenta a Sorte e Evasão em 100% por 10 segundos. Recarga: 45s.' },
    { id: 'brooch_active_dash', type: 'ativo', shape: 'circle', tags: ['agilidade', 'mobilidade'], name: 'Botas Aladas', description: 'Ativo: Reseta instantaneamente todas as cargas de dash. Recarga: 30s.' },
    { id: 'brooch_active_shield', type: 'ativo', shape: 'circle', tags: ['defesa', 'escudo'], name: 'Barreira de Cristal', description: 'Ativo: Cria um escudo que absorve 100% de dano nos próximos 3 hits. Recarga: 60s.' },
    { id: 'brooch_active_berserk', type: 'ativo', shape: 'circle', tags: ['dano', 'buff'], name: 'Fúria do Berserker', description: 'Ativo: Aumenta o dano em 50% e reduz a defesa a zero por 8 segundos. Recarga: 120s.' }
];
