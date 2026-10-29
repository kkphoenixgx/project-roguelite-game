import { describe, it, expect } from 'vitest';
import { VisualConfigMap, ElementalEffectIcons, SkillIcons, type ElementalEffectKey, type SkillIconKey, type VFXVisualConfig } from '../../adapters/web/shared/VisualConfigMap';
import {
  PortalLinksMap,
  getPortalLinksForMap,
  type PortalLinkConfig
} from '../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap';
import { IntermapRegistry } from '../../domain/ObjectModule/Maps/IntermapConfig';
import { GlobalStatPool, GlobalBroochPool } from '../../domain/facadeComponents/MetaProgressionMap';

/**
 * ============================================================================
 * SUÍTE DE CONFORMIDADE SINTÁTICA E ESTRUTURAL DE MAPAS & CATÁLOGOS (QA)
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Finalidade: Validação ultrarrápida (Zero-GC / Lightweight) de esquemas de dados,
 * dicionários e mapas de configuração (VisualConfigMap, PortalLinksMap, Intermaps,
 * MetaProgressionMap).
 *
 * Permite ao Especialista de Assets validar registros instantaneamente via:
 *   npm run test:maps
 * dispensando a execução custosa de toda a suíte de adaptadores web ou DOM.
 */
describe('Compliance Sintática e Estrutural de Mapas & Catálogos', () => {

  /* -------------------------------------------------------------------------- */
  /* 1. VisualConfigMap: Catálogo de Assets Visuais e Cenários                  */
  /* -------------------------------------------------------------------------- */
  describe('1. VisualConfigMap (Catálogo de Assets & Apresentação)', () => {
    const validCategories = new Set(['map', 'entity', 'equipment', 'weapon', 'projectile', 'vfx']);

    it('deve conter entradas registradas no catálogo', () => {
      const keys = Object.keys(VisualConfigMap);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('todas as entradas devem possuir chave válida e categoria compatível', () => {
      for (const [key, config] of Object.entries(VisualConfigMap)) {
        expect(key.trim(), `Chave vazia ou inválida encontrada: "${key}"`).not.toBe('');
        expect(config, `Configuração nula ou indefinida para a chave: "${key}"`).toBeDefined();
        expect(
          validCategories.has(config.category),
          `Chave "${key}" possui categoria inválida "${(config as any).category}". Permitidas: ${Array.from(validCategories).join(', ')}`
        ).toBe(true);
      }
    });

    it('entradas do tipo "map" devem possuir chunks válidos e dimensões positivas', () => {
      for (const [key, config] of Object.entries(VisualConfigMap)) {
        if (config.category === 'map') {
          expect(config.chunkSize, `Mapa "${key}" deve ter chunkSize maior que zero`).toBeGreaterThan(0);
          expect(Array.isArray(config.chunks), `Mapa "${key}" deve conter matriz de chunks`).toBe(true);
          expect(config.chunks.length, `Mapa "${key}" deve ter ao menos uma linha de chunks`).toBeGreaterThan(0);

          for (let r = 0; r < config.chunks.length; r++) {
            const row = config.chunks[r]!;
            expect(Array.isArray(row), `Mapa "${key}" linha ${r} de chunks deve ser um array`).toBe(true);
            for (let c = 0; c < row.length; c++) {
              expect(
                typeof row[c],
                `Mapa "${key}" chunk [${r}, ${c}] deve ser uma string (URL ou caminho)`
              ).toBe('string');
            }
          }

          if (config.collisionJsonUrl !== undefined) {
            expect(typeof config.collisionJsonUrl, `Mapa "${key}" collisionJsonUrl deve ser string`).toBe('string');
          }

          if (config.originChunk !== undefined) {
            const cols = config.chunks[0]?.length ?? 0;
            const rows = config.chunks.length;
            expect(config.originChunk.cx, `Mapa "${key}" originChunk.cx deve estar dentro das colunas [0..${cols - 1}]`).toBeGreaterThanOrEqual(0);
            expect(config.originChunk.cx, `Mapa "${key}" originChunk.cx deve estar dentro das colunas [0..${cols - 1}]`).toBeLessThan(cols);
            expect(config.originChunk.cy, `Mapa "${key}" originChunk.cy deve estar dentro das linhas [0..${rows - 1}]`).toBeGreaterThanOrEqual(0);
            expect(config.originChunk.cy, `Mapa "${key}" originChunk.cy deve estar dentro das linhas [0..${rows - 1}]`).toBeLessThan(rows);
          }
        }
      }
    });

    it('entradas do tipo "entity", "projectile" e "vfx" devem possuir animações estruturadas', () => {
      for (const [key, config] of Object.entries(VisualConfigMap)) {
        if (config.category === 'entity' || config.category === 'projectile' || config.category === 'vfx') {
          const anims = config.animations;
          expect(anims, `Entidade/VFX "${key}" deve ter um dicionário "animations"`).toBeDefined();

          const animKeys = Object.keys(anims);
          expect(animKeys.length, `Entidade/VFX "${key}" deve ter ao menos um estado de animação`).toBeGreaterThan(0);

          for (const animName of animKeys) {
            const sprite = anims[animName]!;
            expect(typeof sprite.imageSrc, `"${key}" animação "${animName}" deve conter imageSrc string`).toBe('string');
            expect(sprite.frameCount, `"${key}" animação "${animName}" frameCount deve ser >= 1`).toBeGreaterThanOrEqual(1);
            expect(sprite.animationSpeed, `"${key}" animação "${animName}" animationSpeed deve ser >= 1`).toBeGreaterThanOrEqual(1);
            expect(sprite.frameWidth, `"${key}" animação "${animName}" frameWidth deve ser > 0`).toBeGreaterThan(0);
            expect(sprite.frameHeight, `"${key}" animação "${animName}" frameHeight deve ser > 0`).toBeGreaterThan(0);

            if (sprite.spriteSize) {
              expect(sprite.spriteSize.width, `"${key}" animação "${animName}" spriteSize.width > 0`).toBeGreaterThan(0);
              expect(sprite.spriteSize.height, `"${key}" animação "${animName}" spriteSize.height > 0`).toBeGreaterThan(0);
            }

            if (sprite.atlasOffset) {
              expect(Number.isFinite(sprite.atlasOffset.x), `"${key}" animação "${animName}" atlasOffset.x deve ser número`).toBe(true);
              expect(Number.isFinite(sprite.atlasOffset.y), `"${key}" animação "${animName}" atlasOffset.y deve ser número`).toBe(true);
            }
          }
        }
      }
    });

    it('entradas do tipo "equipment" e "weapon" devem possuir iconId, uiIconUrl e droppedConfig', () => {
      for (const [key, config] of Object.entries(VisualConfigMap)) {
        if (config.category === 'equipment' || config.category === 'weapon') {
          expect(typeof config.iconId, `Item "${key}" deve ter iconId numérico`).toBe('number');
          expect(typeof config.uiIconUrl, `Item "${key}" deve ter uiIconUrl string`).toBe('string');
          expect(config.droppedConfig, `Item "${key}" deve ter droppedConfig`).toBeDefined();

          const dropped = config.droppedConfig;
          expect(typeof dropped.imageSrc, `Item "${key}" droppedConfig deve ter imageSrc string`).toBe('string');
          expect(dropped.frameCount, `Item "${key}" droppedConfig frameCount >= 1`).toBeGreaterThanOrEqual(1);
          expect(dropped.frameWidth, `Item "${key}" droppedConfig frameWidth > 0`).toBeGreaterThan(0);
          expect(dropped.frameHeight, `Item "${key}" droppedConfig frameHeight > 0`).toBeGreaterThan(0);
        }
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. PortalLinksMap: Catálogo Central de Portais & Transições                */
  /* -------------------------------------------------------------------------- */
  describe('2. PortalLinksMap (Catálogo de Portais & Transições de Mapa)', () => {
    it('deve conter mapas registrados com arrays de portais válidos', () => {
      const mapIds = Object.keys(PortalLinksMap);
      expect(mapIds.length).toBeGreaterThan(0);

      for (const mapId of mapIds) {
        const portals = getPortalLinksForMap(mapId);
        expect(Array.isArray(portals), `Mapa "${mapId}" em PortalLinksMap deve ser um array`).toBe(true);

        for (const portal of portals) {
          // Identificador e Tipo
          expect(portal.id?.trim(), `Portal no mapa "${mapId}" sem id válido`).toBeTruthy();
          expect(['direct', 'request']).toContain(portal.type);

          // Coordenadas e Tamanho
          expect(Number.isFinite(portal.coordinates?.x), `Portal "${portal.id}" coord x inválida`).toBe(true);
          expect(Number.isFinite(portal.coordinates?.y), `Portal "${portal.id}" coord y inválida`).toBe(true);
          expect(portal.size?.width, `Portal "${portal.id}" size.width deve ser > 0`).toBeGreaterThan(0);
          expect(portal.size?.height, `Portal "${portal.id}" size.height deve ser > 0`).toBeGreaterThan(0);

          // Destino
          expect(portal.targetMapId?.trim(), `Portal "${portal.id}" sem targetMapId`).toBeTruthy();

          if (portal.targetSpawnCoords) {
            expect(Number.isFinite(portal.targetSpawnCoords.x), `Portal "${portal.id}" targetSpawnCoords.x inválido`).toBe(true);
            expect(Number.isFinite(portal.targetSpawnCoords.y), `Portal "${portal.id}" targetSpawnCoords.y inválido`).toBe(true);
          }

          // Hitboxes (se configuradas no PolygonWebEditor)
          if (portal.hitboxes && portal.hitboxes.length > 0) {
            for (const hb of portal.hitboxes) {
              expect(['polygon', 'circle']).toContain(hb.type);
              expect(Number.isFinite(hb.coordinates?.x)).toBe(true);
              expect(Number.isFinite(hb.coordinates?.y)).toBe(true);

              if (hb.type === 'polygon') {
                expect(Array.isArray((hb as any).points), `Hitbox "${hb.id}" de "${portal.id}" deve ter points`).toBe(true);
                expect((hb as any).points.length, `Hitbox "${hb.id}" de "${portal.id}" deve ter >= 3 pontos`).toBeGreaterThanOrEqual(3);
              } else if (hb.type === 'circle') {
                expect((hb as any).radius, `Hitbox círculo "${hb.id}" deve ter radius > 0`).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. IntermapRegistry: Registro de Salas e Interiores                        */
  /* -------------------------------------------------------------------------- */
  describe('3. IntermapRegistry (Catálogo de Intermaps & Interiores)', () => {
    it('deve validar interior_black_default e suas propriedades de dimensão e portais', () => {
      const def = IntermapRegistry.get('interior_black_default');
      expect(def, 'Intermap "interior_black_default" deve estar registrado').toBeDefined();
      expect(def?.width).toBeGreaterThan(0);
      expect(def?.height).toBeGreaterThan(0);

      if (def?.portals) {
        for (const portal of def.portals) {
          expect(Number.isFinite(portal.x)).toBe(true);
          expect(Number.isFinite(portal.y)).toBe(true);
          expect(portal.width).toBeGreaterThan(0);
          expect(portal.height).toBeGreaterThan(0);
          expect(portal.targetMapId?.trim()).toBeTruthy();
        }
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. MetaProgressionMap: Pools Globais de Atributos e Broches                */
  /* -------------------------------------------------------------------------- */
  describe('4. MetaProgressionMap (Pools de Atributos & Broches)', () => {
    it('GlobalStatPool deve conter atributos com tipos, categorias e valores base positivos', () => {
      expect(GlobalStatPool.length).toBeGreaterThan(0);
      for (const stat of GlobalStatPool) {
        expect(stat.type?.trim()).toBeTruthy();
        expect(stat.name?.trim()).toBeTruthy();
        expect(['base', 'derived', 'elemental']).toContain(stat.category);
        expect(stat.baseValue).toBeGreaterThan(0);
      }
    });

    it('GlobalBroochPool deve conter broches bem configurados com tipos válidos', () => {
      expect(GlobalBroochPool.length).toBeGreaterThan(0);
      for (const brooch of GlobalBroochPool) {
        expect(brooch.id?.trim()).toBeTruthy();
        expect(brooch.name?.trim()).toBeTruthy();
        expect(['ativo', 'passivo']).toContain(brooch.type);
        expect(['circle', 'triangle']).toContain(brooch.shape);
        expect(Array.isArray(brooch.tags)).toBe(true);
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. ElementalEffectIcons: Catálogo Canônico de Efeitos Elementais & VFX     */
  /* -------------------------------------------------------------------------- */
  describe('5. ElementalEffectIcons (Catálogo de Efeitos Elementais e Axiomáticos)', () => {
    const EXPECTED_EFFECTS: ElementalEffectKey[] = [
      'abys', 'air', 'crystal', 'dark', 'decay', 'fire', 'ground', 'holy', 'ice',
      'infernous', 'life', 'light', 'magic', 'magma', 'nature', 'negation', 'ordem',
      'poison', 'potencia', 'thunder', 'water'
    ];

    it('deve conter todos os 21 efeitos elementais e axiomáticos registrados', () => {
      expect(Object.keys(ElementalEffectIcons).length).toBe(21);
      for (const effectId of EXPECTED_EFFECTS) {
        const effect = ElementalEffectIcons[effectId];
        expect(effect, `Efeito "${effectId}" deve estar definido em ElementalEffectIcons`).toBeDefined();
        if (effect) {
          expect(effect.id).toBe(effectId);
          expect(effect.name.trim()).toBeTruthy();
          expect(effect.domainFile.endsWith('.ts')).toBe(true);
          expect(effect.icon32Url).toMatch(/effect_.*\.png/);
          expect(effect.icon64Url).toMatch(/effect_.*_x2\.png/);
          expect(effect.description.trim()).toBeTruthy();
        }
      }
    });

    it('todos os 21 efeitos devem estar registrados como VFX estáticos no VisualConfigMap', () => {
      for (const effectId of EXPECTED_EFFECTS) {
        const vfxKey = `effect_${effectId}`;
        const config = VisualConfigMap[vfxKey];
        expect(config, `Chave VFX "${vfxKey}" deve estar registrada no VisualConfigMap`).toBeDefined();
        if (config && config.category === 'vfx') {
          const vfx = config as VFXVisualConfig;
          expect(vfx.category).toBe('vfx');
          expect(vfx.animations).toBeDefined();
          const staticAnim = vfx.animations['static'];
          expect(staticAnim).toBeDefined();
          if (staticAnim) {
            expect(staticAnim.imageSrc).toBe(ElementalEffectIcons[effectId].icon32Url);
            expect(staticAnim.frameCount).toBe(1);
            expect(staticAnim.frameWidth).toBe(32);
            expect(staticAnim.frameHeight).toBe(32);
          }
        }
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. SkillIcons: Catálogo Canônico de Habilidades & Broches (40px e 80px)   */
  /* -------------------------------------------------------------------------- */
  describe('6. SkillIcons (Catálogo de Ícones de Habilidades e Broches)', () => {
    const EXPECTED_SKILLS: SkillIconKey[] = [
      'w_t1_strike', 'w_t1_heavy_blow', 'w_t1_iron_skin', 'w_t2_cleave',
      'w_t2_shield_bash', 'w_t3_berserk', 'w_t3_war_cry', 'w_t4_ground_slam',
      'w_t3_colossus_vigor', 'w_t5_blade_dance', 'w_t4_armor_breaker', 'w_t5_avatar_of_war',
      'n_t1_reap', 'n_t1_death_aura', 'n_t1_soul_leech', 'n_t2_lifesteal',
      'n_t2_bone_spear', 'n_t3_soul', 'n_t3_grasp_of_dead', 'n_t4_corpse_explosion',
      'n_t3_spectral_veil', 'n_t5_wail_of_banshee', 'n_t4_death_warden', 'n_t5_dance_of_dead',
      'm_t1_fireball', 'm_t2_burn', 'm_t3_knowledge', 'm_t4_teleport', 'm_t5_blackhole',
      'pesc_t1_fisgada', 'pesc_t2_net', 'pesc_t3_leviata', 'pesc_t4_fishpet',
      'gs_t1_quickdraw', 'gs_t2_fanhammer', 'gs_t3_deadeye',
      'brooch_active_heal', 'brooch_active_meteor', 'brooch_active_luck', 'brooch_active_dash',
      'brooch_active_shield', 'brooch_active_berserk',
      'brooch_titan', 'brooch_shadow', 'brooch_pyro_core', 'brooch_luck_charm',
      'brooch_vampiric', 'brooch_reroll_master', 'brooch_phoenix'
    ];

    it('deve conter todos os 49 ícones de habilidades e broches registrados', () => {
      expect(Object.keys(SkillIcons).length).toBe(49);
      for (const skillId of EXPECTED_SKILLS) {
        const skill = SkillIcons[skillId];
        expect(skill, `Habilidade/Broche "${skillId}" deve estar definido em SkillIcons`).toBeDefined();
        if (skill) {
          expect(skill.id).toBe(skillId);
          expect(skill.name.trim()).toBeTruthy();
          expect(['warrior', 'necromancer', 'mage', 'fisherman', 'gunslinger', 'brooch']).toContain(skill.classId);
          expect(['active', 'passive', 'attribute', 'essential', 'rare']).toContain(skill.nodeType);
          expect(skill.icon40Url).toMatch(/.*\.png/);
          expect(skill.icon80Url).toMatch(/.*_x2\.png/);
          expect(skill.description.trim()).toBeTruthy();
        }
      }
    });
  });
});
