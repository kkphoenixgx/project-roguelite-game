import PauseMenuGui from './PauseMenuGui';

export default {
  title: 'GUI/PauseMenu',
};

export const Default = () => {
  const gui = new PauseMenuGui(() => console.log('Resumed!'), () => console.log('Quit!'));
  gui.show();
  return gui['container'];
};

export const SettingsOpened = () => {
  const gui = new PauseMenuGui(() => console.log('Resumed!'), () => console.log('Quit!'));
  gui.show();
  
  // Simulate clicking the settings button
  setTimeout(() => {
      const settingsBtn = gui['container'].querySelector('#pm-btn-settings') as HTMLElement;
      if (settingsBtn) settingsBtn.click();
  }, 50);
  
  return gui['container'];
};
