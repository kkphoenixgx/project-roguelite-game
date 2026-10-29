import type { SpriteConfig } from "../components/renderModule/visuals/GameObjectElement"; 

// <!-- ASSETS_ADAPTER_IMPORTS_START -->
// <!-- ASSETS_ADAPTER_IMPORTS_END -->

export type VisualCategory = 'entity' | 'equipment' | 'weapon' | 'projectile' | 'vfx';

export interface BaseVisualConfig {
    category: VisualCategory;
    animations: Record<string, SpriteConfig>;
}
export interface EntityVisualConfig extends BaseVisualConfig {
    category: 'entity';
}
export interface ItemVisualConfig extends BaseVisualConfig {
    category: 'equipment' | 'weapon';
    iconId: number;
    uiIconUrl: string;
    droppedConfig: SpriteConfig;
}
export interface ProjectileVisualConfig extends BaseVisualConfig {
    category: 'projectile';
}
export interface VFXVisualConfig extends BaseVisualConfig {
    category: 'vfx';
}
export interface EffectIconEntry {
    id: string;
    name: string;
    domainFile: string;
    icon32Url: string;
    icon64Url: string;
    description: string;
}

export type ElementalEffectKey =
    | 'abys'
    | 'air'
    | 'crystal'
    | 'dark'
    | 'decay'
    | 'fire'
    | 'ground'
    | 'holy'
    | 'ice'
    | 'infernous'
    | 'life'
    | 'light'
    | 'magic'
    | 'magma'
    | 'nature'
    | 'negation'
    | 'ordem'
    | 'poison'
    | 'potencia'
    | 'thunder'
    | 'water';

export const ElementalEffectIcons = {
    'abys': {
        id: 'abys',
        name: 'Abys',
        domainFile: 'AbysEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_abys.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_abys_x2.png', import.meta.url).href,
        description: 'Olho cósmico abissal envolto em tentáculos do vazio roxo-escuro e fendas dimensionais.'
    },
    'air': {
        id: 'air',
        name: 'Air',
        domainFile: 'AirEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_air.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_air_x2.png', import.meta.url).href,
        description: 'Redemoinho centrífugo de lâminas de vento curvas e afiadas em ciano translúcido.'
    },
    'crystal': {
        id: 'crystal',
        name: 'Crystal',
        domainFile: 'CrystalEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_crystal.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_crystal_x2.png', import.meta.url).href,
        description: 'Prisma octaédrico multifacetado em magenta e ciano irradiando 8 estilhaços angulares.'
    },
    'dark': {
        id: 'dark',
        name: 'Dark',
        domainFile: 'DarkEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_dark.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_dark_x2.png', import.meta.url).href,
        description: 'Eclipse de lua negra com coroa de chamas sombrias profanas e pupila espectral púrpura.'
    },
    'decay': {
        id: 'decay',
        name: 'Decay',
        domainFile: 'DecayEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_decay.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_decay_x2.png', import.meta.url).href,
        description: 'Crânio cadavérico decrépito com musgo necrótico e volutas de vapores pútridos.'
    },
    'fire': {
        id: 'fire',
        name: 'Fire',
        domainFile: 'FireEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_fire.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_fire_x2.png', import.meta.url).href,
        description: 'Fogo elemental vivo crepitante em carmesim ardente (#dc2626) e âmbar incandescente.'
    },
    'ground': {
        id: 'ground',
        name: 'Ground',
        domainFile: 'GroundEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_ground.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_ground_x2.png', import.meta.url).href,
        description: 'Monólitos pontiagudos de rocha granítica partindo o solo em fissuras telúricas douradas.'
    },
    'holy': {
        id: 'holy',
        name: 'Holy',
        domainFile: 'HolyEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_holy.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_holy_x2.png', import.meta.url).href,
        description: 'Cruz sagrada radiante de ouro antigo (#FFD700) sob auréola divina de raios solares.'
    },
    'ice': {
        id: 'ice',
        name: 'Ice',
        domainFile: 'IceEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_ice.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_ice_x2.png', import.meta.url).href,
        description: 'Floco glacial hexagonal com espinhos congelantes de gelo ártico e reflexos brancos.'
    },
    'infernous': {
        id: 'infernous',
        name: 'Infernous',
        domainFile: 'InfernousEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_infernous.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_infernous_x2.png', import.meta.url).href,
        description: 'Olho demoníaco em fenda vertical envolto por labaredas de enxofre e chamas infernais.'
    },
    'life': {
        id: 'life',
        name: 'Life',
        domainFile: 'LifeEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_life.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_life_x2.png', import.meta.url).href,
        description: 'Coração carmesim vital pulsante com brotos de folhas verdes de renovação e cura.'
    },
    'light': {
        id: 'light',
        name: 'Light',
        domainFile: 'LightEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_light.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_light_x2.png', import.meta.url).href,
        description: 'Estrela primordial de 8 pontas em expansão explosiva irradiando feixes de luz pura.'
    },
    'magic': {
        id: 'magic',
        name: 'Magic',
        domainFile: 'MagicEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_magic.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_magic_x2.png', import.meta.url).href,
        description: 'Orbe místico com anéis astrais orbitais inclinados e runas arcanas cósmicas.'
    },
    'magma': {
        id: 'magma',
        name: 'Magma',
        domainFile: 'MagmaEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_magma.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_magma_x2.png', import.meta.url).href,
        description: 'Rocha basáltica vulcânica escura cortada por veias de lava incandescente borbulhante.'
    },
    'nature': {
        id: 'nature',
        name: 'Nature',
        domainFile: 'NatureEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_nature.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_nature_x2.png', import.meta.url).href,
        description: 'Par de folhas florestais entrelaçadas em cipó selvagem espinhoso com flor ancestral.'
    },
    'negation': {
        id: 'negation',
        name: 'Negation',
        domainFile: 'NegationEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_negation.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_negation_x2.png', import.meta.url).href,
        description: 'Selo rúnico mágico circular sendo quebrado diagonalmente por lâmina de antimagia.'
    },
    'ordem': {
        id: 'ordem',
        name: 'Ordem',
        domainFile: 'OrdemEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_ordem.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_ordem_x2.png', import.meta.url).href,
        description: 'Balança celestial de equilíbrio cósmico perfeito em ouro divino e losango superior.'
    },
    'poison': {
        id: 'poison',
        name: 'Poison',
        domainFile: 'PoisonEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_poison.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_poison_x2.png', import.meta.url).href,
        description: 'Frasco alquímico de vidro verde ácido vertendo veneno peçonhento com bolhas cáusticas.'
    },
    'potencia': {
        id: 'potencia',
        name: 'Potencia',
        domainFile: 'PotenciaEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_potencia.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_potencia_x2.png', import.meta.url).href,
        description: 'Punho cinético blindado com anéis concêntricos de choque e faíscas de impacto violento.'
    },
    'thunder': {
        id: 'thunder',
        name: 'Thunder',
        domainFile: 'ThunderEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_thunder.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_thunder_x2.png', import.meta.url).href,
        description: 'Nuvem de tempestade escura descarregando raio duplo bifurcado em amarelo elétrico.'
    },
    'water': {
        id: 'water',
        name: 'Water',
        domainFile: 'WaterEffect.ts',
        icon32Url: new URL('../assets/icons/effects/effect_water.png', import.meta.url).href,
        icon64Url: new URL('../assets/icons/effects/effect_water_x2.png', import.meta.url).href,
        description: 'Onda em crista espiral de água líquida azul marinho gerando respingos e gotas fluidas.'
    }
} satisfies Record<ElementalEffectKey, EffectIconEntry>;

/* ================== ÍCONES DE HABILIDADES & BROCHES ATIVOS ================== */
export type SkillNodeType = 'active' | 'passive' | 'attribute' | 'essential' | 'rare';

export interface SkillIconEntry {
    id: string;
    name: string;
    classId: 'warrior' | 'necromancer' | 'mage' | 'fisherman' | 'gunslinger' | 'brooch';
    nodeType: SkillNodeType;
    icon40Url: string;
    icon80Url: string;
    description: string;
}

export type SkillIconKey =
  /* Guerreiro */
    | 'w_t1_strike' | 'w_t1_heavy_blow' | 'w_t1_iron_skin' | 'w_t2_cleave'
    | 'w_t2_shield_bash' | 'w_t3_berserk' | 'w_t3_war_cry' | 'w_t4_ground_slam'
    | 'w_t3_colossus_vigor' | 'w_t5_blade_dance' | 'w_t4_armor_breaker' | 'w_t5_avatar_of_war'
  /* Necromante */
    | 'n_t1_reap' | 'n_t1_death_aura' | 'n_t1_soul_leech' | 'n_t2_lifesteal'
    | 'n_t2_bone_spear' | 'n_t3_soul' | 'n_t3_grasp_of_dead' | 'n_t4_corpse_explosion'
    | 'n_t3_spectral_veil' | 'n_t5_wail_of_banshee' | 'n_t4_death_warden' | 'n_t5_dance_of_dead'
  /* Mago */
    | 'm_t1_fireball' | 'm_t2_burn' | 'm_t3_knowledge' | 'm_t4_teleport' | 'm_t5_blackhole'
  /* Pescador */
    | 'pesc_t1_fisgada' | 'pesc_t2_net' | 'pesc_t3_leviata' | 'pesc_t4_fishpet'
  /* Pistoleiro */
    | 'gs_t1_quickdraw' | 'gs_t2_fanhammer' | 'gs_t3_deadeye'
  /* Broches Ativos */
    | 'brooch_active_heal' | 'brooch_active_meteor' | 'brooch_active_luck' | 'brooch_active_dash'
    | 'brooch_active_shield' | 'brooch_active_berserk'
  /* Broches Passivos */
    | 'brooch_titan' | 'brooch_shadow' | 'brooch_pyro_core' | 'brooch_luck_charm'
    | 'brooch_vampiric' | 'brooch_reroll_master' | 'brooch_phoenix';

