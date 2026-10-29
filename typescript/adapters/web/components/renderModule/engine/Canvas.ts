/** @file Contém a classe Canvas, uma abstração para gerenciar o elemento HTMLCanvasElement e seu contexto 2D. */
/** @class Canvas Encapsula a criação e manipulação do elemento `<canvas>`. Seu papel é fornecer uma interface de alto nível para interagir com o canvas, como limpá-lo, e expor o elemento e seu contexto para outros componentes como o `Renderer` e a `Camera`. */
export default class Canvas {
  /** O elemento HTML `<canvas>` gerenciado por esta classe, exposto como `readonly` para componentes que precisam de acesso direto (ex: para estilização ou medição). */
  public readonly element: HTMLCanvasElement;
  /** O contexto de renderização 2D (`CanvasRenderingContext2D`) do canvas, exposto como `readonly` para que componentes de desenho possam operar sobre ele. */
  public readonly ctx: CanvasRenderingContext2D;

  /** @constructor Cria um novo elemento `<canvas>`, obtém seu contexto 2D, define suas dimensões iniciais e o anexa a um elemento container no DOM. @param container O elemento HTML pai onde o canvas será inserido. @param width A largura inicial do canvas em pixels. @param height A altura inicial do canvas em pixels. */
  constructor(container: HTMLElement, width: number, height: number) {
    this.element = document.createElement('canvas');
    const initialWidth = width > 0 ? width : (typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 800);
    const initialHeight = height > 0 ? height : (typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 600);
    this.element.width = initialWidth;
    this.element.height = initialHeight;

    this.setupResponsiveStyles();

    const context = this.element.getContext('2d', { alpha: false }) || this.element.getContext('2d');
    if (!context) throw new Error('Não foi possível obter o contexto 2D do canvas.');
    this.ctx = context;

    container.appendChild(this.element);
  }

  /** Configura o elemento Canvas para ocupar toda a tela e ser responsivo a redimensionamentos da janela. */
  private setupResponsiveStyles(): void {
    this.element.style.position = 'absolute';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.width = '100vw';
    this.element.style.height = '100vh';
    this.element.style.display = 'block';
    this.element.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';
    window.addEventListener('resize', () => { 
      if (window.innerWidth === 0 || window.innerHeight === 0) return;
      this.element.width = window.innerWidth; 
      this.element.height = window.innerHeight; 
    }); 
  }

  /** Fase de Desenho: Limpa toda a área do canvas com preto sólido, garantindo que qualquer área fora dos chunks seja preta. */
  public clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.element.width, this.element.height);
  }
}