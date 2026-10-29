import PlayerStatusGui from './PlayerStatusGui';

export default {
  title: 'GUI/PlayerStatus',
};

export const Interactive = () => {
  const container = document.createElement('div');
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.position = 'relative';
  
  // Create controls
  const controlsPanel = document.createElement('div');
  controlsPanel.style.position = 'absolute';
  controlsPanel.style.bottom = '20px';
  controlsPanel.style.left = '20px';
  controlsPanel.style.padding = '15px';
  controlsPanel.style.background = '#222';
  controlsPanel.style.border = '1px solid #444';
  controlsPanel.style.borderRadius = '8px';
  controlsPanel.style.display = 'flex';
  controlsPanel.style.gap = '10px';
  controlsPanel.style.fontFamily = 'sans-serif';
  
  const gui = new PlayerStatusGui();
  
  // Attach GUI to wrapper
  const guiContainer = document.getElementById('player-status-container');
  if (guiContainer) container.appendChild(guiContainer);
  
  let currentHp = 100;
  let currentMana = 50;
  const maxHp = 100;
  const maxMana = 50;
  
  const updateGui = () => {
    gui.update({
      hp: currentHp,
      maxHp,
      mana: currentMana,
      maxMana
    });
  };
  
  const btnDmg = document.createElement('button');
  btnDmg.textContent = 'Take 15 Damage';
  btnDmg.onclick = () => { currentHp = Math.max(0, currentHp - 15); updateGui(); };
  
  const btnHeal = document.createElement('button');
  btnHeal.textContent = 'Heal 20 HP';
  btnHeal.onclick = () => { currentHp = Math.min(maxHp, currentHp + 20); updateGui(); };
  
  const btnMana = document.createElement('button');
  btnMana.textContent = 'Spend 10 Mana';
  btnMana.onclick = () => { currentMana = Math.max(0, currentMana - 10); updateGui(); };
  
  const btnRestore = document.createElement('button');
  btnRestore.textContent = 'Restore Mana';
  btnRestore.onclick = () => { currentMana = Math.min(maxMana, currentMana + 15); updateGui(); };
  
  controlsPanel.appendChild(btnDmg);
  controlsPanel.appendChild(btnHeal);
  controlsPanel.appendChild(btnMana);
  controlsPanel.appendChild(btnRestore);
  container.appendChild(controlsPanel);
  
  // Initial render
  setTimeout(updateGui, 50); // Small delay to let DOM settle
  
  return container;
};