export const SkillIcons = {
  /* Guerreiro */
    'w_t1_strike': {
        id: 'w_t1_strike',
        name: 'Força Bruta',
        classId: 'warrior',
        nodeType: 'attribute',
        icon40Url: new URL('../assets/icons/skills/w_t1_strike.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t1_strike_x2.png', import.meta.url).href,
        description: 'Força Bruta: Incrementos permanentes de força e vigor.'
    },
    'w_t1_heavy_blow': {
        id: 'w_t1_heavy_blow',
        name: 'Pancada Pesada',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t1_heavy_blow.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t1_heavy_blow_x2.png', import.meta.url).href,
        description: 'Pancada Pesada: Corte vertical frontal pesado de aço no solo gerando atordoamento.'
    },
    'w_t1_iron_skin': {
        id: 'w_t1_iron_skin',
        name: 'Pele de Aço',
        classId: 'warrior',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/w_t1_iron_skin.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t1_iron_skin_x2.png', import.meta.url).href,
        description: 'Pele de Aço: Aumenta a armadura física e reduz dano recebido.'
    },
    'w_t2_cleave': {
        id: 'w_t2_cleave',
        name: 'Turbilhão de Aço',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t2_cleave.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t2_cleave_x2.png', import.meta.url).href,
        description: 'Turbilhão de Aço: Golpe giratório em 360° cortando todos os inimigos ao redor.'
    },
    'w_t2_shield_bash': {
        id: 'w_t2_shield_bash',
        name: 'Investida com Escudo',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t2_shield_bash.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t2_shield_bash_x2.png', import.meta.url).href,
        description: 'Investida com Escudo: Avança contra o alvo aplicando repulsão e atordoamento.'
    },
    'w_t3_berserk': {
        id: 'w_t3_berserk',
        name: 'Fúria de Batalha',
        classId: 'warrior',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/w_t3_berserk.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t3_berserk_x2.png', import.meta.url).href,
        description: 'Fúria de Batalha: Aumenta a velocidade de ataque à medida que a vida diminui.'
    },
    'w_t3_war_cry': {
        id: 'w_t3_war_cry',
        name: 'Grito de Guerra',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t3_war_cry.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t3_war_cry_x2.png', import.meta.url).href,
        description: 'Grito de Guerra: Intimida adversários e eleva o poder de combate temporariamente.'
    },
    'w_t4_ground_slam': {
        id: 'w_t4_ground_slam',
        name: 'Impacto Sísmico',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t4_ground_slam.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t4_ground_slam_x2.png', import.meta.url).href,
        description: 'Impacto Sísmico: Fissura as rochas e gera ondas de choque devastadoras.'
    },
    'w_t3_colossus_vigor': {
        id: 'w_t3_colossus_vigor',
        name: 'Vigor do Colosso',
        classId: 'warrior',
        nodeType: 'attribute',
        icon40Url: new URL('../assets/icons/skills/w_t3_colossus_vigor.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t3_colossus_vigor_x2.png', import.meta.url).href,
        description: 'Vigor do Colosso: Bônus massivo permanente de constituição e vida máxima.'
    },
    'w_t5_blade_dance': {
        id: 'w_t5_blade_dance',
        name: 'Dança das Lâminas',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t5_blade_dance.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t5_blade_dance_x2.png', import.meta.url).href,
        description: 'Dança das Lâminas: Sequência acrobática fulminante de cortes lacerantes.'
    },
    'w_t4_armor_breaker': {
        id: 'w_t4_armor_breaker',
        name: 'Quebrador de Armaduras',
        classId: 'warrior',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/w_t4_armor_breaker.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t4_armor_breaker_x2.png', import.meta.url).href,
        description: 'Quebrador de Armaduras: Golpes ignoram parte da resistência e partem couraças.'
    },
    'w_t5_avatar_of_war': {
        id: 'w_t5_avatar_of_war',
        name: 'Avatar da Guerra',
        classId: 'warrior',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/w_t5_avatar_of_war.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/w_t5_avatar_of_war_x2.png', import.meta.url).href,
        description: 'Avatar da Guerra: Manifestação suprema da fúria marcial com imunidade temporária.'
    },

  /* Necromante */
    'n_t1_reap': {
        id: 'n_t1_reap',
        name: 'Colheita Sombria',
        classId: 'necromancer',
        nodeType: 'essential',
        icon40Url: new URL('../assets/icons/skills/n_t1_reap.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t1_reap_x2.png', import.meta.url).href,
        description: 'Colheita Sombria: Golpe primordial com foice espectral colhendo a essência dos vivos.'
    },
    'n_t1_death_aura': {
        id: 'n_t1_death_aura',
        name: 'Presença Fúnebre',
        classId: 'necromancer',
        nodeType: 'attribute',
        icon40Url: new URL('../assets/icons/skills/n_t1_death_aura.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t1_death_aura_x2.png', import.meta.url).href,
        description: 'Presença Fúnebre: Eleva permanentemente a afinidade mágica e poder necromântico.'
    },
    'n_t1_soul_leech': {
        id: 'n_t1_soul_leech',
        name: 'Dreno Vital',
        classId: 'necromancer',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/n_t1_soul_leech.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t1_soul_leech_x2.png', import.meta.url).href,
        description: 'Dreno Vital: Absorve parcelas de vida dos inimigos derrotados.'
    },
    'n_t2_lifesteal': {
        id: 'n_t2_lifesteal',
        name: 'Sede de Sangue',
        classId: 'necromancer',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/n_t2_lifesteal.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t2_lifesteal_x2.png', import.meta.url).href,
        description: 'Sede de Sangue: Converte porcentagem do dano infligido em regeneração imediata.'
    },
    'n_t2_bone_spear': {
        id: 'n_t2_bone_spear',
        name: 'Lança de Ossos',
        classId: 'necromancer',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/n_t2_bone_spear.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t2_bone_spear_x2.png', import.meta.url).href,
        description: 'Lança de Ossos: Projétil perfurante de ossos pontiagudos que atravessa múltiplos alvos.'
    },
    'n_t3_soul': {
        id: 'n_t3_soul',
        name: 'Ascensão do Lich',
        classId: 'necromancer',
        nodeType: 'rare',
        icon40Url: new URL('../assets/icons/skills/n_t3_soul.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t3_soul_x2.png', import.meta.url).href,
        description: 'Ascensão do Lich: Especialização de ápice transcendental da necromancia arcana.'
    },
    'n_t3_grasp_of_dead': {
        id: 'n_t3_grasp_of_dead',
        name: 'Garras do Além',
        classId: 'necromancer',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/n_t3_grasp_of_dead.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t3_grasp_of_dead_x2.png', import.meta.url).href,
        description: 'Garras do Além: Mãos esqueléticas brotam do solo para aprisionar e danificar alvos.'
    },
    'n_t4_corpse_explosion': {
        id: 'n_t4_corpse_explosion',
        name: 'Explosão Sombria',
        classId: 'necromancer',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/n_t4_corpse_explosion.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t4_corpse_explosion_x2.png', import.meta.url).href,
        description: 'Explosão Sombria: Detonação violenta de energias cadavéricas em área.'
    },
    'n_t3_spectral_veil': {
        id: 'n_t3_spectral_veil',
        name: 'Manto Espectral',
        classId: 'necromancer',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/n_t3_spectral_veil.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t3_spectral_veil_x2.png', import.meta.url).href,
        description: 'Manto Espectral: Concede chance de esquiva contra projéteis e golpes mágicos.'
    },
    'n_t5_wail_of_banshee': {
        id: 'n_t5_wail_of_banshee',
        name: 'Clamor da Banshee',
        classId: 'necromancer',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/n_t5_wail_of_banshee.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t5_wail_of_banshee_x2.png', import.meta.url).href,
        description: 'Clamor da Banshee: Onda sônica espectral desorientadora em cone frontal.'
    },
    'n_t4_death_warden': {
        id: 'n_t4_death_warden',
        name: 'Mestre da Morte',
        classId: 'necromancer',
        nodeType: 'attribute',
        icon40Url: new URL('../assets/icons/skills/n_t4_death_warden.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t4_death_warden_x2.png', import.meta.url).href,
        description: 'Mestre da Morte: Bônus permanente de inteligência e domínio de mortos-vivos.'
    },
    'n_t5_dance_of_dead': {
        id: 'n_t5_dance_of_dead',
        name: 'Dança das Almas',
        classId: 'necromancer',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/n_t5_dance_of_dead.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/n_t5_dance_of_dead_x2.png', import.meta.url).href,
        description: 'Dança das Almas: Turbilhão de espíritos vingativos orbitando e dilacerando os inimigos.'
    },

  /* Mago / Axiomante */
    'm_t1_fireball': {
        id: 'm_t1_fireball',
        name: 'Axioma Inicial',
        classId: 'mage',
        nodeType: 'essential',
        icon40Url: new URL('../assets/icons/skills/m_t1_fireball.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/m_t1_fireball_x2.png', import.meta.url).href,
        description: 'Axioma Inicial: Esfera ígnea condensada detonando no primeiro impacto.'
    },
    'm_t2_burn': {
        id: 'm_t2_burn',
        name: 'Sobrecarga de Mana',
        classId: 'mage',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/m_t2_burn.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/m_t2_burn_x2.png', import.meta.url).href,
        description: 'Sobrecarga de Mana: Feitiços aplicam queima contínua com mana residual.'
    },
    'm_t3_knowledge': {
        id: 'm_t3_knowledge',
        name: 'Erudição',
        classId: 'mage',
        nodeType: 'attribute',
        icon40Url: new URL('../assets/icons/skills/m_t3_knowledge.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/m_t3_knowledge_x2.png', import.meta.url).href,
        description: 'Erudição: Incremento permanente em inteligência e regeneração de mana.'
    },
    'm_t4_teleport': {
        id: 'm_t4_teleport',
        name: 'Translocação (Blink)',
        classId: 'mage',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/m_t4_teleport.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/m_t4_teleport_x2.png', import.meta.url).href,
        description: 'Translocação (Blink): Salto espacial instantâneo escapando do alcance de perigo.'
    },
    'm_t5_blackhole': {
        id: 'm_t5_blackhole',
        name: 'Buraco Negro',
        classId: 'mage',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/m_t5_blackhole.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/m_t5_blackhole_x2.png', import.meta.url).href,
        description: 'Buraco Negro: Colapsa o espaço-tempo em uma singularidade de gravidade devastadora que atrai e esmaga inimigos.'
    },

  /* Pescador */
    'pesc_t1_fisgada': {
        id: 'pesc_t1_fisgada',
        name: 'Fisgada Perfeita',
        classId: 'fisherman',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/skills/pesc_t1_fisgada.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/pesc_t1_fisgada_x2.png', import.meta.url).href,
        description: 'Fisgada Perfeita: Golpes causam dano crítico adicional e puxam alvos leves.'
    },
    'pesc_t2_net': {
        id: 'pesc_t2_net',
        name: 'Rede Pesada',
        classId: 'fisherman',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/pesc_t2_net.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/pesc_t2_net_x2.png', import.meta.url).href,
        description: 'Rede Pesada: Lança uma rede com chumbo imobilizando inimigos na área.'
    },
    'pesc_t3_leviata': {
        id: 'pesc_t3_leviata',
        name: 'Fúria do Leviatã',
        classId: 'fisherman',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/pesc_t3_leviata.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/pesc_t3_leviata_x2.png', import.meta.url).href,
        description: 'Fúria do Leviatã: Evoca a criatura das profundezas para esmagar a área.'
    },
    'pesc_t4_fishpet': {
        id: 'pesc_t4_fishpet',
        name: 'Peixinho de Combate',
        classId: 'fisherman',
        nodeType: 'essential',
        icon40Url: new URL('../assets/icons/skills/pesc_t4_fishpet.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/pesc_t4_fishpet_x2.png', import.meta.url).href,
        description: 'Peixinho de Combate: Companheiro marinho com capacete e mini-lança de combate.'
    },

  /* Pistoleiro */
    'gs_t1_quickdraw': {
        id: 'gs_t1_quickdraw',
        name: 'Saque Rápido',
        classId: 'gunslinger',
        nodeType: 'essential',
        icon40Url: new URL('../assets/icons/skills/gs_t1_quickdraw.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/gs_t1_quickdraw_x2.png', import.meta.url).href,
        description: 'Saque Rápido: Disparo reflexo imediato ao avistar alvos prioritários.'
    },
    'gs_t2_fanhammer': {
        id: 'gs_t2_fanhammer',
        name: 'Fan the Hammer',
        classId: 'gunslinger',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/skills/gs_t2_fanhammer.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/gs_t2_fanhammer_x2.png', import.meta.url).href,
        description: 'Fan the Hammer: Rajada ultrarrápida descarregando todo o tambor do revólver.'
    },
    'gs_t3_deadeye': {
        id: 'gs_t3_deadeye',
        name: 'Caminho do Franco-Atirador',
        classId: 'gunslinger',
        nodeType: 'rare',
        icon40Url: new URL('../assets/icons/skills/gs_t3_deadeye.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/skills/gs_t3_deadeye_x2.png', import.meta.url).href,
        description: 'Caminho do Franco-Atirador: Ponto de inflexão para precisão cirúrgica de longo alcance.'
    },

  /* Broches Ativos Globais */
    'brooch_active_heal': {
        id: 'brooch_active_heal',
        name: 'Cálice da Vida',
        classId: 'brooch',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/brooches/brooch_active_heal.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_active_heal_x2.png', import.meta.url).href,
        description: 'Cálice da Vida: Cura instantaneamente 30% da vida máxima do personagem.'
    },
    'brooch_active_meteor': {
        id: 'brooch_active_meteor',
        name: 'Chamado do Meteoro',
        classId: 'brooch',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/brooches/brooch_active_meteor.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_active_meteor_x2.png', import.meta.url).href,
        description: 'Chamado do Meteoro: Impacto astral flamejante devastando todos os inimigos na área.'
    },
    'brooch_active_luck': {
        id: 'brooch_active_luck',
        name: 'Dados da Fortuna',
        classId: 'brooch',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/brooches/brooch_active_luck.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_active_luck_x2.png', import.meta.url).href,
        description: 'Dados da Fortuna: Dobra a sorte e a chance de esquiva temporariamente.'
    },
    'brooch_active_dash': {
        id: 'brooch_active_dash',
        name: 'Botas Aladas',
        classId: 'brooch',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/brooches/brooch_active_dash.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_active_dash_x2.png', import.meta.url).href,
        description: 'Botas Aladas: Reseta instantaneamente todas as cargas de esquiva e concede aceleração.'
    },
    'brooch_active_shield': {
        id: 'brooch_active_shield',
        name: 'Barreira de Cristal',
        classId: 'brooch',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/brooches/brooch_active_shield.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_active_shield_x2.png', import.meta.url).href,
        description: 'Barreira de Cristal: Cria um escudo prismático que absorve 100% de dano nos próximos 3 hits.'
    },
    'brooch_active_berserk': {
        id: 'brooch_active_berserk',
        name: 'Fúria do Berserker',
        classId: 'brooch',
        nodeType: 'active',
        icon40Url: new URL('../assets/icons/brooches/brooch_active_berserk.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_active_berserk_x2.png', import.meta.url).href,
        description: 'Fúria do Berserker: Aumenta o dano em 50% e reduz a defesa a zero por 8 segundos.'
    },

  /* Broches Passivos Globais */
    'brooch_titan': {
        id: 'brooch_titan',
        name: 'Broche do Titã',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_titan.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_titan_x2.png', import.meta.url).href,
        description: 'Broche do Titã: Concede imunidade inabalável a atordoamentos e empurrões.'
    },
    'brooch_shadow': {
        id: 'brooch_shadow',
        name: 'Broche das Sombras',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_shadow.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_shadow_x2.png', import.meta.url).href,
        description: 'Broche das Sombras: Concede invisibilidade e inalvejabilidade por 3s após usar um dash.'
    },
    'brooch_pyro_core': {
        id: 'brooch_pyro_core',
        name: 'Núcleo Piromante',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_pyro_core.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_pyro_core_x2.png', import.meta.url).href,
        description: 'Núcleo Piromante: Seus ataques normais têm 20% de chance de causar queimadura incandescente.'
    },
    'brooch_luck_charm': {
        id: 'brooch_luck_charm',
        name: 'Amuleto do Leprechaun',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_luck_charm.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_luck_charm_x2.png', import.meta.url).href,
        description: 'Amuleto do Leprechaun: Inimigos têm o dobro de chance de dropar itens valiosos e raros.'
    },
    'brooch_vampiric': {
        id: 'brooch_vampiric',
        name: 'Dente do Vampiro',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_vampiric.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_vampiric_x2.png', import.meta.url).href,
        description: 'Dente do Vampiro: Cura 5% do HP máximo sempre que desferir um golpe crítico.'
    },
    'brooch_reroll_master': {
        id: 'brooch_reroll_master',
        name: 'Ampulheta do Destino',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_reroll_master.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_reroll_master_x2.png', import.meta.url).href,
        description: 'Ampulheta do Destino: Permite roletar as opções de recompensa ao subir de nível até 3 vezes por run.'
    },
    'brooch_phoenix': {
        id: 'brooch_phoenix',
        name: 'Broche da Fênix',
        classId: 'brooch',
        nodeType: 'passive',
        icon40Url: new URL('../assets/icons/brooches/brooch_phoenix.png', import.meta.url).href,
        icon80Url: new URL('../assets/icons/brooches/brooch_phoenix_x2.png', import.meta.url).href,
        description: 'Broche da Fênix: Ressuscita uma vez com 50% de HP ao sofrer dano letal.'
    }
} satisfies Record<SkillIconKey, SkillIconEntry>;

