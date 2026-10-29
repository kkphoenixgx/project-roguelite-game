import type { Meta, StoryObj } from '@storybook/html';
import ConfirmationModalGui, { ConfirmationModal } from './ConfirmationModalGui';

const meta: Meta = {
  title: 'HUD/ConfirmationModal',
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
    toolbar.style.gap = '8px';
    toolbar.style.zIndex = '9999';

    const actions = [
      {
        label: 'Abrir Confirmação (Sair do Jogo)',
        handler: () => {
          ConfirmationModal.confirm({
            title: 'Sair do Jogo',
            message: 'Tem certeza que deseja fechar a janela? Todo o progresso salvo foi gravado com segurança.',
            confirmText: 'Sair do Jogo',
            cancelText: 'Continuar Jogando',
            variant: 'danger'
          });
        }
      },
      {
        label: 'Abrir Alerta (Sucesso)',
        handler: () => {
          ConfirmationModal.alert({
            title: 'Progresso Gravado',
            message: 'Suas memórias foram gravadas com sucesso no Registro do Vilarejo.',
            confirmText: 'Entendido',
            variant: 'success'
          });
        }
      },
      {
        label: 'Abrir Confirmação (Substituir Save)',
        handler: () => {
          ConfirmationModal.confirm({
            title: 'Substituir Save',
            message: 'Deseja realmente substituir o Slot 1 por um novo save limpo? O progresso anterior será perdido.',
            confirmText: 'Criar Novo',
            cancelText: 'Cancelar',
            variant: 'warning'
          });
        }
      }
    ];

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.onclick = () => action.handler();
      toolbar.appendChild(btn);
    }
    wrapper.appendChild(toolbar);

    const gui = ConfirmationModalGui.getInstance();
    gui.confirm({
      title: 'Sair do Jogo',
      message: 'Tem certeza de que deseja fechar a janela do jogo?',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    return wrapper;
  }
};

export default meta;

export const Default: StoryObj = {};

