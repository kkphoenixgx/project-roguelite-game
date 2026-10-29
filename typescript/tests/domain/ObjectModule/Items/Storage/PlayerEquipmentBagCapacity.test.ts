import { describe, it, expect, vi } from 'vitest';
import Player from '../../../../../../typescript/domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../../../typescript/domain/ObjectModule/Entities/Attributes';
import LeatherBag from '../../../../../../typescript/domain/ObjectModule/Items/Storage/LeatherBag';
import Hoe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Hoe';

describe('PlayerEquipment: Bag Internal Storage & Strict Capacity Rules', () => {
  const mockEventManager = {
    events: {} as Record<string, Function[]>,
    on(event: string, cb: Function) {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(cb);
    },
    dispatch: vi.fn((event: string, payload: any) => {
      if (mockEventManager.events[event]) {
        mockEventManager.events[event].forEach(cb => cb(payload));
      }
    })
  };

  const createPlayer = () => {
    return new Player(
      1,
      { x: 100, y: 100 },
      new Attributes(8, 1, 10, 10, 10, 10, 10, 10),
      mockEventManager as any
    );
  };

  it('deve expandir os slots base de 24 para 36 ao equipar a LeatherBag (+12 slots)', () => {
    const player = createPlayer();
    expect(player.maxBackpackSize).toBe(24);

    const bag = new LeatherBag(); // +12 slots
    player.backpack.push(bag);
    player.equipItem(0);

    expect(player.equipment.bag).toBe(bag);
    expect(player.maxBackpackSize).toBe(36);
  });

  it('deve desequipar a bolsa diretamente para a mochila se houver menos de 24 itens', () => {
    const player = createPlayer();
    const bag = new LeatherBag();
    player.backpack.push(bag);
    player.equipItem(0);

    // Adiciona 10 itens na mochila
    for (let i = 0; i < 10; i++) {
      player.backpack.push(new Hoe(1, `Item ${i}`));
    }

    const success = player.unequipBag();
    expect(success).toBe(true);
    expect(player.equipment.bag).toBeUndefined();
    // 10 itens anteriores + o próprio item bag = 11 itens
    expect(player.backpack.length).toBe(11);
    expect(player.backpack[10]).toBe(bag);
    // Nenhum item precisou ir para dentro da bolsa pois a base tinha vagas de sobra
    expect(bag.storedItems.length).toBe(0);
  });

  it('Cenário do Usuário: 24 itens ocupados (base cheia), bolsa tem slots livres. O 24º item vira o último da bolsa e a vaga 24 vira a bolsa', () => {
    const player = createPlayer();
    const bag = new LeatherBag(); // +12 slots -> total 36
    player.backpack.push(bag);
    player.equipItem(0);

    // Enche exatamente 24 slots (todos os 24 slots base do player estão cheios)
    for (let i = 0; i < 24; i++) {
      player.backpack.push(new Hoe(1, `Item ${i}`));
    }
    expect(player.backpack.length).toBe(24);

    const item24 = player.backpack[23]; // O 24º item do jogador (índice 23)

    // Desequipa a bolsa
    const success = player.unequipBag();
    expect(success).toBe(true);
    expect(player.equipment.bag).toBeUndefined();

    // O inventário base agora tem 24 itens: os primeiros 23 itens + a própria bolsa no 24º slot (índice 23)
    expect(player.backpack.length).toBe(24);
    expect(player.backpack[23]).toBe(bag);

    // O 24º item anterior foi para dentro da bolsa!
    expect(bag.storedItems.length).toBe(1);
    expect(bag.storedItems[0]).toBe(item24);
  });

  it('deve bloquear o desequipamento da bolsa se TODOS os slots (base + bolsa = 36) estiverem ocupados', () => {
    const player = createPlayer();
    const bag = new LeatherBag(); // +12 slots -> total 36
    player.backpack.push(bag);
    player.equipItem(0);

    // Enche todos os 36 slots
    for (let i = 0; i < 36; i++) {
      player.backpack.push(new Hoe(1, `Item ${i}`));
    }
    expect(player.backpack.length).toBe(36);

    const success = player.unequipBag();
    expect(success).toBe(false);
    // A bolsa continua equipada e nenhum item é perdido
    expect(player.equipment.bag).toBe(bag);
    expect(player.backpack.length).toBe(36);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      channel: 'error',
      message: expect.stringContaining('totalmente cheios (36/36)')
    }));
  });

  it('deve re-equipar a bolsa e restaurar perfeitamente os itens guardados dentro dela', () => {
    const player = createPlayer();
    const bag = new LeatherBag();
    player.backpack.push(bag);
    player.equipItem(0);

    // Adiciona 25 itens (24 na base + 1 na bolsa)
    for (let i = 0; i < 25; i++) {
      player.backpack.push(new Hoe(1, `Item ${i}`));
    }

    // Desequipa a bolsa:
    // Itens 0..22 (23 itens) ficam na base.
    // Itens 23 e 24 (2 itens) vão para dentro da bolsa.
    // A bolsa vira o 24º item da base (índice 23).
    player.unequipBag();
    expect(player.backpack.length).toBe(24);
    expect(player.backpack[23]).toBe(bag);
    expect(bag.storedItems.length).toBe(2);

    // Agora o jogador re-equipa a bolsa que está no índice 23 da mochila!
    player.equipItem(23);

    // A bolsa foi para o slot de equipamento
    expect(player.equipment.bag).toBe(bag);
    // A bolsa interna esvaziou seus itens armazenados
    expect(bag.storedItems.length).toBe(0);
    // A mochila expandiu e todos os 25 itens originais estão íntegros!
    expect(player.backpack.length).toBe(25);
    expect(player.maxBackpackSize).toBe(36);
  });
});
