import XpBarGui from './XpBarGui';

export default {
  title: 'GUI/XpBar',
};

export const Interactive = () => {
  const container = document.createElement('div');
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.position = 'relative';
  
  // Clean up any existing xp container if hot-reloading
  const existing = document.getElementById('xp-hud-container');
  if (existing) existing.remove();
  
  const gui = new XpBarGui();
  
  // Attach GUI to wrapper
  const guiContainer = document.getElementById('xp-hud-container');
  if (guiContainer) container.appendChild(guiContainer);
  
  let level = 5;
  let currentXp = 450;
  let xpToNextLevel = 1000;
  
  const updateGui = () => {
    gui.update({
      level, currentXp, xpToNextLevel
    });
  };
  
  const controlsPanel = document.createElement('div');
  controlsPanel.style.position = 'absolute';
  controlsPanel.style.bottom = '80px'; // above the xp bar
  controlsPanel.style.left = '20px';
  controlsPanel.style.padding = '15px';
  controlsPanel.style.background = '#222';
  controlsPanel.style.border = '1px solid #444';
  controlsPanel.style.borderRadius = '8px';
  controlsPanel.style.display = 'flex';
  controlsPanel.style.gap = '10px';
  controlsPanel.style.fontFamily = 'sans-serif';
  
  const btnAdd = document.createElement('button');
  btnAdd.textContent = 'Add 200 XP';
  btnAdd.onclick = () => { 
    currentXp += 200; 
    if (currentXp >= xpToNextLevel) {
        currentXp -= xpToNextLevel;
        level++;
        xpToNextLevel = Math.floor(xpToNextLevel * 1.2);
    }
    updateGui(); 
  };
  
  controlsPanel.appendChild(btnAdd);
  container.appendChild(controlsPanel);
  
  setTimeout(updateGui, 50);
  
  return container;
};
