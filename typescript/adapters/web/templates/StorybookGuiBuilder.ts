import type { Meta, StoryObj } from '@storybook/html';

export interface StorybookGuiConfig<TGui = any> {
  /** Título no menu do Storybook (Ex: 'HUD/LevelUpReward') */
  title: string;
  /** Função de fábrica que instancia a GUI */
  factory: () => TGui;
  /** Hook para disparar a exibição da GUI (Ex: gui => gui.show()) */
  onMount?: (gui: TGui, container: HTMLElement) => void;
  /** Cor de fundo do canvas do Storybook (Padrão: Grimdark #14141c) */
  backgroundColor?: string;
  /** Seletor CSS do container principal da GUI que deve ser capturado e adicionado ao wrapper */
  containerSelector?: string;
}

/**
 * ==============================================================================
 * BUILDER E GABARITO CANÔNICO PARA HISTÓRIAS DO STORYBOOK (@storybook/html)
 * ==============================================================================
 * Isola a criação de wrappers de visualização, limpeza de instâncias órfãs no DOM
 * do navegador e estilização de fundo para testes visuais de interfaces.
 * ==============================================================================
 */
export class StorybookGuiBuilder<TGui = any> {
  private config: StorybookGuiConfig<TGui>;
  private actions: { label: string; handler: (container: HTMLElement) => void }[] = [];

  constructor(title: string = 'GUI Story', factory: () => TGui = (() => ({} as TGui))) {
    this.config = {
      title,
      factory,
      backgroundColor: '#12131a'
    };
  }

  public static create<T = any>(): StorybookGuiBuilder<T> {
    return new StorybookGuiBuilder<T>();
  }

  public static forGui<TGui>(title: string, factory: () => TGui): StorybookGuiBuilder<TGui> {
    return new StorybookGuiBuilder<TGui>(title, factory);
  }

  public withTitle(title: string): this {
    this.config.title = title;
    return this;
  }

  public withDarkBackground(): this {
    this.config.backgroundColor = '#12131a';
    return this;
  }

  public withAction(label: string, handler: (container: HTMLElement) => void): this {
    this.actions.push({ label, handler });
    return this;
  }

  public onMount(hook: (gui: TGui, container: HTMLElement) => void): this {
    this.config.onMount = hook;
    return this;
  }

  public withBackground(color: string): this {
    this.config.backgroundColor = color;
    return this;
  }

  public withContainerSelector(selector: string): this {
    this.config.containerSelector = selector;
    return this;
  }

  public build(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.backgroundColor = this.config.backgroundColor || '#12131a';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    if (this.actions.length > 0) {
      const toolbar = document.createElement('div');
      toolbar.style.position = 'absolute';
      toolbar.style.top = '16px';
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      toolbar.style.zIndex = '9999';

      for (const action of this.actions) {
        const btn = document.createElement('button');
        btn.textContent = action.label;
        btn.onclick = () => action.handler(wrapper);
        toolbar.appendChild(btn);
      }
      wrapper.appendChild(toolbar);
    }

    return wrapper;
  }

  /**
   * Constrói o objeto Meta padrão exportado pelo Storybook.
   */
  public buildMeta(): Meta {
    const { title, factory, onMount, backgroundColor, containerSelector } = this.config;

    return {
      title,
      render: () => {
        if (containerSelector) {
          document.querySelectorAll(containerSelector).forEach(el => {
            if (el.parentElement === document.body) el.remove();
          });
        }

        const wrapper = document.createElement('div');
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';
        wrapper.style.backgroundColor = backgroundColor || '#12131a';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';

        const gui = factory();

        if (containerSelector) {
          const guiEl = document.querySelector(containerSelector);
          if (guiEl) wrapper.appendChild(guiEl);
        } else if ((gui as any).container instanceof HTMLElement) {
          wrapper.appendChild((gui as any).container);
        }

        if (onMount) {
          onMount(gui, wrapper);
        }

        return wrapper;
      }
    };
  }

  /**
   * Cria uma Story padrão básica.
   */
  public buildDefaultStory(): StoryObj {
    return {
      args: {}
    };
  }
}

export default StorybookGuiBuilder;