export interface MapVisualConfig {
    category: 'map';
    chunkSize: number;
    chunks: string[][];
    collisionJsonUrl?: string;
    originChunk?: { cx: number; cy: number };
}
export type AnyVisualConfig = EntityVisualConfig | ItemVisualConfig | ProjectileVisualConfig | VFXVisualConfig | MapVisualConfig;

// <!-- ASSETS_ADAPTER_CHUNKS_START:vilgem -->
const vilgemChunks: string[][] = [
    [
        new URL('../assets/maps/vilgem/chunk_r4_c0.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/chunk_r4_c0.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href
    ],
    [
        new URL('../assets/maps/vilgem/chunk_r0_c1.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/chunk_r0_c1.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/chunk_r0_c2.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/chunk_r0_c1.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/chunk_r0_c3.png', import.meta.url).href
    ],
    [
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href
    ],
    [
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/chunk_r3_c2_baked_1793045534063.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href
    ],
    [
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href
    ],
    [
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
        new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href
    ]
];
// <!-- ASSETS_ADAPTER_CHUNKS_END:vilgem -->

// <!-- ASSETS_ADAPTER_CONSTS_START -->
// <!-- ASSETS_ADAPTER_CONSTS_END -->

export const VisualConfigMap: Record<string, AnyVisualConfig> = {
   
/* ================== MAPAS ================== */
    'vilgem': {
        category: 'map',
        chunkSize: 1024,
        chunks: vilgemChunks,
        originChunk: { cx: 2, cy: 3 },
        collisionJsonUrl: new URL('../assets/maps/collision-layers/vilgem_hitboxes.json', import.meta.url).href
    },
    'interior_black_default': {
        category: 'map',
        chunkSize: 1024,
        chunks: [
            [
                new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href,
                new URL('../assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href
            ]
        ]
    },

/* ================== ENTIDADES (Corpos) ================== */
    'player': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/player/player-idle.png', import.meta.url).href, frameCount: 2, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/player/player-idle.png', import.meta.url).href, frameCount: 2, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'roll': { imageSrc: new URL('../assets/entities/player/player-roll.png', import.meta.url).href, frameCount: 8, animationSpeed: 2, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'dodge': { imageSrc: new URL('../assets/entities/player/player-roll.png', import.meta.url).href, frameCount: 8, animationSpeed: 2, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'dead': { imageSrc: new URL('../assets/entities/player/player-idle.png', import.meta.url).href, frameCount: 2, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'slime': {
        category: 'entity',
        animations: {
            'waiting': { imageSrc: new URL('../assets/entities/enemies/slime-green-walk.png', import.meta.url).href, frameCount: 8, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/enemies/slime-green-walk.png', import.meta.url).href, frameCount: 8, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'circle': {
        category: 'entity',
        animations: { 'normal': { imageSrc: '', frameCount: 1, animationSpeed: 1, frameWidth: 1, frameHeight: 1 } }
    },
    'shadowMob': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/enemies/shadowMob-waiting.png', import.meta.url).href, frameCount: 9, animationSpeed: 4, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/enemies/shadowMob-waiting.png', import.meta.url).href, frameCount: 9, animationSpeed: 4, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'dead': { imageSrc: new URL('../assets/entities/enemies/shadowMob-waiting.png', import.meta.url).href, frameCount: 9, animationSpeed: 4, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 64, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'fishPet': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/pet-fish.png', import.meta.url).href, frameCount: 3, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/pet-fish.png', import.meta.url).href, frameCount: 3, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } }
        }
    },
    'spawn-leviatã': {
        category: 'entity',
        animations: {
            'spawn': { 
                imageSrc: new URL('../assets/entities/spawn-leviata.png', import.meta.url).href, 
                frameCount: 19, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'spawn-leviata': {
        category: 'entity',
        animations: {
            'spawn': { 
                imageSrc: new URL('../assets/entities/spawn-leviata.png', import.meta.url).href, 
                frameCount: 19, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'environmentCollider': {
        category: 'entity',
        animations: {
            'static': { 
    //? Imagem de 1px transparente para renderização de hitboxes em modo debug sem custo de GPU
                imageSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 
                frameCount: 1, animationSpeed: 1, 
                frameWidth: 1, frameHeight: 1, 
                atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 1, height: 1 } 
            }
        }
    },

/* ================== CENÁRIO & PROPS DE ALVORADA DE VILGEM ================== */
    'fountain_awakening': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/fountain/fountain_awakening_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 170, frameHeight: 165, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 170, height: 165 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/fountain/fountain_awakening_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 170, frameHeight: 165, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 170, height: 165 } }
        }
    },
    'house_red_boro': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_red_boro_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 12, frameWidth: 305, frameHeight: 354, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 305, height: 354 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_red_boro_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 12, frameWidth: 305, frameHeight: 354, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 305, height: 354 } }
        }
    },
    'house_blue_leda': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_blue_leda_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 327, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 327 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_blue_leda_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 327, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 327 } }
        }
    },
    'house_forge_garret': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_forge_garret_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 280, frameHeight: 298, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 280, height: 298 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_forge_garret_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 280, frameHeight: 298, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 280, height: 298 } }
        }
    },
    'house_inn_mara': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_inn_mara_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 290, frameHeight: 284, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 290, height: 284 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_inn_mara_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 290, frameHeight: 284, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 290, height: 284 } }
        }
    },
    'market_stall_red': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/market/market_stall_red_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 14, frameWidth: 86, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 86, height: 93 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/market/market_stall_red_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 14, frameWidth: 86, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 86, height: 93 } }
        }
    },
    'market_stall_green': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/market/market_stall_green_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 14, frameWidth: 90, frameHeight: 90, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 90 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/market/market_stall_green_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 14, frameWidth: 90, frameHeight: 90, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 90 } }
        }
    },
    'market_stall_blue': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/market/market_stall_blue_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 86, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 86, height: 93 } },
            'idle': { imageSrc: new URL('../assets/scenery/market/market_stall_blue_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 86, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 86, height: 93 } }
        }
    },
    'market_stall_purple': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/market/market_stall_purple_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 86, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 86, height: 93 } },
            'idle': { imageSrc: new URL('../assets/scenery/market/market_stall_purple_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 86, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 86, height: 93 } }
        }
    },
    'market_tent_canopy': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/market/market_tent_canopy_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 178, frameHeight: 152, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 178, height: 152 } },
            'idle': { imageSrc: new URL('../assets/scenery/market/market_tent_canopy_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 178, frameHeight: 152, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 178, height: 152 } }
        }
    },
    'market_crate_apples': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/market/market_crate_apples_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 93, frameHeight: 90, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 93, height: 90 } },
            'idle': { imageSrc: new URL('../assets/scenery/market/market_crate_apples_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 93, frameHeight: 90, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 93, height: 90 } }
        }
    },
    'market_crate_fish': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/market/market_crate_fish_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 90, frameHeight: 69, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 69 } },
            'idle': { imageSrc: new URL('../assets/scenery/market/market_crate_fish_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 90, frameHeight: 69, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 69 } }
        }
    },
    'street_lantern': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/props/street_lantern_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 35, frameHeight: 78, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 35, height: 78 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/props/street_lantern_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 35, frameHeight: 78, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 35, height: 78 } }
        }
    },
    'wooden_bench': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_bench_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 54, frameHeight: 50, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 54, height: 50 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_bench_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 54, frameHeight: 50, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 54, height: 50 } }
        }
    },
    'marble_bench': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/marble_bench_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 54, frameHeight: 50, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 54, height: 50 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/marble_bench_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 54, frameHeight: 50, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 54, height: 50 } }
        }
    },
    'marble_planter_urn': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/marble_planter_urn_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 50, frameHeight: 52, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 50, height: 52 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/marble_planter_urn_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 50, frameHeight: 52, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 50, height: 52 } }
        }
    },
    'marble_street_lantern': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/marble_street_lantern_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 35, frameHeight: 78, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 35, height: 78 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/marble_street_lantern_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 35, frameHeight: 78, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 35, height: 78 } }
        }
    },
    'marble_murette_low': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/marble_murette_low_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 140, frameHeight: 99, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 140, height: 99 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/marble_murette_low_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 140, frameHeight: 99, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 140, height: 99 } }
        }
    },
    'barrel_stack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/barrel_stack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 66, frameHeight: 52, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 66, height: 52 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/barrel_stack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 66, frameHeight: 52, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 66, height: 52 } }
        }
    },
    'barrel_single': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/barrel_single_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 28, frameHeight: 36, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 28, height: 36 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/barrel_single_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 28, frameHeight: 36, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 28, height: 36 } }
        }
    },
    'barrel_lying': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/barrel_lying_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 34, frameHeight: 26, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 34, height: 26 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/barrel_lying_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 34, frameHeight: 26, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 34, height: 26 } }
        }
    },
    'wooden_crate': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_crate_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 38, frameHeight: 34, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 38, height: 34 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_crate_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 38, frameHeight: 34, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 38, height: 34 } }
        }
    },
    'hay_bale': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/hay_bale_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 44, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 44, height: 32 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/hay_bale_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 44, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 44, height: 32 } }
        }
    },
    'firewood_stack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/firewood_stack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 44, frameHeight: 28, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 44, height: 28 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/firewood_stack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 44, frameHeight: 28, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 44, height: 28 } }
        }
    },
    'signpost_wooden': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/signpost_wooden_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 42, frameHeight: 54, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 42, height: 54 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/signpost_wooden_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 42, frameHeight: 54, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 42, height: 54 } }
        }
    },
    'notice_board': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/notice_board_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 48, frameHeight: 54, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 48, height: 54 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/notice_board_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 48, frameHeight: 54, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 48, height: 54 } }
        }
    },
    'archery_target': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/archery_target_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 38, frameHeight: 48, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 38, height: 48 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/archery_target_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 38, frameHeight: 48, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 38, height: 48 } }
        }
    },
    'props_spear_rack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_spear_rack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 48, frameHeight: 68, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 48, height: 68 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_spear_rack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 48, frameHeight: 68, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 48, height: 68 } }
        }
    },
    'bakery_brick_oven': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_brick_oven_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 84, frameHeight: 92, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 84, height: 92 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_brick_oven_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 84, frameHeight: 92, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 84, height: 92 } }
        }
    },
    'bakery_prep_table_flour': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_prep_table_flour_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 68, frameHeight: 46, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 68, height: 46 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_prep_table_flour_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 68, frameHeight: 46, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 68, height: 46 } }
        }
    },
    'bakery_bread_shelf': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_bread_shelf_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 54, frameHeight: 68, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 54, height: 68 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_bread_shelf_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 54, frameHeight: 68, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 54, height: 68 } }
        }
    },
    'bakery_bread_basket': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_bread_basket_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 36, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 36, height: 32 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_bread_basket_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 36, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 36, height: 32 } }
        }
    },
    'bakery_flour_sack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_flour_sack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 30, frameHeight: 36, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 30, height: 36 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_flour_sack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 30, frameHeight: 36, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 30, height: 36 } }
        }
    },
    'bakery_flour_sack_stack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_flour_sack_stack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 48, frameHeight: 40, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 48, height: 40 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_flour_sack_stack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 48, frameHeight: 40, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 48, height: 40 } }
        }
    },
    'bakery_peel_rack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_peel_rack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 26, frameHeight: 64, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 26, height: 64 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_peel_rack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 26, frameHeight: 64, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 26, height: 64 } }
        }
    },
    'bakery_counter': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bakery_counter_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 64, frameHeight: 44, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 64, height: 44 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bakery_counter_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 64, frameHeight: 44, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 64, height: 44 } }
        }
    },
    'stone_well': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/props/stone_well_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 60, frameHeight: 66, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 60, height: 66 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/props/stone_well_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 60, frameHeight: 66, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 60, height: 66 } }
        }
    },
    'wooden_fence_horizontal': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_fence_horizontal_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 150, frameHeight: 74, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 150, height: 74 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_fence_horizontal_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 150, frameHeight: 74, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 150, height: 74 } }
        }
    },
    'wooden_fence_corner': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_fence_corner_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 143, frameHeight: 106, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 143, height: 106 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_fence_corner_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 143, frameHeight: 106, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 143, height: 106 } }
        }
    },
    'wooden_fence_diagonal': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_fence_diagonal_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 101, frameHeight: 110, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 101, height: 110 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_fence_diagonal_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 101, frameHeight: 110, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 101, height: 110 } }
        }
    },
    'wooden_fence_double_gate': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_fence_double_gate_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 142, frameHeight: 105, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 142, height: 105 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_fence_double_gate_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 142, frameHeight: 105, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 142, height: 105 } }
        }
    },
    'wooden_fence_broken': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_fence_broken_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 147, frameHeight: 103, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 147, height: 103 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_fence_broken_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 147, frameHeight: 103, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 147, height: 103 } }
        }
    },
    'stone_murette_low': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/stone_murette_low_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 140, frameHeight: 99, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 140, height: 99 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/stone_murette_low_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 140, frameHeight: 99, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 140, height: 99 } }
        }
    },
    'wooden_fence_post': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/wooden_fence_post_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 25, frameHeight: 143, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 25, height: 143 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/wooden_fence_post_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 25, frameHeight: 143, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 25, height: 143 } }
        }
    },
    'camp_stone_campfire': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/camp_stone_campfire_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 96, frameHeight: 89, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 96, height: 89 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/camp_stone_campfire_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 96, frameHeight: 89, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 96, height: 89 } }
        }
    },
    'camp_cooking_pot': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/camp_cooking_pot_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 73, frameHeight: 88, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 73, height: 88 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/camp_cooking_pot_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 73, frameHeight: 88, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 73, height: 88 } }
        }
    },
    'props_weapon_rack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_weapon_rack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 123, frameHeight: 105, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 123, height: 105 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_weapon_rack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 123, frameHeight: 105, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 123, height: 105 } }
        }
    },
    'props_training_dummy': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_training_dummy_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 84, frameHeight: 109, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 84, height: 109 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_training_dummy_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 84, frameHeight: 109, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 84, height: 109 } }
        }
    },
    'props_transport_cart': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_transport_cart_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 130, frameHeight: 101, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 130, height: 101 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_transport_cart_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 130, frameHeight: 101, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 130, height: 101 } }
        }
    },
    'props_spike_barricade': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_spike_barricade_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 90, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 93 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_spike_barricade_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 90, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 93 } }
        }
    },
    'props_alarm_bell_tower': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_alarm_bell_tower_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 96, frameHeight: 275, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 96, height: 275 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_alarm_bell_tower_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 96, frameHeight: 275, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 96, height: 275 } }
        }
    },
    'props_arcane_obelisk': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_arcane_obelisk_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 75, frameHeight: 185, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 75, height: 185 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_arcane_obelisk_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 75, frameHeight: 185, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 75, height: 185 } }
        }
    },
    'props_graveyard_cluster': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_graveyard_cluster_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 95, frameHeight: 146, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 95, height: 146 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_graveyard_cluster_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 95, frameHeight: 146, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 95, height: 146 } }
        }
    },
    'props_crypt_entrance': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/props_crypt_entrance_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 120, frameHeight: 243, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 120, height: 243 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/props_crypt_entrance_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 120, frameHeight: 243, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 120, height: 243 } }
        }
    },
    'portal_link_circle': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/portal_link_circle_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 64, frameHeight: 64, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 64, height: 64 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/portal_link_circle_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 64, frameHeight: 64, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 64, height: 64 } }
        }
    },

