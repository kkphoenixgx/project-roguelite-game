// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ConfirmationModalGui, { ConfirmationModal } from '../../../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui';

describe('ConfirmationModalGui & ConfirmationModal', () => {
    let modal: ConfirmationModalGui;

    beforeEach(() => {
        // Não apagamos document.body.innerHTML para não destruir o singleton inicializado no DOM!
        modal = ConfirmationModalGui.getInstance();
    });

    afterEach(() => {
        if (modal) modal.hide();
    });

    it('deve obter a instância singleton corretamente', () => {
        const instance1 = ConfirmationModalGui.getInstance();
        const instance2 = ConfirmationModalGui.getInstance();
        expect(instance1).toBe(instance2);
        expect(document.getElementById('confirmation-modal-overlay')).not.toBeNull();
    });

    it('deve exibir modal com configurações padrão e resolver confirmação com true', async () => {
        const confirmPromise = modal.confirm({
            title: 'Excluir Item',
            message: 'Tem certeza que deseja excluir?',
            variant: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Voltar'
        });

        const overlay = document.getElementById('confirmation-modal-overlay');
        expect(overlay?.style.display).toBe('flex');
        expect(overlay?.classList.contains('is-open')).toBe(true);

        const titleEl = document.getElementById('cm-title');
        const messageEl = document.getElementById('cm-message');
        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        const btnCancel = document.getElementById('cm-btn-cancel') as HTMLButtonElement;
        const dialog = overlay?.querySelector('.cm-dialog');

        expect(titleEl?.textContent).toBe('Excluir Item');
        expect(messageEl?.textContent).toBe('Tem certeza que deseja excluir?');
        expect(btnConfirm?.textContent).toBe('Excluir');
        expect(btnConfirm?.classList.contains('cm-btn-danger')).toBe(true);
        expect(btnCancel?.textContent).toBe('Voltar');
        expect(dialog?.classList.contains('variant-danger')).toBe(true);

        // Clica em confirmar
        btnConfirm.click();
        const result = await confirmPromise;
        expect(result).toBe(true);
        expect(overlay?.classList.contains('is-hidden')).toBe(true);
    });

    it('deve resolver com false ao clicar em cancelar', async () => {
        const confirmPromise = modal.confirm({
            title: 'Cancelar Ação',
            message: 'Deseja abortar?',
            variant: 'warning'
        });

        const btnCancel = document.getElementById('cm-btn-cancel') as HTMLButtonElement;
        btnCancel.click();

        const result = await confirmPromise;
        expect(result).toBe(false);
    });

    it('deve suportar variante warning com classe cm-btn-primary', async () => {
        const confirmPromise = modal.confirm({
            title: 'Atenção',
            message: 'Isso requer cuidado',
            variant: 'warning'
        });

        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        expect(btnConfirm.classList.contains('cm-btn-primary')).toBe(true);
        btnConfirm.click();
        await confirmPromise;
    });

    it('deve suportar variantes info e success com seus respectivos ícones', async () => {
        const p1 = modal.confirm({ title: 'Info', message: 'Nota', variant: 'info' });
        const iconContainer = document.getElementById('cm-icon-container');
        expect(iconContainer?.innerHTML).toContain('stroke="#38bdf8"');
        modal.cancel();
        await p1;

        const p2 = modal.confirm({ title: 'Sucesso', message: 'Feito', variant: 'success' });
        expect(iconContainer?.innerHTML).toContain('stroke="#2ecc71"');
        modal.cancel();
        await p2;
    });

    it('deve ocultar botão cancelar quando showCancel for false', async () => {
        const confirmPromise = modal.confirm({
            title: 'Aviso Importante',
            message: 'Somente leitura',
            showCancel: false
        });

        const btnCancel = document.getElementById('cm-btn-cancel') as HTMLButtonElement;
        expect(btnCancel.style.display).toBe('none');

        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        btnConfirm.click();
        const result = await confirmPromise;
        expect(result).toBe(true);
    });

    it('deve responder a teclas Escape e Enter via teclado', async () => {
        // Teste Enter
        const enterPromise = modal.confirm({ title: 'Confirmar Enter', message: 'Pressione enter' });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
        const enterResult = await enterPromise;
        expect(enterResult).toBe(true);

        // Teste Escape
        const escPromise = modal.confirm({ title: 'Cancelar Escape', message: 'Pressione esc' });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        const escResult = await escPromise;
        expect(escResult).toBe(false);

        // Tecla aleatória não deve fechar o modal
        const otherPromise = modal.confirm({ title: 'Outra Tecla', message: 'Pressione x' });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'KeyX', cancelable: true }));
        const overlay = document.getElementById('confirmation-modal-overlay');
        expect(overlay?.classList.contains('is-open')).toBe(true);
        modal.cancel();
        await otherPromise;
    });

    it('deve ignorar eventos de teclado quando fechado', () => {
        modal.hide();
        expect(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        }).not.toThrow();
    });

    it('deve suportar alert() com string direta e com ModalOptions', async () => {
        const alertPromise = modal.alert('Mensagem simples');
        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        expect(btnConfirm.textContent).toBe('Entendido');
        btnConfirm.click();
        await alertPromise;

        const alertOptionsPromise = modal.alert({
            title: 'Alerta Objeto',
            message: 'Detalhes aqui',
            confirmText: 'Ok'
        });
        expect(btnConfirm.textContent).toBe('Ok');
        btnConfirm.click();
        await alertOptionsPromise;
    });

    it('deve funcionar via fachada estática ConfirmationModal', async () => {
        const confirmPromise = ConfirmationModal.confirm({
            title: 'Fachada',
            message: 'Teste de fachada'
        });
        const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
        btnConfirm.click();
        const result = await confirmPromise;
        expect(result).toBe(true);

        const alertPromise = ConfirmationModal.alert('Fachada alert');
        btnConfirm.click();
        await alertPromise;
    });

    it('deve permitir cancelamento manual via modal.cancel()', async () => {
        const p = modal.confirm({ title: 'Cancelar', message: 'Teste cancel()' });
        modal.cancel();
        const res = await p;
        expect(res).toBe(false);

        // Chamada direta de cancel() sem ativo
        expect(() => modal.cancel()).not.toThrow();
    });
});
