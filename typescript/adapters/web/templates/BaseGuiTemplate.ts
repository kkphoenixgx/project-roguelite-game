import { logger } from "../shared/Logger";

/**
 * ==============================================================================
 * CLASSE BASE CANÔNICA PARA INTERFACES DOM (HUD / MODAL / GLASSMORPHISM)
 * ==============================================================================
 * Fornece ciclo de vida previsível, injeção segura de estilos/HTML, controle
 * de visibilidade e descarte sem vazamento de memória ou elementos órfãos no DOM.
 * ==============================================================================
 */
export abstract class BaseGuiTemplate {
  protected container!: HTMLElement;
  protected styleElement: HTMLStyleElement | null = null;
  protected _isOpen: boolean = false;
  protected domListeners: { element: Element | Window | Document; event: string; handler: EventListenerOrEventListenerObject }[] = [];

  constructor(
    protected readonly hudId: string,
    rawHtml: string,
    rawCss?: string
  ) {
    this.injectStyles(rawCss);
    this.injectHtml(rawHtml);
    this.setupElements();
    this.bindEvents();
    logger.log('init', `[${this.hudId}] GUI inicializada e injetada no DOM.`);
  }

  /**
   * Injeta os estilos CSS correspondentes na tag <head>, evitando duplicatas.
   */
  protected injectStyles(css?: string): void {
    if (!css) return;
    const styleId = `style-${this.hudId}`;
    const existing = document.getElementById(styleId);
    if (existing) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = styleId;
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);
  }

  /**
   * Converte a string HTML no elemento raiz da interface e anexa ao <body>.
   */
  protected injectHtml(rawHtml: string): void {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml.trim();
    const element = tempDiv.firstElementChild as HTMLElement;

    if (!element) {
      throw new Error(`[${this.hudId}] Falha ao converter template HTML em elemento DOM.`);
    }

    this.container = element;
    if (!this.container.id) {
      this.container.id = this.hudId;
    }

    document.body.appendChild(this.container);
  }

  /**
   * Registra um event listener gerenciado, garantindo remoção automática no destroy().
   */
  protected addManagedListener(
    target: Element | Window | Document,
    event: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    target.addEventListener(event, handler);
    this.domListeners.push({ element: target, event, handler });
  }

  /**
   * Busca um elemento tipado dentro do container da GUI.
   */
  protected query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const el = this.container.querySelector<T>(selector);
    if (!el) {
      logger.log('error', `[${this.hudId}] Elemento não encontrado pelo seletor: ${selector}`);
    }
    return el as T;
  }

  /**
   * Busca múltiplos elementos dentro do container da GUI.
   */
  protected queryAll<T extends HTMLElement = HTMLElement>(selector: string): NodeListOf<T> {
    return this.container.querySelectorAll<T>(selector);
  }

  /**
   * Sobrescreva para capturar referências aos elementos internos (botões, listas, etc.).
   */
  protected abstract setupElements(): void;

  /**
   * Sobrescreva para registrar os ouvintes de clique e inputs.
   */
  protected abstract bindEvents(): void;

  /**
   * Indica se a janela ou menu está visível.
   */
  public get isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Exibe a interface com tratamento de transição ou classe css.
   */
  public show(...args: any[]): void {
    this.container.style.display = 'block';
    this.container.classList.remove('is-hidden');
    this.container.classList.add('is-open');
    this._isOpen = true;
    this.onShown(...args);
  }

  /**
   * Oculta a interface.
   */
  public hide(): void {
    this.container.style.display = 'none';
    this.container.classList.remove('is-open');
    this.container.classList.add('is-hidden');
    this._isOpen = false;
    this.onHidden();
  }

  /**
   * Alterna entre visível e oculto.
   */
  public toggle(): void {
    if (this._isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Hook opcional disparado logo após a exibição.
   */
  protected onShown(..._args: any[]): void {}

  /**
   * Hook opcional disparado logo após a ocultação.
   */
  protected onHidden(): void {}

  /**
   * Destrói a interface, desregistrando todos os listeners e limpando o DOM.
   */
  public destroy(): void {
    for (const { element, event, handler } of this.domListeners) {
      element.removeEventListener(event, handler);
    }
    this.domListeners = [];

    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }

    if (this.styleElement && this.styleElement.parentElement) {
      this.styleElement.parentElement.removeChild(this.styleElement);
    }

    this._isOpen = false;
    logger.log('init', `[${this.hudId}] GUI destruída e limpa do DOM.`);
  }
}

export default BaseGuiTemplate;