/* ================== PONTES & TRAVESSIAS FLUVIAIS ================== */
    'bridge_wood_planks': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bridge_wood_planks_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 168, frameHeight: 234, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 168, height: 234 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bridge_wood_planks_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 168, frameHeight: 234, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 168, height: 234 } }
        }
    },
    'bridge_stone_arch': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bridge_stone_arch_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 176, frameHeight: 142, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 176, height: 142 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bridge_stone_arch_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 176, frameHeight: 142, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 176, height: 142 } }
        }
    },
    'bridge_stepping_stones': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/bridge_stepping_stones_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 164, frameHeight: 132, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 164, height: 132 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/bridge_stepping_stones_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 164, frameHeight: 132, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 164, height: 132 } }
        }
    },
    'pier_wooden_dock': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/props/pier_wooden_dock_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 182, frameHeight: 131, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 182, height: 131 } },
            'idle': { imageSrc: new URL('../assets/scenery/props/pier_wooden_dock_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 182, frameHeight: 131, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 182, height: 131 } }
        }
    },

/* ================== ESTRADAS E CAMINHOS MODULARES ================== */
    'road_straight_horizontal': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_straight_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 460, frameHeight: 116, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 460, height: 116 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_straight_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 460, frameHeight: 116, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 460, height: 116 } }
        }
    },
    'road_straight_vertical': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_straight_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 145, frameHeight: 460, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 145, height: 460 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_straight_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 145, frameHeight: 460, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 145, height: 460 } }
        }
    },
    'road_crossroad_4way': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_crossroad_4way.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 260, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 260 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_crossroad_4way.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 260, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 260 } }
        }
    },
    'road_junction_t': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_junction_t.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 188, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 188 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_junction_t.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 188, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 188 } }
        }
    },
    'road_corner_90': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_corner_90.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 202, frameHeight: 188, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 202, height: 188 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_corner_90.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 202, frameHeight: 188, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 202, height: 188 } }
        }
    },
    'road_plaza_octagon': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_plaza_octagon.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 340 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_plaza_octagon.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 340 } }
        }
    },
    'road_plaza_octagon_marble': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_plaza_octagon_marble.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 340 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_plaza_octagon_marble.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 340 } }
        }
    },
    'road_plaza_marble_curb_ring': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_plaza_marble_curb_ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 340 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_plaza_marble_curb_ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 340 } }
        }
    },
    'road_curb_marble_horizontal': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_curb_marble_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 145, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 145, height: 16 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_curb_marble_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 145, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 145, height: 16 } }
        }
    },
    'road_curb_marble_vertical': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_curb_marble_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 16, frameHeight: 145, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 16, height: 145 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_curb_marble_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 16, frameHeight: 145, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 16, height: 145 } }
        }
    },
    'road_dead_end': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dead_end.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 145, frameHeight: 220, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 145, height: 220 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dead_end.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 145, frameHeight: 220, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 145, height: 220 } }
        }
    },
    'road_diagonal_nw_se': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_diagonal_nw_se.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 310, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 310 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_diagonal_nw_se.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 310, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 310 } }
        }
    },
    'road_diagonal_ne_sw': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_diagonal_ne_sw.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 310, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 310 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_diagonal_ne_sw.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 340, frameHeight: 310, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 340, height: 310 } }
        }
    },
    'road_junction_y': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_junction_y.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 330, frameHeight: 295, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 330, height: 295 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_junction_y.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 330, frameHeight: 295, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 330, height: 295 } }
        }
    },
    'road_plaza_circle': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_plaza_circle.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 380, frameHeight: 260, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 380, height: 260 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_plaza_circle.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 380, frameHeight: 260, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 380, height: 260 } }
        }
    },

