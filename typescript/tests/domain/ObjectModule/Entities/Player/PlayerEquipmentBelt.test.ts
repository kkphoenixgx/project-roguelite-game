import { describe, it, expect, vi } from 'vitest';
import Player from '../../../../../../typescript/domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../../../typescript/domain/ObjectModule/Entities/Attributes';
import LeatherBelt from '../../../../../../typescript/domain/ObjectModule/Items/Storage/LeatherBelt';
import Hoe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Hoe';
import Axe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Axe';
import ToolActionGateway from '../../../../../../typescript/domain/facadeComponents/ToolActionGateway';

describe('Player Equipment: Belt & Tools Integration', () => {
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

  it('deve equipar um Cinto (Belt) no slot de equipamento do jogador', () => {
    const player = createPlayer();
    const belt = new LeatherBelt();
    player.backpack.push(belt);

    player.equipItem(0);

    expect(player.backpack.length).toBe(0);
    expect(player.equipment.belt).toBe(belt);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('slot [belt]')
    }));
  });

  it('deve impedir o jogador de equipar ferramenta se não tiver Cinto equipado', () => {
    const player = createPlayer();
    const hoe = new Hoe();
    player.backpack.push(hoe);

    player.equipItem(0);

    // Deve continuar na mochila
    expect(player.backpack.length).toBe(1);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      channel: 'error',
      message: expect.stringContaining('Cinto (Belt)')
    }));
  });

  it('deve equipar ferramentas no Cinto quando o Cinto estiver equipado', () => {
    const player = createPlayer();
    const belt = new LeatherBelt();
    const hoe = new Hoe();
    const axe = new Axe();

    player.backpack.push(belt);
    player.equipItem(0); // Equipa cinto

    player.backpack.push(hoe);
    player.backpack.push(axe);

    player.equipItem(0); // Equipa enxada no cinto
    expect(player.equipment.belt?.toolSlots[0]).toBe(hoe);
    expect(player.backpack.length).toBe(1); // Sobrou o machado

    player.equipItem(0); // Equipa machado no cinto
    expect(player.equipment.belt?.toolSlots[1]).toBe(axe);
    expect(player.backpack.length).toBe(0);
  });

  it('deve desequipar ferramentas do Cinto de volta para a mochila', () => {
    const player = createPlayer();
    const belt = new LeatherBelt();
    const hoe = new Hoe();

    player.backpack.push(belt);
    player.equipItem(0);

    player.backpack.push(hoe);
    player.equipItem(0);
    expect(player.backpack.length).toBe(0);

    // Desequipar ferramenta
    const success = player.unequipToolFromBelt(0);
    expect(success).toBe(true);
    expect(player.equipment.belt?.toolSlots[0]).toBeNull();
    expect(player.backpack.length).toBe(1);
    expect(player.backpack[0]).toBe(hoe);
  });

  it('deve validar ações de ferramentas através do ToolActionGateway', () => {
    const player = createPlayer();
    const belt = new LeatherBelt();
    const hoe = new Hoe();

    const mockLogger = { log: vi.fn() };
    const gateway = new ToolActionGateway(player, mockLogger as any, mockEventManager as any);

    // Sem ferramenta ativa:
    gateway.handleToolAction({
      toolType: 'hoe',
      targetPosition: { x: 50, y: 50 },
      zoneType: 'farmland'
    });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('toolActionResult', expect.objectContaining({
      success: false,
      reason: 'no_tool_equipped'
    }));

    // Equipa cinto e enxada
    player.backpack.push(belt);
    player.equipItem(0);
    player.backpack.push(hoe);
    player.equipItem(0);

    // Tentativa de usar enxada dentro da cidade (proibido pela regra de design não-sandbox)
    gateway.handleToolAction({
      toolType: 'hoe',
      targetPosition: { x: 50, y: 50 },
      zoneType: 'city'
    });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('toolActionResult', expect.objectContaining({
      success: false,
      reason: 'invalid_zone'
    }));

    // Tentativa em farmland (permitido!)
    const initialDurability = hoe.durability;
    gateway.handleToolAction({
      toolType: 'hoe',
      targetPosition: { x: 50, y: 50 },
      zoneType: 'farmland'
    });

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('toolActionResult', expect.objectContaining({
      success: true,
      modifiedTile: expect.objectContaining({
        type: 'tilled_soil'
      })
    }));
    expect(hoe.durability).toBe(initialDurability - 1);
  });
});
