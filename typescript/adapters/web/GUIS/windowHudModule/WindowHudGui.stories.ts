import WindowHudGui from './WindowHudGui';

export default {
  title: 'GUI/WindowHud',
};

export const Default = () => {
  // Mock Tauri for the story to show the titlebar
  (window as any).__TAURI_INTERNALS__ = true;
  
  const gui = new WindowHudGui();
  
  const container = document.createElement('div');
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.backgroundColor = '#1a1a24'; // dark bg to see titlebar clearly
  
  // Clean up mock
  setTimeout(() => delete (window as any).__TAURI_INTERNALS__, 100);
  
  return document.getElementById('custom-titlebar') || document.createElement('div');
};
