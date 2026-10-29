// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToastGui, { type ToastVariant } from '../../../../adapters/web/GUIS/toastModule/ToastGui';
import fs from 'node:fs';
import path from 'node:path';

const toastCss = fs.readFileSync(path.resolve(__dirname, '../../../../adapters/web/GUIS/toastModule/toast.css'), 'utf-8');

describe('ToastGui (Unit Tests - Notificações Flutuantes Glassmorphism)', () => {
    let toastGui: ToastGui;

    beforeEach(() => {
        vi.useFakeTimers();
        toastGui = ToastGui.getInstance();
    });

    afterEach(() => {
        toastGui.clearAll();
        vi.useRealTimers();
    });

    it('deve obter a instância singleton e injetar o container no DOM', () => {
        const instance1 = ToastGui.getInstance();
        const instance2 = ToastGui.getInstance();
        expect(instance1).toBe(instance2);

        const container = document.getElementById('toast-notifications-container');
        expect(container).not.toBeNull();
        expect(container?.getAttribute('aria-live')).toBe('polite');
    });

    it('deve configurar posicionamento fixo no canto inferior direito no CSS', () => {
        expect(toastCss).toContain('bottom: 24px;');
        expect(toastCss).toContain('right: 24px;');
        expect(toastCss).toContain('align-items: flex-end;');
    });

    it('deve criar e exibir um toast de erro com estrutura DOM e role alert', () => {
        const errorMsg = "A habilidade 'Fan the Hammer' requer a arma da classe 'Gunslinger' equipada na mão principal!";
        const toastId = toastGui.createToast(errorMsg, 'error', 4000);

        expect(toastId).toBeGreaterThan(0);
        expect(toastGui.activeCount).toBe(1);

        const container = document.getElementById('toast-notifications-container');
        const toastEl = container?.querySelector('.toast-item') as HTMLElement;

        expect(toastEl).not.toBeNull();
        expect(toastEl.classList.contains('variant-error')).toBe(true);
        expect(toastEl.getAttribute('role')).toBe('alert');

        const messageEl = toastEl.querySelector('.toast-message');
        expect(messageEl?.textContent).toBe(errorMsg);

        const iconEl = toastEl.querySelector('.toast-icon');
        expect(iconEl).not.toBeNull();

        const closeBtn = toastEl.querySelector('.toast-close-btn');
        expect(closeBtn).not.toBeNull();
    });

    it('deve aplicar as variantes corretas de estilo (warning, info, success)', () => {
        const variants: ToastVariant[] = ['warning', 'info', 'success'];

        for (const variant of variants) {
            toastGui.createToast(`Teste ${variant}`, variant, 3000);
            const container = document.getElementById('toast-notifications-container');
            const toastEl = container?.querySelector(`.variant-${variant}`);
            expect(toastEl).not.toBeNull();
        }
    });

    it('deve remover automaticamente o toast após o tempo estipulado (auto-dismiss)', () => {
        toastGui.createToast('Mensagem temporária', 'error', 2000);
        expect(toastGui.activeCount).toBe(1);

        // Avança o timer de duração
        vi.advanceTimersByTime(2000);

        // O item entra em modo de saída (.toast-hiding)
        expect(toastGui.activeCount).toBe(0);

        // Avança o tempo de transição CSS de fade-out (300ms)
        vi.advanceTimersByTime(350);

        const container = document.getElementById('toast-notifications-container');
        expect(container?.querySelectorAll('.toast-item').length).toBe(0);
    });

    it('deve permitir fechamento manual ao clicar no botão de fechar', () => {
        toastGui.createToast('Toast com botão fechar', 'error', 10000);
        const container = document.getElementById('toast-notifications-container');
        const closeBtn = container?.querySelector('.toast-close-btn') as HTMLButtonElement;

        expect(closeBtn).not.toBeNull();
        closeBtn.click();

        expect(toastGui.activeCount).toBe(0);

        vi.advanceTimersByTime(350);
        expect(container?.querySelectorAll('.toast-item').length).toBe(0);
    });

    it('deve respeitar o limite máximo de toasts simultâneos e descartar o mais antigo', () => {
        for (let i = 1; i <= 6; i++) {
            toastGui.createToast(`Mensagem ${i}`, 'info', 10000);
        }

        // Limite máximo configurado é 5
        expect(toastGui.activeCount).toBe(5);

        const container = document.getElementById('toast-notifications-container');
        // Mensagem 1 deve ter sido descartada
        expect(container?.textContent).not.toContain('Mensagem 1');
        expect(container?.textContent).toContain('Mensagem 6');
    });

    it('deve limpar todos os toasts imediatamente via clearAll', () => {
        toastGui.createToast('Toast 1', 'error', 5000);
        toastGui.createToast('Toast 2', 'warning', 5000);
        expect(toastGui.activeCount).toBe(2);

        toastGui.clearAll();
        expect(toastGui.activeCount).toBe(0);

        const container = document.getElementById('toast-notifications-container');
        expect(container?.querySelectorAll('.toast-item').length).toBe(0);
    });

    it('deve descartar e limpar completamente o container no destroy', () => {
        toastGui.createToast('Para destruir', 'error', 5000);
        toastGui.destroy();

        expect(toastGui.activeCount).toBe(0);
        expect(document.getElementById('toast-notifications-container')).toBeNull();
    });
});
