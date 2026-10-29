import LevelUpRewardGui from './LevelUpRewardGui';

export default {
  title: 'GUI/LevelUpReward',
};

export const Default = () => {
  const mockDomain: any = {
    generateLocalRewards: () => [
      { id: 'stat_str', name: 'Força Titânica', description: '+1 Força Base', type: 'stat', rarity: 'comum', value: 1 },
      { id: 'der_crit_dmg', name: 'Força Bruta', description: '+20% Dano Crítico', type: 'stat', rarity: 'epico', value: 20 },
      { id: 'der_maxhp', name: 'Vitalidade Pura', description: '+20 Max Vida', type: 'stat', rarity: 'lendario', value: 20 }
    ]
  };
  
  const gui = new LevelUpRewardGui(
    mockDomain, 
    (id, coords, amount) => console.log(`Claimed: ${id} with amount ${amount}`), 
    () => console.log('Toggle pause')
  );
  
  const container = document.createElement('div');
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.appendChild(gui['container']);
  
  gui.show({ x: 0, y: 0 });
  
  return container;
};
