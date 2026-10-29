import { describe, it, expect, beforeEach, vi } from 'vitest';
import RuneGrammarEngine from '../../../../domain/templates/mage/RuneGrammarEngine';
import MageSpellCraftingRegistry from '../../../../domain/templates/mage/MageSpellCraftingRegistry';
import Vector2D from '../../../../domain/shared/Vector2D';
import BurnStatus from '../../../../domain/ObjectModule/Entities/Status/BurnStatus';
import NegationEffect from '../../../../domain/ObjectModule/Items/Effects/ElementalEffects/NegationEffect';
import Attack from '../../../../domain/ObjectModule/Items/Attack';

describe('Axioma de Negação: Ordo + Caos (Dispel, Anti-Magia e Falha Axiomática)', () => {
  let grammarEngine: RuneGrammarEngine;
  let spellRegistry: MageSpellCraftingRegistry;
  let mockPlayer: any;
  let mockEventManager: any;

  beforeEach(() => {
    grammarEngine = RuneGrammarEngine.createDefault();
    spellRegistry = MageSpellCraftingRegistry.createDefault();

    mockEventManager = {
      dispatch: vi.fn(),
      subscribe: vi.fn()
    };

    mockPlayer = {
      id: 1,
      objectId: 'player',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      facingDirection: new Vector2D(1, 0),
      attributes: {
        hp: 100,
        maxHp: 100,
        mana: 100,
        maxMana: 100,
        intelligence: 20,
        strength: 10,
        critChance: 0,
        critDamage: 100,
        lifesteal: 0,
        bonusArea: 0,
        splashDamage: 0
      },
      activeStatuses: new Map(),
      activeStatusesList: [],
      applyStatus(status: any) {
        this.activeStatuses.set(status.id, status);
        this.activeStatusesList.push(status);
        if (typeof status.apply === 'function') status.apply(this);
      },
      removeStatus(statusId: string) {
        const s = this.activeStatuses.get(statusId);
        if (!s) return false;
        this.activeStatuses.delete(statusId);
        const idx = this.activeStatusesList.indexOf(s);
        if (idx !== -1) this.activeStatusesList.splice(idx, 1);
        if (typeof s.onRemove === 'function') s.onRemove(this);
        return true;
      },
      resetAccelerator: vi.fn()
    };
  });

  it('deve sintetizar o token "negation" ao combinar Ordem + Caos no RuneGrammarEngine', () => {
    // Ordem = magic (spell_9) + light (spell_8)
    // Caos = magic (spell_9) + dark (spell_7) ou dark direto
    const buffer = ['spell_0', 'spell_9', 'spell_8', 'spell_7', 'spell_9'];
    const parsed = grammarEngine.parse(buffer);

    // Deep-2: magic + light -> ordem. ordem + dark -> negation.
    expect(parsed.elements).toContain('negation');
    expect(parsed.elements).toContain('magic');
  });

  it('deve causar Falha Axiomática (Fizzle) ao combinar Negação com elementos materiais (ex: Fogo)', () => {
    // Projétil (spell_0) + Ordem (spell_9 + spell_8) + Caos (spell_7) + Fogo (spell_4)
    const buffer = ['spell_0', 'spell_9', 'spell_8', 'spell_7', 'spell_4'];
    const result = spellRegistry.executeSpell(buffer as any, mockPlayer, mockEventManager);

    // O feitiço falha (auto-cancelamento)
    expect(result).toBe(false);
    // Mana é consumido pelo atrito ontológico
    expect(mockPlayer.attributes.mana).toBeLessThan(100);
    // Dispara log de Falha Axiomática
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('Falha Axiomática')
    }));
  });

  it('deve aplicar a Lâmina Anti-Magia via Self + Potência + Negação + Magia', () => {
    // Self (spell_1) + Potência (spell_9 + spell_4) + Ordem (spell_9 + spell_8) + Caos (spell_7) + Magia (spell_9)
    const buffer = ['spell_1', 'spell_9', 'spell_4', 'spell_9', 'spell_8', 'spell_7', 'spell_9'];
    const result = spellRegistry.executeSpell(buffer as any, mockPlayer, mockEventManager);

    expect(result).toBe(true);
    expect(mockPlayer.hasAntiMagicBlade).toBe(true);
    expect(mockPlayer.activeStatuses.has('blade_infusion_antimagic')).toBe(true);

    const status = mockPlayer.activeStatuses.get('blade_infusion_antimagic');
    expect(status.tier).toBe(2);
    expect(status.category).toBe('magical');
  });

  it('um golpe com Lâmina Anti-Magia deve purgar até 1 buff mágico de Tier <= 3 do alvo', () => {
    mockPlayer.hasAntiMagicBlade = true;

    const mockTarget: any = {
      id: 2,
      objectId: 'enemyMage',
      coordinates: { x: 120, y: 100 },
      size: { width: 32, height: 32 },
      attributes: { hp: 50, defence: 0 },
      activeStatuses: new Map(),
      activeStatusesList: [],
      takeDamage(dmgInfo: any) {
        this.attributes.hp -= dmgInfo.totalDamage;
        return dmgInfo.totalDamage;
      },
      removeStatus(statusId: string) {
        this.activeStatuses.delete(statusId);
        this.activeStatusesList = this.activeStatusesList.filter((s: any) => s.id !== statusId);
        return true;
      }
    };

    // Alvo possui buff de escudo arcano (Tier 2, magical) e buff mítico inato (Tier 10, innate)
    const arcanaShield = { id: 'arcane_shield', category: 'magical', tier: 2 };
    const bossAura = { id: 'boss_godmode', category: 'innate', tier: 10 };

    mockTarget.activeStatuses.set(arcanaShield.id, arcanaShield);
    mockTarget.activeStatusesList.push(arcanaShield);
    mockTarget.activeStatuses.set(bossAura.id, bossAura);
    mockTarget.activeStatusesList.push(bossAura);

    const attack = new Attack(mockPlayer, 20, 'physical', []);
    attack.execute(mockTarget, new Vector2D(1, 0));

    // O escudo mágico de Tier 2 deve ter sido purgado!
    expect(mockTarget.activeStatuses.has('arcane_shield')).toBe(false);
    // A aura inata de Tier 10 permanece inviolável!
    expect(mockTarget.activeStatuses.has('boss_godmode')).toBe(true);
  });

  it('NegationEffect deve purgar status mágico de Tier <= 3 e ignorar status de Tier superior', () => {
    const effect = new NegationEffect(mockEventManager, 3);

    const mockTarget: any = {
      id: 3,
      objectId: 'dummyTarget',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      activeStatuses: new Map(),
      activeStatusesList: [],
      removeStatus: vi.fn((statusId: string) => {
        mockTarget.activeStatuses.delete(statusId);
        mockTarget.activeStatusesList = mockTarget.activeStatusesList.filter((s: any) => s.id !== statusId);
        return true;
      })
    };

    // Status de Tier 4 (não deve ser removido pelo Dispel básico)
    const heavyBuff = { id: 'heavy_barrier', category: 'magical', tier: 4 };
    // Status de Tier 2 (deve ser purgado)
    const lightBuff = { id: 'light_shield', category: 'magical', tier: 2 };

    mockTarget.activeStatuses.set(heavyBuff.id, heavyBuff);
    mockTarget.activeStatusesList.push(heavyBuff);
    mockTarget.activeStatuses.set(lightBuff.id, lightBuff);
    mockTarget.activeStatusesList.push(lightBuff);

    effect.apply(mockTarget);

    expect(mockTarget.removeStatus).toHaveBeenCalledWith('light_shield');
    expect(mockTarget.removeStatus).not.toHaveBeenCalledWith('heavy_barrier');
  });

  it('o Manto Nulo (Self + Negation + Magic) deve purgar aflições mágicas do próprio conjurador', () => {
    // Conjurador está com queimadura mágica (Tier 1)
    const burn = new BurnStatus(5, mockPlayer);
    (burn as any).tier = 1;
    (burn as any).category = 'magical';
    mockPlayer.applyStatus(burn);

    expect(mockPlayer.activeStatuses.has('burn')).toBe(true);

    // Convocação de Self + Ordem + Caos + Magia
    const buffer = ['spell_1', 'spell_9', 'spell_8', 'spell_7', 'spell_9'];
    const result = spellRegistry.executeSpell(buffer as any, mockPlayer, mockEventManager);

    expect(result).toBe(true);
    // A queimadura foi purgada do jogador
    expect(mockPlayer.activeStatuses.has('burn')).toBe(false);
  });
});
