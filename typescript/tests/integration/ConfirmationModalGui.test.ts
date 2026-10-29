// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ConfirmationModalGui, { ConfirmationModal } from '../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui';

describe('ConfirmationModalGui - Componente Modal Performático e Reutilizável', () => {
    let modal: ConfirmationModalGui;

    beforeEach(() => {
        modal = ConfirmationModalGui.getInstance();
        modal.hide();
    });

    afterEach(() => {
        modal.hide();
    });

    it('deve inicializar e injetar o elemento no DOM com as tags esperadas', () => {
        const overlay = document.getElementById('confirmation-modal-overlay');
        expect(overlay).not.toBeNull();
        expect(modal.isOpen).toBe(false);
    });

    it('deve abrir o modal com título, mensagem e variante danger', async () => {
        const promise = modal.confirm({
            title: 'Excluir Arquivo',
            message: 'Deseja realmente apagar o registro?',
            confirmText: 'Excluir',
            cancelText: 'Manter',
            variant: 'danger'
        });

        expect(modal.isOpen).toBe(true);

        const titleEl = document.getElementById('cm-title');
        const messageEl = document.getElementById('cm-message');
        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        const btnCancel = document.getElementById('cm-btn-cancel') as HTMLButtonElement;
        const dialogEl = document.querySelector('.cm-dialog') as HTMLElement;

        expect(titleEl?.textContent).toBe('Excluir Arquivo');
        expect(messageEl?.textContent).toBe('Deseja realmente apagar o registro?');
        expect(btnConfirm?.textContent).toBe('Excluir');
        expect(btnCancel?.textContent).toBe('Manter');
        expect(dialogEl?.classList.contains('variant-danger')).toBe(true);

        btnConfirm?.click();
        const result = await promise;
        expect(result).toBe(true);
        expect(modal.isOpen).toBe(false);
    });

    it('deve resolver como false ao clicar no botão Cancelar', async () => {
        const promise = modal.confirm({
            title: 'Ação Cancelável',
            message: 'Você deseja prosseguir?',
            variant: 'warning'
        });

        const btnCancel = document.getElementById('cm-btn-cancel') as HTMLButtonElement;
        btnCancel?.click();

        const result = await promise;
        expect(result).toBe(false);
        expect(modal.isOpen).toBe(false);
    });

    it('deve resolver como false e fechar o modal ao pressionar Escape', async () => {
        const promise = modal.confirm({
            title: 'Fechar com Escape',
            message: 'Pressione Escape para sair',
            variant: 'info'
        });

        expect(modal.isOpen).toBe(true);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        const result = await promise;
        expect(result).toBe(false);
        expect(modal.isOpen).toBe(false);
    });

    it('deve resolver como true e fechar o modal ao pressionar Enter', async () => {
        const promise = modal.confirm({
            title: 'Confirmar com Enter',
            message: 'Pressione Enter para aceitar',
            variant: 'info'
        });

        expect(modal.isOpen).toBe(true);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        const result = await promise;
        expect(result).toBe(true);
        expect(modal.isOpen).toBe(false);
    });

    it('deve cancelar o modal programaticamente ao invocar modal.cancel()', async () => {
        const promise = modal.confirm({
            title: 'Cancelamento Externo',
            message: 'Cancelado pelo UIManager',
            variant: 'warning'
        });

        expect(modal.isOpen).toBe(true);
        modal.cancel();

        const result = await promise;
        expect(result).toBe(false);
        expect(modal.isOpen).toBe(false);
    });

    it('deve exibir apenas o botão de confirmação e ocultar cancelar no modo alert()', async () => {
        const alertPromise = modal.alert({
            title: 'Aviso Importante',
            message: 'Operação concluída com sucesso.',
            variant: 'success'
        });

        expect(modal.isOpen).toBe(true);
        const btnCancel = document.getElementById('cm-btn-cancel') as HTMLButtonElement;
        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;

        expect(btnCancel.style.display).toBe('none');
        expect(btnConfirm.textContent).toBe('Entendido');

        btnConfirm.click();
        await alertPromise;
        expect(modal.isOpen).toBe(false);
    });

    it('deve suportar chamada direta via fachada estática ConfirmationModal.confirm()', async () => {
        const promise = ConfirmationModal.confirm({
            title: 'Fachada Estática',
            message: 'Teste de chamada estática',
            variant: 'info'
        });

        expect(modal.isOpen).toBe(true);
        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        btnConfirm.click();

        const result = await promise;
        expect(result).toBe(true);
    });
});
