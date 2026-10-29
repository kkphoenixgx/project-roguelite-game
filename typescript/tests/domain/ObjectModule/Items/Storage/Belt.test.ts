import { describe, it, expect } from 'vitest';
import Belt from '../../../../../../typescript/domain/ObjectModule/Items/Storage/Belt';
import LeatherBelt from '../../../../../../typescript/domain/ObjectModule/Items/Storage/LeatherBelt';
import Hoe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Hoe';
import Axe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Axe';
import Hammer from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Hammer';

describe('Belt (Domínio - Cinto de Utilidades & Storage)', () => {
  it('deve inicializar com a capacidade correta e categoria "belt"', () => {
    const belt = new Belt(4, 'Cinto de Teste', 'Descrição', 300, 'common', 300, 100);

    expect(belt.category).toBe('belt');
    expect(belt.capacity).toBe(4);
    expect(belt.toolSlots.length).toBe(4);
    expect(belt.toolSlots.every(slot => slot === null)).toBe(true);
    expect(belt.activeToolIndex).toBe(0);
    expect(belt.getActiveTool()).toBeNull();
    expect(belt.equippedToolsCount).toBe(0);
  });

  it('deve equipar ferramentas nos slots disponíveis', () => {
    const belt = new LeatherBelt(); // 4 slots
    const hoe = new Hoe();
    const axe = new Axe();

    const prev1 = belt.equipTool(hoe);
    expect(prev1).toBeNull();
    expect(belt.toolSlots[0]).toBe(hoe);
    expect(belt.equippedToolsCount).toBe(1);

    // Próxima ferramenta deve ir para o próximo slot livre
    const prev2 = belt.equipTool(axe);
    expect(prev2).toBeNull();
    expect(belt.toolSlots[1]).toBe(axe);
    expect(belt.equippedToolsCount).toBe(2);
  });

  it('deve substituir ferramenta em um slot específico e retornar a ferramenta anterior', () => {
    const belt = new LeatherBelt();
    const hoe = new Hoe();
    const hammer = new Hammer();

    belt.equipTool(hoe, 1);
    expect(belt.toolSlots[1]).toBe(hoe);

    const replaced = belt.equipTool(hammer, 1);
    expect(replaced).toBe(hoe);
    expect(belt.toolSlots[1]).toBe(hammer);
  });

  it('deve desequipar ferramentas corretamente', () => {
    const belt = new LeatherBelt();
    const hoe = new Hoe();
    belt.equipTool(hoe, 2);

    const removed = belt.unequipTool(2);
    expect(removed).toBe(hoe);
    expect(belt.toolSlots[2]).toBeNull();

    // Desequipar slot vazio deve retornar null
    expect(belt.unequipTool(2)).toBeNull();
    // Desequipar índice fora dos limites deve retornar null
    expect(belt.unequipTool(99)).toBeNull();
  });

  it('deve gerenciar a ferramenta ativa', () => {
    const belt = new LeatherBelt();
    const hoe = new Hoe();
    const axe = new Axe();

    belt.equipTool(hoe, 0);
    belt.equipTool(axe, 1);

    expect(belt.getActiveTool()).toBe(hoe);

    const changed = belt.setActiveToolIndex(1);
    expect(changed).toBe(true);
    expect(belt.getActiveTool()).toBe(axe);

    // Índice inválido não deve alterar
    expect(belt.setActiveToolIndex(10)).toBe(false);
    expect(belt.getActiveTool()).toBe(axe);
  });
});