/* ================== TRILHAS E ESTRADAS DE TERRA BATIDA ================== */
    'road_dirt_straight_horizontal': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_straight_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 450, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 450, height: 230 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_straight_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 450, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 450, height: 230 } }
        }
    },
    'road_dirt_straight_vertical': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_straight_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 450, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 450 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_straight_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 450, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 450 } }
        }
    },
    'road_dirt_corner_90': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_corner_90.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 300, frameHeight: 260, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 300, height: 260 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_corner_90.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 300, frameHeight: 260, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 300, height: 260 } }
        }
    },
    'road_dirt_crossroad_4way': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_crossroad_4way.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 350, frameHeight: 245, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 350, height: 245 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_crossroad_4way.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 350, frameHeight: 245, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 350, height: 245 } }
        }
    },
    'road_dirt_patch': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_patch.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 180, frameHeight: 110, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 180, height: 110 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_patch.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 180, frameHeight: 110, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 180, height: 110 } }
        }
    },
    'road_dirt_ruts': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_ruts.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 190, frameHeight: 70, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 190, height: 70 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_ruts.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 190, frameHeight: 70, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 190, height: 70 } }
        }
    },
    'road_dirt_clods': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/roads/road_dirt_clods.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 96, frameHeight: 56, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 96, height: 56 } },
            'idle': { imageSrc: new URL('../assets/scenery/roads/road_dirt_clods.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 96, frameHeight: 56, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 96, height: 56 } }
        }
    },

