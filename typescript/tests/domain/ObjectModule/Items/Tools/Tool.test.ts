import { describe, it, expect } from 'vitest';
import Hoe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Hoe';
import WateringCan from '../../../../../../typescript/domain/ObjectModule/Items/Tools/WateringCan';
import Axe from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Axe';
import Hammer from '../../../../../../typescript/domain/ObjectModule/Items/Tools/Hammer';

describe('Tools (Domínio - Ferramentas de Interação Contextual)', () => {
  it('deve validar permissões de zona da Enxada (Hoe)', () => {
    const hoe = new Hoe();
    expect(hoe.category).toBe('tool');
    expect(hoe.toolType).toBe('hoe');
    expect(hoe.canUseInZone('city')).toBe(false); // Proibido arar na cidade
    expect(hoe.canUseInZone('farmland')).toBe(true);
    expect(hoe.canUseInZone('wilderness')).toBe(true);
  });

  it('deve validar permissões de zona do Regador (WateringCan)', () => {
    const wateringCan = new WateringCan(1, 15);
    expect(wateringCan.category).toBe('tool');
    expect(wateringCan.toolType).toBe('watering_can');
    expect(wateringCan.maxWater).toBe(15);
    expect(wateringCan.currentWater).toBe(15);
    expect(wateringCan.canUseInZone('city')).toBe(false);
    expect(wateringCan.canUseInZone('farmland')).toBe(true);

    wateringCan.currentWater -= 5;
    expect(wateringCan.currentWater).toBe(10);
    wateringCan.refill();
    expect(wateringCan.currentWater).toBe(15);
  });

  it('deve validar permissões de zona do Machado (Axe)', () => {
    const axe = new Axe();
    expect(axe.category).toBe('tool');
    expect(axe.toolType).toBe('axe');
    expect(axe.canUseInZone('city')).toBe(false); // Proibido cortar árvores urbanas
    expect(axe.canUseInZone('wilderness')).toBe(true);
  });

  it('deve validar permissões de zona do Martelo (Hammer)', () => {
    const hammer = new Hammer();
    expect(hammer.category).toBe('tool');
    expect(hammer.toolType).toBe('hammer');
    expect(hammer.canUseInZone('city')).toBe(true); // Construção permitida em cidades
    expect(hammer.canUseInZone('wilderness')).toBe(false);
    expect(hammer.canUseInZone('farmland')).toBe(false);
  });
});
