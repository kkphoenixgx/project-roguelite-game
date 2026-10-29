import type { Meta, StoryObj } from '@storybook/html';
import ToastGui from './ToastGui';

const meta: Meta = {
  title: 'HUD/ToastNotifications',
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.backgroundColor = '#12131a';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    const toolbar = document.createElement('div');
    toolbar.style.position = 'absolute';
    toolbar.style.top = '16px';
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.gap = '8px';
    toolbar.style.zIndex = '9999';

    const toastGui = ToastGui.getInstance();

    const actions = [
      {
        label: 'Erro: Arma Requerida (Gunslinger)',
        handler: () => {
          toastGui.show(
            "A habilidade 'Fan the Hammer' requer a arma da classe 'Gunslinger' equipada na mão principal!",
            'error',
            4000
          );
        }
      },
      {
        label: 'Aviso: Inventário Cheio',
        handler: () => {
          toastGui.show('Mochila cheia! Não é possível coletar Pocao de Vida.', 'warning', 3500);
        }
      },
      {
        label: 'Info: Habilidade Bloqueada',
        handler: () => {
          toastGui.show('Não é possível equipar uma habilidade bloqueada.', 'info', 3000);
        }
      },
      {
        label: 'Sucesso: Jogo Salvo',
        handler: () => {
          toastGui.show('Progresso salvo com sucesso no Registro 1.', 'success', 3000);
        }
      },
      {
        label: 'Limpar Todos',
        handler: () => {
          toastGui.clearAll();
        }
      }
    ];

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.style.padding = '8px 14px';
      btn.style.background = '#2a1b3d';
      btn.style.color = '#ffd700';
      btn.style.border = '1px solid #855cc7';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.onclick = () => action.handler();
      toolbar.appendChild(btn);
    }

    wrapper.appendChild(toolbar);

    // Exibe toast inicial de demonstração
    setTimeout(() => {
      toastGui.show(
        "A habilidade 'Fan the Hammer' requer a arma da classe 'Gunslinger' equipada na mão principal!",
        'error',
        5000
      );
    }, 100);

    return wrapper;
  }
};

export default meta;

export const Default: StoryObj = {};
