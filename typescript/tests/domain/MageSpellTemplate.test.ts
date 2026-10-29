import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RuneGrammarEngine,
  MageSpellTemplate,
  MageSpellCraftingRegistry
} from '../../domain/templates/mage';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import Vector2D from '../../domain/shared/Vector2D';


describe('Mage Spell Templates & Crafting Engine', () => {
  let mockEventManager: IEventManager;
  let player: Player;
  let registry: MageSpellCraftingRegistry;

  beforeEach(() => {
    mockEventManager = { on: vi.fn(), dispatch: vi.fn() };
    const attrs = new Attributes(10, 1, 10, 10, 10, 30, 30, 30); // maxMana = 300
    attrs.mana = 200;
    player = new Player(1, { x: 100, y: 100 }, attrs, mockEventManager);
    player.facingDirection = new Vector2D(1, 0);

    registry = MageSpellCraftingRegistry.createDefault();
  });


  describe('RuneGrammarEngine', () => {
    it('deve extrair formas, forças e elementos brutos de uma sequência de inputs', () => {
      const engine = RuneGrammarEngine.createDefault();
      const grammar = engine.parse(['spell_0', 'spell_2', 'spell_4']);

      expect(grammar.forms).toEqual(['projectile']);
      expect(grammar.forces).toEqual(['knockback']);
      expect(grammar.rawElements).toEqual(['fire']);
      expect(grammar.elements).toEqual(['fire']);
      expect(grammar.runeCount).toBe(3);
      expect(grammar.sequence).toBe('spell_0,spell_2,spell_4');
    });

    it('deve fundir pares elementais adjacentes (Deep-2 Fusion)', () => {
      const engine = RuneGrammarEngine.createDefault();

      // fire + water = air
      const g1 = engine.parse(['spell_4', 'spell_5']);
      expect(g1.elements).toEqual(['air']);

      // magic + dark = caos
      const g2 = engine.parse(['spell_9', 'spell_7']);
      expect(g2.elements).toEqual(['caos']);

      // fire + ground = magma, seguido de light (sem par)
      const g3 = engine.parse(['spell_4', 'spell_6', 'spell_8']);
      expect(g3.elements).toEqual(['magma', 'light']);
    });

    it('permite registrar runas customizadas e novas fusões elementais', () => {
      const engine = new RuneGrammarEngine();
      engine.registerRune('spell_mod_plasma', 'element', 'plasma');
      engine.registerRune('spell_mod_fire', 'element', 'fire');
      engine.registerFusion('plasma', 'fire', 'solar_flare');

      const grammar = engine.parse(['spell_mod_plasma', 'spell_mod_fire']);
      expect(grammar.elements).toEqual(['solar_flare']);
    });
  });

  describe('MageSpellTemplate (Receitas Estáticas)', () => {
    it('deve construir uma receita estática fluentemente com escala de inteligência', () => {
      const recipe = MageSpellTemplate.createStatic('ice_shard', 'Fragmento de Gelo')
        .matchingSequence(['spell_0', 'spell_5', 'spell_0'])
        .withBaseDamage(25)
        .withIntelligenceScaling(1.5)
        .asProjectile('ice_shard')
        .withCastParticle('iceShard')
        .withOnHitParticle('iceShard')
        .withLogMessage('Disparou Fragmento de Gelo!')
        .build();

      expect(recipe.id).toBe('ice_shard');
      expect(recipe.name).toBe('Fragmento de Gelo');
      expect(recipe.sequence).toBe('spell_0,spell_5,spell_0');
      expect(recipe.baseDamage).toBe(25);
      expect(recipe.intelligenceMultiplier).toBe(1.5);
      expect(recipe.executionMode).toBe('projectile');
      expect(recipe.projectileType).toBe('ice_shard');
    });

    it('deve disparar erro se a receita não definir uma sequência rúnica', () => {
      const builder = MageSpellTemplate.createStatic('invalid', 'Sem Sequência');
      expect(() => builder.build()).toThrow(/matchingSequence/);
    });

    it('permite definir receitas com execução customizada', () => {
      const customFn = vi.fn().mockReturnValue(true);
      const recipe = MageSpellTemplate.createStatic('ritual', 'Grande Ritual')
        .matchingSequence(['spell_1', 'spell_8', 'spell_9', 'spell_8'])
        .withManaCost(40)
        .withCustomExecution(customFn)
        .build();

      registry.registerRecipe(recipe);

      const executed = registry.executeSpell(['spell_1', 'spell_8', 'spell_9', 'spell_8'], player, mockEventManager);
      expect(executed).toBe(true);
      expect(customFn).toHaveBeenCalled();
      expect(player.attributes.mana).toBe(160); // 200 - 40
    });
  });

  describe('MageSpellCraftingRegistry', () => {
    it('deve executar a receita estática de Bola de Fogo canônica (spell_0,spell_4,spell_0)', () => {
      const executed = registry.executeSpell(['spell_0', 'spell_4', 'spell_0'], player, mockEventManager);
      expect(executed).toBe(true);

      // Dano: base (30) + 30 * 2 = 90
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
        type: 'fireball',
        attack: expect.objectContaining({
          baseDamage: 90,
          damageType: 'magical'
        })
      }));


      expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
        effect: 'fireExplosion'
      }));

      // Custo de mana padrão: 5 * 3 = 15
      expect(player.attributes.mana).toBe(185);
    });

    it('deve executar a receita estática de Mísseis Mágicos com busca por vizinhos', () => {
      const executed = registry.executeSpell(['spell_0', 'spell_9', 'spell_0'], player, mockEventManager);
      expect(executed).toBe(true);

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
        radius: 600
      }));

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
        effect: 'magicPulse'
      }));
    });

    it('deve executar feitiço dinâmico (Projétil + Knockback + Fogo/Água = Air)', () => {
      // spell_0 = projectile, spell_2 = knockback, spell_4 = fire, spell_5 = water -> elements: ['air']
      const executed = registry.executeSpell(['spell_0', 'spell_2', 'spell_4', 'spell_5'], player, mockEventManager);
      expect(executed).toBe(true);

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
        type: 'dynamicSpell',
        spellElements: ['air']
      }));

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
        effect: 'magicAura'
      }));
    });

    it('deve executar feitiço dinâmico Self (spell_1 + spell_3 [Pull Dash] + spell_4 [Fogo AoE])', () => {
      const executed = registry.executeSpell(['spell_1', 'spell_3', 'spell_4'], player, mockEventManager);
      expect(executed).toBe(true);

      // Self Pull gera VFX de rastro de pull
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
        type: 'pull-force'
      }));

      // Self com elemento fogo gera requisição de vizinhos para AoE ao redor do conjurador
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
        radius: 150
      }));

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
        effect: 'fireExplosion'
      }));
    });

    it('permite registrar uma nova receita em runtime sem alterar a classe Mage', () => {
      const lightningOrb = MageSpellTemplate.createStatic('lightning_orb', 'Orbe de Relâmpago')
        .matchingSequence(['spell_0', 'spell_4', 'spell_8']) // Projétil + Fogo + Luz (Thunder)
        .withBaseDamage(45)
        .asProjectile('lightning_orb')
        .withCastParticle('slashSparks')
        .withLogMessage('Cast Orbe de Relâmpago!')
        .build();

      registry.registerRecipe(lightningOrb);

      const executed = registry.executeSpell(['spell_0', 'spell_4', 'spell_8'], player, mockEventManager);
      expect(executed).toBe(true);

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
        type: 'lightning_orb'
      }));
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
        message: 'Cast Orbe de Relâmpago!'
      }));
    });

    it('permite registrar um novo solucionador de forma dinâmica (ex: Channeled Beam)', () => {
      // Registra uma nova forma rúnica 'beam' vinculada a 'spell_f'
      registry.grammarEngine.registerRune('spell_f', 'form', 'beam');

      const beamSolver = vi.fn().mockImplementation((ctx) => {
        ctx.eventManager.dispatch('spawnVisual', {
          type: 'channeled-beam' as any,
          coordinates: ctx.spawnCoordinates,
          duration: 1.0
        });
        return true;
      });

      registry.registerFormSolver('beam', beamSolver);

      const executed = registry.executeSpell(['spell_f', 'spell_4'], player, mockEventManager);
      expect(executed).toBe(true);
      expect(beamSolver).toHaveBeenCalledWith(expect.objectContaining({
        forms: ['beam'],
        elements: ['fire']
      }));
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
        type: 'channeled-beam'
      }));
    });

    it('recusa execução caso o jogador esteja sob Stun ou Paralisia', () => {
      player.activeStatuses.set('stun', { id: 'stun' } as any);
      const executed = registry.executeSpell(['spell_0', 'spell_4', 'spell_0'], player, mockEventManager);
      expect(executed).toBe(false);
      expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('spawn', expect.anything());
    });

    it('recusa execução caso o jogador não tenha mana suficiente', () => {
      player.attributes.mana = 2; // Menor que o custo de 15
      const executed = registry.executeSpell(['spell_0', 'spell_4', 'spell_0'], player, mockEventManager);
      expect(executed).toBe(false);
      expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('spawn', expect.anything());
      expect(player.attributes.mana).toBe(2); // Mana intocada
    });

    describe('Dynamic Spell: Self Fire Abyss (Transmutação Demoníaca)', () => {
      it('deve sintetizar dinamicamente a forma de Demônio Abissal a partir de Self + Fire + Water + Dark', async () => {
        const { registerAbyssalDemon } = await import('../../domain/templates/mage/spells');

        registerAbyssalDemon(registry);

        const initialMaxHp = (player.attributes as any)._maxHp;

        // spell_1 (self) + spell_4 (fire) + spell_5 (water) + spell_7 (dark)
        // water + dark é fundido pelo motor em 'abys'!
        const executed = registry.executeSpell(['spell_1', 'spell_4', 'spell_5', 'spell_7'], player, mockEventManager);
        expect(executed).toBe(true);

        // Verifica que o status da transformação foi aplicado
        expect(player.activeStatuses.has('abyssal_demon_active')).toBe(true);

        // Verifica modificações da transformação: +100 Max HP, Tint #8B0000, Scale 1.3
        expect((player.attributes as any)._maxHp).toBe(initialMaxHp + 100);
        expect(player.visualTint).toBe('#8B0000');
        expect(player.visualScale).toBe(1.3);

        // Verifica partículas e logs de conjuração
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
          effect: 'fireExplosion'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
          effect: 'darkPulse'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
          message: expect.stringContaining('Demônio Abissal')
        }));

        // Simula a reversão do status ao fim do efeito
        const status = player.activeStatuses.get('abyssal_demon_active');
        status.remove();

        // Verifica restauração dos atributos e visual
        expect((player.attributes as any)._maxHp).toBe(initialMaxHp);
        expect(player.visualTint).toBeUndefined();
        expect(player.visualScale).toBeUndefined();
      });

      it('deve disparar a regra dinâmica mesmo com runas adicionais (ex: Self + Knockback + Fire + Abyss)', async () => {
        const { abyssalDemonDynamicRule } = await import('../../domain/templates/mage/spells');
        const customRegistry = new MageSpellCraftingRegistry();
        customRegistry.registerDynamicRule(abyssalDemonDynamicRule);

        // spell_1 (self) + spell_2 (knockback) + spell_4 (fire) + spell_5 (water) + spell_7 (dark)
        // Essa sequência NÃO é a receita estática de 4 teclas, mas satisfaz a regra dinâmica!
        const executed = customRegistry.executeSpell(
          ['spell_1', 'spell_2', 'spell_4', 'spell_5', 'spell_7'],
          player,
          mockEventManager
        );

        expect(executed).toBe(true);
        expect(player.activeStatuses.has('abyssal_demon_active')).toBe(true);
        expect(player.visualTint).toBe('#8B0000');
        expect(player.visualScale).toBe(1.3);
      });
    });

    describe('Dynamic Spell: Escola de Encantamento (Infusões de Lâmina)', () => {
      it('deve aplicar Infusão de Ar (Self + Potência + Air) aumentando velocidade e mudando elemento para ar', async () => {
        const { registerBladeInfusions } = await import('../../domain/templates/mage/spells');
        registerBladeInfusions(registry);

        const initialSpeed = player.attributes.speed;

        // spell_1 (self) + spell_9 (magic) + spell_4 (fire) -> Potência
        // spell_4 (fire) + spell_5 (water) -> Air
        const executed = registry.executeSpell(
          ['spell_1', 'spell_9', 'spell_4', 'spell_4', 'spell_5'],
          player,
          mockEventManager
        );

        expect(executed).toBe(true);
        expect(player.activeStatuses.has('blade_infusion_air')).toBe(true);
        expect((player as any).elementalType).toBe('air');
        expect(player.attributes.speed).toBe(initialSpeed + 25);

        // Reversão do status
        const status = player.activeStatuses.get('blade_infusion_air');
        status.remove();
        expect(player.attributes.speed).toBe(initialSpeed);
        expect((player as any).elementalType).toBeUndefined();
      });

      it('deve aplicar Infusão de Luz (Self + Potência + Light) aumentando área e dano splash', async () => {
        const { registerBladeInfusions } = await import('../../domain/templates/mage/spells');
        registerBladeInfusions(registry);

        const initialAreaMultiplier = player.attributes.areaMultiplier;
        const initialSplash = player.attributes.splashDamage;

        // spell_1 (self) + spell_9 (magic) + spell_4 (fire) -> Potência
        // spell_8 (light) -> Luz
        const executed = registry.executeSpell(
          ['spell_1', 'spell_9', 'spell_4', 'spell_8'],
          player,
          mockEventManager
        );

        expect(executed).toBe(true);
        expect(player.activeStatuses.has('blade_infusion_light')).toBe(true);
        expect(player.attributes.areaMultiplier).toBeCloseTo(initialAreaMultiplier + 0.5);
        expect(player.attributes.splashDamage).toBe(initialSplash + 30);

        // Reversão do status
        const status = player.activeStatuses.get('blade_infusion_light');
        status.remove();
        expect(player.attributes.areaMultiplier).toBeCloseTo(initialAreaMultiplier);
        expect(player.attributes.splashDamage).toBe(initialSplash);
      });

    });
  });
});