/* ================== RIOS, CANAIS & ÁGUAS ================== */
    'river_straight_horizontal': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/river_straight_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 468, frameHeight: 220, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 468, height: 220 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/river_straight_horizontal.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 468, frameHeight: 220, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 468, height: 220 } }
        }
    },
    'river_straight_vertical': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/river_straight_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 220, frameHeight: 468, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 220, height: 468 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/river_straight_vertical.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 220, frameHeight: 468, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 220, height: 468 } }
        }
    },
    'river_curve_ne': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/river_curve_ne.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/river_curve_ne.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } }
        }
    },
    'river_curve_nw': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/river_curve_nw.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/river_curve_nw.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } }
        }
    },
    'river_curve_se': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/river_curve_se.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/river_curve_se.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } }
        }
    },
    'river_curve_sw': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/river_curve_sw.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/river_curve_sw.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 230, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 230 } }
        }
    },
    'pond_nature_clearing': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/water/pond_nature_clearing_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 220, frameHeight: 195, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 220, height: 195 } },
            'idle': { imageSrc: new URL('../assets/scenery/water/pond_nature_clearing_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 220, frameHeight: 195, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 220, height: 195 } }
        }
    },
    'tree_oak': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/nature/tree_oak_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 16, frameWidth: 110, frameHeight: 122, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 110, height: 122 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/nature/tree_oak_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 16, frameWidth: 110, frameHeight: 122, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 110, height: 122 } }
        }
    },
    'tree_pine': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/nature/tree_pine_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 16, frameWidth: 80, frameHeight: 128, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 80, height: 128 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/nature/tree_pine_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 16, frameWidth: 80, frameHeight: 128, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 80, height: 128 } }
        }
    },
    'bush_flowering': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/bush_flowering_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 55, frameHeight: 50, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 55, height: 50 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/bush_flowering_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 55, frameHeight: 50, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 55, height: 50 } }
        }
    },
    'rock_mossy': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/rock_mossy_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 85, frameHeight: 57, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 85, height: 57 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/rock_mossy_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 85, frameHeight: 57, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 85, height: 57 } }
        }
    },
    'nature_granite_boulder': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_granite_boulder_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 106, frameHeight: 87, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 106, height: 87 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_granite_boulder_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 106, frameHeight: 87, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 106, height: 87 } }
        }
    },
    'nature_pebble_cluster': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_pebble_cluster_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 90, frameHeight: 47, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 47 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_pebble_cluster_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 90, frameHeight: 47, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 90, height: 47 } }
        }
    },
    'nature_berry_bush': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_berry_bush_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 103, frameHeight: 77, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 103, height: 77 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_berry_bush_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 103, frameHeight: 77, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 103, height: 77 } }
        }
    },
    'nature_tree_stump': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_tree_stump_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 100, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 100, height: 93 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_tree_stump_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 100, frameHeight: 93, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 100, height: 93 } }
        }
    },
    'nature_fallen_log': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_fallen_log_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 109, frameHeight: 89, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 109, height: 89 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_fallen_log_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 109, frameHeight: 89, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 109, height: 89 } }
        }
    },
    'nature_cattails_reeds': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_cattails_reeds_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 51, frameHeight: 94, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 51, height: 94 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_cattails_reeds_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 51, frameHeight: 94, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 51, height: 94 } }
        }
    },
    'nature_lavender_bush': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/nature/nature_lavender_bush_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 79, frameHeight: 101, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 79, height: 101 } },
            'idle': { imageSrc: new URL('../assets/scenery/nature/nature_lavender_bush_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 79, frameHeight: 101, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 79, height: 101 } }
        }
    },
    'house_arcane_tower': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_arcane_tower_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 220, frameHeight: 326, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 220, height: 326 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_arcane_tower_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 220, frameHeight: 326, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 220, height: 326 } }
        }
    },
    'house_town_hall': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_town_hall_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 320, frameHeight: 355, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 355 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_town_hall_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 320, frameHeight: 355, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 355 } }
        }
    },
    'house_bakery_rustic': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_bakery_rustic_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 280, frameHeight: 273, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 280, height: 273 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_bakery_rustic_anim.png', import.meta.url).href, frameCount: 6, animationSpeed: 10, frameWidth: 280, frameHeight: 273, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 280, height: 273 } }
        }
    },
    'house_windmill_grain': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_windmill_grain_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 250, frameHeight: 304, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 250, height: 304 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_windmill_grain_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 250, frameHeight: 304, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 250, height: 304 } }
        }
    },
    'house_small_cottage': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_small_cottage_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 240, frameHeight: 238, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 240, height: 238 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_small_cottage_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 240, frameHeight: 238, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 240, height: 238 } }
        }
    },
    'house_chapel_bell': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_chapel_bell_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 320, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 320 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_chapel_bell_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 260, frameHeight: 320, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 260, height: 320 } }
        }
    },
    'house_tavern_brewery': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_tavern_brewery_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 330 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_tavern_brewery_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 330 } }
        }
    },
    'house_apothecary_greenhouse': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_apothecary_greenhouse_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 330 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_apothecary_greenhouse_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 330 } }
        }
    },
    'house_guard_barracks': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_guard_barracks_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 328, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 328 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_guard_barracks_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 328, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 328 } }
        }
    },
    'house_sawmill_carpentry': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/houses/house_sawmill_carpentry_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 329, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 329 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/houses/house_sawmill_carpentry_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 329, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 329 } }
        }
    },
    'house_woodcutter_shack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_woodcutter_shack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 240, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 240 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_woodcutter_shack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 240, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 240 } }
        }
    },
    'house_peasant_thatched': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_peasant_thatched_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 265, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 265 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_peasant_thatched_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 230, frameHeight: 265, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 230, height: 265 } }
        }
    },
    'house_stone_hovel': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_stone_hovel_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 240, frameHeight: 270, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 240, height: 270 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_stone_hovel_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 240, frameHeight: 270, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 240, height: 270 } }
        }
    },
    'house_merchant_timber': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_merchant_timber_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 280, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 280, height: 330 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_merchant_timber_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 280, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 280, height: 330 } }
        }
    },
    'house_noble_manor': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_noble_manor_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 310, frameHeight: 350, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 310, height: 350 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_noble_manor_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 310, frameHeight: 350, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 310, height: 350 } }
        }
    },
    'house_witch_turret': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_witch_turret_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 290, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 290, height: 330 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_witch_turret_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 290, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 290, height: 330 } }
        }
    },
    'house_fisherman_shack': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_fisherman_shack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 250, frameHeight: 245, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 250, height: 245 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_fisherman_shack_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 250, frameHeight: 245, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 250, height: 245 } }
        }
    },
    'house_watermill_river': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_watermill_river_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 290, frameHeight: 320, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 290, height: 320 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_watermill_river_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 290, frameHeight: 320, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 290, height: 320 } }
        }
    },
    'house_alchemist_curio': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_alchemist_curio_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 250, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 250, height: 330 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_alchemist_curio_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 250, frameHeight: 330, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 250, height: 330 } }
        }
    },
    'house_log_cabin': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/houses/house_log_cabin_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 235, frameHeight: 245, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 235, height: 245 } },
            'idle': { imageSrc: new URL('../assets/scenery/houses/house_log_cabin_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 235, frameHeight: 245, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 235, height: 245 } }
        }
    },

/* ================== DEFESAS & MURALHAS DE ALVORADA DE VILGEM ================== */
    'fortified_gatehouse': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/fortifications/fortified_gatehouse_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 351, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 351 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/fortifications/fortified_gatehouse_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 320, frameHeight: 351, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 320, height: 351 } }
        }
    },
    'stone_watchtower': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/fortifications/stone_watchtower_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 212, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 212, height: 340 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/fortifications/stone_watchtower_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 212, frameHeight: 340, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 212, height: 340 } }
        }
    },
    'stone_wall_straight_long': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/sprites/scenery/fortifications/stone_wall_straight_long_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 396, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 396, height: 208 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/fortifications/stone_wall_straight_long_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 12, frameWidth: 396, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 396, height: 208 } }
        }
    },
    'stone_wall_straight_short': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_straight_short_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 198, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 198, height: 208 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_straight_short_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 198, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 198, height: 208 } }
        }
    },
    'stone_wall_straight_vertical': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_straight_vertical_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 128, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 128, height: 208 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_straight_vertical_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 128, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 128, height: 208 } }
        }
    },
    'stone_wall_corner': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } }
        }
    },
    'stone_wall_corner_ne': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_ne_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_ne_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } }
        }
    },
    'stone_wall_corner_sw': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_sw_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_sw_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } }
        }
    },
    'stone_wall_corner_se': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_se_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_corner_se_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 316, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 316, height: 250 } }
        }
    },
    'stone_wall_gate': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_gate_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 396, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 396, height: 250 } },
            'idle': { imageSrc: new URL('../assets/sprites/scenery/fortifications/stone_wall_gate_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 8, frameWidth: 396, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 396, height: 250 } },
            'open': { imageSrc: new URL('../assets/sprites/scenery/fortifications/stone_wall_gate_anim.png', import.meta.url).href, frameCount: 4, animationSpeed: 8, frameWidth: 396, frameHeight: 250, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 396, height: 250 } }
        }
    },
    'stone_wall_straight_vertical_east': {
        category: 'entity',
        animations: {
            'static': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_straight_vertical_east_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 128, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 128, height: 208 } },
            'idle': { imageSrc: new URL('../assets/scenery/fortifications/stone_wall_straight_vertical_east_clean.png', import.meta.url).href, frameCount: 1, animationSpeed: 1, frameWidth: 128, frameHeight: 208, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 128, height: 208 } }
        }
    },

