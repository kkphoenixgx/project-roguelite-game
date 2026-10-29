import FloatingChatGui from './FloatingChatGui';

export default {
  title: 'GUI/FloatingChat',
};

export const Default = () => {
  const gui = new FloatingChatGui();
  
  gui.showBubble(1, "Hello there! I'm an NPC floating bubble.");
  
  setTimeout(() => {
      gui.update(
          [{ id: 1, coordinates: { x: 0, y: 0 }, size: { width: 0, height: 0 } }], 
          (wx, wy) => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      );
  }, 100);
  
  return gui['container']; // Simply return the container that was created
};
