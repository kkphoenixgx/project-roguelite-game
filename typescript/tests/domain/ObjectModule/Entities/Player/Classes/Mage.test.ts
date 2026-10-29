import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Mage from '../../../../../../domain/ObjectModule/Entities/Player/Classes/Mage';
import Player from '../../../../../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../../../domain/ObjectModule/Entities/Attributes';
import DefaultXPTable from '../../../../../../domain/ObjectModule/Entities/DefaultXPTable';
import type { IEventManager } from '../../../../../../domain/eventDispacher/IGameEvents';
import Vector2D from '../../../../../../domain/shared/Vector2D';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };
const xpTable = new DefaultXPTable();

describe('Mage (Spell Parser & Buffer)', () => {
  let mage: Mage;
  let player: Player;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    const attrs = new Attributes(8, 1, 10, 10, 10, 10, 10, 10);
    attrs.mana = 500; // Mana abundante para os testes
    player = new Player(1, { x: 0, y: 0 }, attrs, mockEventManager);
    player.facingDirection = new Vector2D(1, 0);
    
    mage = new Mage(xpTable, player, mockEventManager);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve estourar a concentração (Fail-Fast) se o buffer exceder 9 entradas', () => {
    for (let i = 0; i < 10; i++) {
      mage.onSpellInput({ x: 0, y: 0 }, 'spell_1');
    }
    expect((mage as any).spellBuffer.length).toBe(0);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('Spell buffer overflow')
    }));
  });

  it('deve acionar auto-cast após o SPELL_TIMEOUT', () => {
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_0');
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_4');
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_0');
    
    expect((mage as any).spellBuffer.length).toBe(3);
    
    vi.advanceTimersByTime(500); // Avança o relógio interno para forçar o trigger
    
    expect((mage as any).spellBuffer.length).toBe(0);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'fireball'
    }));
  });

  it('deve fundir elementos adjacentes (Deep 2 Fusion Engine) corretamente', () => {
    // spell_0 = projectile, spell_9 = magic, spell_4 = fire. magic+fire = potencia
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_0');
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_9');
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_4');
    
    mage.onCastSpell(); // Disparo manual síncrono

    // Valida se o array de elementos resolvido dentro do DynamicProjectile contém o elemento fundido
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'dynamicSpell',
      spellElements: ['potencia'] 
    }));
  });

  it('não deve castar magias se a mana for insuficiente e deve preservar o buffer limpo', () => {
    player.attributes.mana = 0; // Zera a mana
    
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_0');
    mage.onCastSpell();
    
    // Não deve despachar spawn, mas deve ter consumido o buffer para não engasgar o próximo cast
    expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('spawn', expect.anything());
    expect((mage as any).spellBuffer.length).toBe(0);
  });

  it('deve impedir a digitação se o mago estiver atordoado', () => {
    player.activeStatuses.set('stun', { id: 'stun' } as any);
    
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_0');
    mage.onCastSpell();
    
    expect((mage as any).spellBuffer.length).toBe(0);
    expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('spawn', expect.anything());
  });

  it('deve ativar a Infusão de Lâmina de Ar ao digitar Self + Potência + Air (spell_1, spell_9, spell_4, spell_4, spell_5)', () => {
    const initialSpeed = player.attributes.speed;

    // spell_1 (self)
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_1');
    // spell_9 (magic) + spell_4 (fire) -> Potência
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_9');
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_4');
    // spell_4 (fire) + spell_5 (water) -> Air
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_4');
    mage.onSpellInput({ x: 0, y: 0 }, 'spell_5');

    mage.onCastSpell(); // Dispara o feitiço

    // O status da Infusão de Ar deve estar ativo no jogador
    expect(player.activeStatuses.has('blade_infusion_air')).toBe(true);
    expect((player as any).elementalType).toBe('air');
    expect(player.attributes.speed).toBe(initialSpeed + 25);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
      effect: 'windGust'
    }));
  });
});