/* ================== ITENS E EQUIPAMENTOS ================== */
    'iron-helmet': {
        category: 'equipment',
        iconId: 10,
        uiIconUrl: new URL('../assets/itens/capacete-simples.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, 
        frameCount: 1, animationSpeed: 10, frameWidth: 22, frameHeight: 16, 
        atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {
            'idle': { 
                imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, 
                frameCount: 1, 
                animationSpeed: 20, 
                frameWidth: 22, 
                frameHeight: 16, 
                atlasOffset: { x: 0, y: 0 }, 
                spriteSize: { width: 22, height: 16 }, 
                renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] 
            },
            'walking': { imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 22, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 22, height: 16 }, renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] },
            'dead': { imageSrc: new URL('../assets/itens/capacete-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 22, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 22, height: 16 }, renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] }
        }
    },
    'iron-chestplate': {
        category: 'equipment', iconId: 11,
        uiIconUrl: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 7, y: 17 }, 
        spriteSize: { width: 18, height: 10 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, renderOffset: [{ x: 7, y: 17 }, { x: 7, y: 17 }] },
            'walking': { imageSrc: new URL('../assets/itens/peitoral-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, 
            renderOffset: [{ x: 7, y: 17 }, { x: 7, y: 18 }] },
        }
    },
    'iron-pants': {
        category: 'equipment', iconId: 12,
        uiIconUrl: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 3, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 10, height: 3 } },
        animations: {
            'idle': { 
                imageSrc: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 10, frameHeight: 3, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 10, height: 3 }, 
                renderOffset: [{ x: 11, y: 27 }, { x: 11, y: 27 }] 
            },
            'walking': { 
                imageSrc: new URL('../assets/itens/calça-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 3, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 10, height: 3 }, 
                renderOffset: [{ x: 11, y: 27 }, { x: 11, y: 27 }] 
            },
        }
    },
    'iron-boots': {
        category: 'equipment', iconId: 13,
        uiIconUrl: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 2, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 10, height: 2 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 10, frameHeight: 2, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 10, height: 2 }, renderOffset: [{ x: 11, y: 31 }, { x: 11, y: 31 }] },
            'walking': { imageSrc: new URL('../assets/itens/botas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 10, frameHeight: 2, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 22, height: 16 }, renderOffset: [{ x: 11, y: 31 }, { x: 11, y: 31 }] },
        }
    },
    'iron-gloves': {
        category: 'equipment', iconId: 14,
        uiIconUrl: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 18, height: 10 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, 
            renderOffset: [{ x:7 , y: 18 }, { x: 7, y: 19 }] },
            'walking': { 
                imageSrc: new URL('../assets/itens/luvas-de-ferro.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 18, frameHeight: 10, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 18, height: 10 }, 
                renderOffset: [{ x:7 , y: 18 }, { x: 7, y: 19 }] 
            },
        }
    },
    'simple-amulet': {
        category: 'equipment', iconId: 15,
        uiIconUrl: new URL('../assets/itens/nackless-simples.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/nackless-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 16, height: 16 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/nackless-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 16, height: 16 }, 
            renderOffset: [{ x: 8, y: 17 }, { x: 8, y: 18 }] },
            'walking': { imageSrc: new URL('../assets/itens/nackless-simples.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 16, height: 16 }, 
            renderOffset: [{ x: 8, y: 17 }, { x: 8, y: 18 }] },
        }
    },
    'simple-ring': {
        category: 'equipment', iconId: 16,
        uiIconUrl: new URL('../assets/itens/simple-ring.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/simple-ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {
            'idle': { imageSrc: new URL('../assets/itens/simple-ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 }, renderOffset: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
            'walking': { imageSrc: new URL('../assets/itens/simple-ring.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 }, renderOffset: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
        }
    },
    'staff': {
        category: 'weapon', iconId: 1,
        uiIconUrl: new URL('../assets/itens/staff-design-1.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/staff-design-1.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'gun': {
        category: 'weapon', iconId: 2,
        uiIconUrl: new URL('../assets/itens/gun-design-1.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/gun-design-1.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'scythe': {
        category: 'weapon', iconId: 3,
        uiIconUrl: new URL('../assets/itens/scythe-design-1.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/scythe-design-1.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'simple-sword': {
        category: 'weapon', iconId: 4,
        uiIconUrl: new URL('../assets/itens/simple-sword.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/simple-sword.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'fishing-rod': {
        category: 'weapon', iconId: 5,
        uiIconUrl: new URL('../assets/itens/vara-de-pesca.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/vara-de-pesca.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'health-potion': {
        category: 'equipment', iconId: 30,
        uiIconUrl: new URL('../assets/itens/life-potion.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/life-potion.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'mana-potion': {
        category: 'equipment', iconId: 31,
        uiIconUrl: new URL('../assets/itens/mana-potion.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/mana-potion.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'apple': {
        category: 'equipment', iconId: 32,
        uiIconUrl: new URL('../assets/itens/apple.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/apple.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'coin': {
        category: 'equipment', iconId: 33,
        uiIconUrl: new URL('../assets/itens/coin.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/coin.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'experience-tome': {
        category: 'equipment', iconId: 34,
        uiIconUrl: new URL('../assets/itens/experience-tome.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/experience-tome.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'leather-bag': {
        category: 'equipment', iconId: 100,
        uiIconUrl: new URL('../assets/itens/bag.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/bag.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'vampire-fang': {
        category: 'equipment', iconId: 40,
        uiIconUrl: new URL('../assets/itens/vampire-fang.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/vampire-fang.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'mega-mushroom': {
        category: 'equipment', iconId: 41,
        uiIconUrl: new URL('../assets/itens/mega-mushroom.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/mega-mushroom.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'adrenaline-flask': {
        category: 'equipment', iconId: 42,
        uiIconUrl: new URL('../assets/itens/adranaline-flask.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/adranaline-flask.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },
    'demon-blood': {
        category: 'equipment', iconId: 43,
        uiIconUrl: new URL('../assets/itens/demon-blood.png', import.meta.url).href,
        droppedConfig: { imageSrc: new URL('../assets/itens/demon-blood.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } },
        animations: {}
    },

/* ================== PROJÉTEIS & VFX ================== */
    'simpleBullet': {
        category: 'projectile',
        animations: { 'travelling': { imageSrc: new URL('../assets/entities/vfx/simple-bullet.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 16, frameHeight: 16, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 16, height: 16 } } }
    },
    'fishingHook': {
        category: 'projectile',
        animations: { 
            'travelling': { 
                imageSrc: new URL('../assets/entities/vfx/fishing-hook.png', import.meta.url).href, 
                frameCount: 1, animationSpeed: 10, 
                frameWidth: 16, frameHeight: 16, 
                atlasOffset: { x: 0, y: 32 }, 
                spriteSize: { width: 16, height: 16 }
             } 
        }
    },
    'magicMissile': {
        category: 'projectile',
        animations: { 'travelling': { imageSrc: new URL('../assets/entities/vfx/magic-missil.png', import.meta.url).href, frameCount: 3, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 32, height: 32 } } }
    },

    'fireball': {
        category: 'projectile',
        animations: { 
            'travelling': { 
                imageSrc: new URL('../assets/entities/vfx/firebola.png', import.meta.url).href, 
                frameCount: 1, animationSpeed: 10, 
                frameWidth: 16, frameHeight: 16, 
                atlasOffset: { x: 0, y: 32 }, 
                spriteSize: { width: 16, height: 16 }
             } 
        }
    },
    'dynamicSpell': {
        category: 'projectile',
        animations: { 
            'travelling': { 
                imageSrc: new URL('../assets/entities/vfx/projectile.png', import.meta.url).href, 
                frameCount: 1, animationSpeed: 1, 
                frameWidth: 16, frameHeight: 16, 
                spriteSize: { width: 10, height: 10 }
             } 
        }
    },
    'explosion': {
        category: 'vfx',
        animations: { 'active': { imageSrc: new URL('../assets/entities/vfx/explosion.png', import.meta.url).href, frameCount: 16, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 32 }, spriteSize: { width: 128, height: 128 } } }
    },
    'slash' :{
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/sword-atack-spritesheet.png', import.meta.url).href, 
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 },
            }
        }
    },
    'scythe-slash' :{
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/sword-atack-spritesheet.png', import.meta.url).href, 
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 },
                anchor: 'bottom-left'
            }
        }
    },
    'heavy-blow': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/heavy-blow-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 96, frameHeight: 96,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 96, height: 96 }
            }
        }
    },
    'w_t1_heavy_blow': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/heavy-blow-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 96, frameHeight: 96,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 96, height: 96 }
            }
        }
    },
    'cleave': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/cleave-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'w_t2_cleave': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/cleave-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'shield-bash': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/shield-bash-spritesheet.png', import.meta.url).href,
                frameCount: 4, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'w_t2_shield_bash': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/shield-bash-spritesheet.png', import.meta.url).href,
                frameCount: 4, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'war-cry': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/war-cry-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'w_t3_war_cry': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/war-cry-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'ground-slam': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/ground-slam-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'w_t4_ground_slam': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/ground-slam-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'blade-dance': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/blade-dance-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'w_t5_blade_dance': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/blade-dance-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'avatar-of-war': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/avatar-of-war-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'w_t5_avatar_of_war': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/avatar-of-war-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'reap': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/reap-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'n_t1_reap': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/reap-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'bone-spear': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/bone-spear-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'n_t2_bone_spear': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/bone-spear-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'lich-ascension': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/lich-ascension-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 96, frameHeight: 96,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 96, height: 96 }
            }
        }
    },
    'n_t3_soul': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/lich-ascension-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 96, frameHeight: 96,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 96, height: 96 }
            }
        }
    },
    'grasp-of-dead': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/grasp-of-dead-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'n_t3_grasp_of_dead': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/grasp-of-dead-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'corpse-explosion': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/corpse-explosion-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'n_t4_corpse_explosion': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/corpse-explosion-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'wail-of-banshee': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/wail-of-banshee-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'n_t5_wail_of_banshee': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/wail-of-banshee-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'dance-of-dead': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/dance-of-dead-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'n_t5_dance_of_dead': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/dance-of-dead-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'fireball-axiom': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fireball-axiom-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'm_t1_fireball': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fireball-axiom-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'teleport-blink': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/teleport-blink-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'm_t4_teleport': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/teleport-blink-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'blink': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/teleport-blink-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'fishing-net': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fishing-net-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 96, frameHeight: 96,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 96, height: 96 }
            }
        }
    },
    'pesc_t2_net': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fishing-net-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 96, frameHeight: 96,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 96, height: 96 }
            }
        }
    },
    'leviathan-maw': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/spawn-leviata.png', import.meta.url).href,
                frameCount: 19, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'pesc_t3_leviata': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/spawn-leviata.png', import.meta.url).href,
                frameCount: 19, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'quickdraw-flash': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/quickdraw-flash-spritesheet.png', import.meta.url).href,
                frameCount: 4, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'gs_t1_quickdraw': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/quickdraw-flash-spritesheet.png', import.meta.url).href,
                frameCount: 4, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'fanhammer-burst': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fanhammer-burst-spritesheet.png', import.meta.url).href,
                frameCount: 4, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'gs_t2_fanhammer': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fanhammer-burst-spritesheet.png', import.meta.url).href,
                frameCount: 4, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'deadeye-target': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/deadeye-target-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'gs_t3_deadeye': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/deadeye-target-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'brooch-heal': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-heal-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'brooch_active_heal': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-heal-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'brooch-meteor': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-meteor-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'brooch_active_meteor': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-meteor-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'fireExplosion': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-meteor-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'meteor': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-meteor-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'brooch-luck': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-luck-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'brooch_active_luck': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-luck-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'brooch-dash': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-dash-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'brooch_active_dash': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-dash-spritesheet.png', import.meta.url).href,
                frameCount: 5, animationSpeed: 2,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
        'knockback-vfx': {
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/knockback-vfx.png', import.meta.url).href, 
                frameCount: 15, animationSpeed: 3,
                frameWidth: 32, frameHeight: 32,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 32, height: 32 }
            }
        }
    },
    'pull-force': {
        category: 'vfx',
        animations: {
            'active': { 
                imageSrc: new URL('../assets/entities/vfx/pull-force.png', import.meta.url).href, 
                frameCount: 5, animationSpeed: 3,
                frameWidth: 64, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 128 }
            }
        }
    },
    'blackhole': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/blackhole-spritesheet.png', import.meta.url).href,
                frameCount: 8,
                animationSpeed: 3,
                frameWidth: 128,
                frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'm_t5_blackhole': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/blackhole-spritesheet.png', import.meta.url).href,
                frameCount: 8,
                animationSpeed: 3,
                frameWidth: 128,
                frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },

  /* Broche Ativo: Barreira de Cristal */
    'brooch-shield': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-shield-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'brooch_active_shield': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-shield-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'crystal-barrier': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/brooch-shield-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },

  /* Broche Ativo & Passiva: Fúria do Berserker */
    'berserk': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/berserk-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'brooch-berserk': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/berserk-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'brooch_active_berserk': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/berserk-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },
    'w_t3_berserk': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/berserk-spritesheet.png', import.meta.url).href,
                frameCount: 8, animationSpeed: 3,
                frameWidth: 128, frameHeight: 128,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 128, height: 128 }
            }
        }
    },

  /* Passivas de Classe: Guerreiro */
    'iron-skin': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/iron-skin-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'w_t1_iron_skin': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/iron-skin-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'armor-breaker': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/armor-breaker-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'w_t4_armor_breaker': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/armor-breaker-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },

  /* Passivas de Classe: Necromante */
    'soul-leech': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/soul-leech-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'n_t1_soul_leech': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/soul-leech-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'lifesteal': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/lifesteal-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'n_t2_lifesteal': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/lifesteal-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'spectral-veil': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/spectral-veil-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'n_t3_spectral_veil': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/spectral-veil-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },

  /* Passivas de Classe: Mago */
    'mana-burn': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/mana-burn-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'm_t2_burn': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/mana-burn-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },

  /* Passivas de Classe: Pescador */
    'fisgada': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fisgada-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },
    'pesc_t1_fisgada': {
        category: 'vfx',
        animations: {
            'active': {
                imageSrc: new URL('../assets/entities/vfx/fisgada-spritesheet.png', import.meta.url).href,
                frameCount: 6, animationSpeed: 3,
                frameWidth: 64, frameHeight: 64,
                atlasOffset: { x: 0, y: 0 },
                spriteSize: { width: 64, height: 64 }
            }
        }
    },

