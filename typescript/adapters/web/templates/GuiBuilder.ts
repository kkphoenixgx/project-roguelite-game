import { BaseGuiTemplate } from "./BaseGuiTemplate";

export interface GuiBuilderConfig {
  id: string;
  html: string;
  css?: string;
  parentElement?: HTMLElement;
  initialOpen?: boolean;
}

/**
 * ==============================================================================
 * BUILDER FLUENTE PARA CRIAÇÃO ÁGIL DE INTERFACES DOM
 * ==============================================================================
 * Permite instanciar telas, caixas de diálogo, HUDs secundários e menus flutuantes
 * com poucos encadeamentos, sem precisar escrever uma classe completa quando a GUI
 * é simples.
 * ==============================================================================
 */
export class GuiBuilder {
  private id: string = `gui-${Date.now()}`;
  private htmlContent: string = '<div></div>';
  private cssContent?: string;
  private actions: { selector: string; event: string; handler: (e: Event, gui: BaseGuiTemplate) => void }[] = [];
  private onShowCallback?: (gui: BaseGuiTemplate) => void;
  private onHideCallback?: (gui: BaseGuiTemplate) => void;

  public static create(id?: string): GuiBuilder {
    const builder = new GuiBuilder();
    if (id) builder.id = id;
    return builder;
  }

  public withTemplate(html: string, css?: string): this {
    this.htmlContent = html;
    if (css !== undefined) this.cssContent = css;
    return this;
  }

  public onAction(selector: string, event: string, handler: (e: Event, gui: BaseGuiTemplate) => void): this {
    this.actions.push({ selector, event, handler });
    return this;
  }

  public onButtonClick(selector: string, handler: (e: MouseEvent, gui: BaseGuiTemplate) => void): this {
    return this.onAction(selector, 'click', (e, gui) => handler(e as MouseEvent, gui));
  }

  public onShown(callback: (gui: BaseGuiTemplate) => void): this {
    this.onShowCallback = callback;
    return this;
  }

  public onHidden(callback: (gui: BaseGuiTemplate) => void): this {
    this.onHideCallback = callback;
    return this;
  }

  public build(): BaseGuiTemplate {
    const id = this.id;
    const html = this.htmlContent;
    const css = this.cssContent;
    const actions = [...this.actions];
    const showCb = this.onShowCallback;
    const hideCb = this.onHideCallback;

    class DynamicGui extends BaseGuiTemplate {
      constructor() {
        super(id, html, css);
      }

      protected setupElements(): void {}

      protected bindEvents(): void {
        for (const action of actions) {
          const elements = this.queryAll(action.selector);
          elements.forEach(el => {
            this.addManagedListener(el, action.event, (e) => action.handler(e, this));
          });
        }
      }

      protected override onShown(): void {
        if (showCb) showCb(this);
      }

      protected override onHidden(): void {
        if (hideCb) hideCb(this);
      }
    }

    return new DynamicGui();
  }
}

export default GuiBuilder;