/* ================== NPCs ================== */

    'molor': {
        category: 'entity',
        animations: {
    //? Sprite estático padrão com frameCount 1
            'idle': { imageSrc: new URL('../assets/entities/npc/Molor/Molor.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/npc/Molor/MolorWaiting.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        }
    },
    'molin': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/npc/Molin/molin-waiting.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/npc/Molin/molin-walking.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        }
    },
    'candelion': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/npc/Candelion/candelion-waiting.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/npc/Candelion/candelion-walking.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        }
    },
    'derocar': {
        category: 'entity',
        animations: {
            'idle': { imageSrc: new URL('../assets/entities/npc/Derocar/Derocar.png', import.meta.url).href, frameCount: 1, animationSpeed: 20, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
            'walking': { imageSrc: new URL('../assets/entities/npc/Derocar/DerocarWalking.png', import.meta.url).href, frameCount: 1, animationSpeed: 10, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } },
        }
    },

/* ================== ÍCONES DE EFEITOS ELEMENTAIS & AXIOMÁTICOS ================== */
    'effect_abys': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['abys'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_air': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['air'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_crystal': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['crystal'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_dark': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['dark'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_decay': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['decay'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_fire': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['fire'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_ground': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['ground'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_holy': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['holy'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_ice': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['ice'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_infernous': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['infernous'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_life': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['life'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_light': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['light'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_magic': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['magic'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_magma': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['magma'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_nature': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['nature'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_negation': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['negation'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_ordem': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['ordem'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_poison': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['poison'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_potencia': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['potencia'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_thunder': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['thunder'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },
    'effect_water': { category: 'vfx', animations: { 'static': { imageSrc: ElementalEffectIcons['water'].icon32Url, frameCount: 1, animationSpeed: 1, frameWidth: 32, frameHeight: 32, atlasOffset: { x: 0, y: 0 }, spriteSize: { width: 32, height: 32 } } } },

/* ================== ASSETS & SPRITES DINÂMICOS DO ASSETS ADAPTER ================== */
    // <!-- ASSETS_ADAPTER_SPRITES_START -->
    // <!-- ASSETS_ADAPTER_SPRITES_END -->

};

/* ================== ÍNDICE O(1) POR ICON_ID ================== */
let _itemByIconIdCache: Map<number, { key: string; config: ItemVisualConfig }> | null = null;

function ensureItemIconIndex(): Map<number, { key: string; config: ItemVisualConfig }> {
    if (!_itemByIconIdCache) {
        _itemByIconIdCache = new Map();
        for (const [key, config] of Object.entries(VisualConfigMap)) {
            if ((config.category === 'equipment' || config.category === 'weapon') && (config as ItemVisualConfig).iconId !== undefined) {
                _itemByIconIdCache.set(Number((config as ItemVisualConfig).iconId), {
                    key,
                    config: config as ItemVisualConfig
                });
            }
        }
    }
    return _itemByIconIdCache;
}

/** Busca O(1) da configuração visual de um item ou arma pelo seu iconId numérico. */
export function getItemVisualByIconId(iconId: number): ItemVisualConfig | undefined {
    return ensureItemIconIndex().get(Number(iconId))?.config;
}

/** Busca O(1) da chave de catálogo (ex: 'armor-plate') de um item ou arma pelo seu iconId numérico. */
export function getItemVisualKeyByIconId(iconId: number): string | undefined {
    return ensureItemIconIndex().get(Number(iconId))?.key;
}

