/** @file Contém a classe Canvas, uma abstração para gerenciar o elemento HTMLCanvasElement e seu contexto 2D. */
/** @class Canvas Encapsula a criação e manipulação do elemento `<canvas>`. Seu papel é fornecer uma interface de alto nível para interagir com o canvas, como limpá-lo, e expor o elemento e seu contexto para outros componentes como o `Renderer` e a `Camera`. */
export default class Canvas {
  /** O elemento HTML `<canvas>` gerenciado por esta classe, exposto como `readonly` para componentes que precisam de acesso direto (ex: para estilização ou medição). */
  public readonly element: HTMLCanvasElement;
  /** O contexto de renderização 2D (`CanvasRenderingContext2D`) do canvas, exposto como `readonly` para que componentes de desenho possam operar sobre ele. */
  public readonly ctx: CanvasRenderingContext2D;
  /** Razão entre pixels físicos e pixels CSS (`window.devicePixelRatio`), ex: 1.25 com a escala de 125% do Windows. O buffer do canvas usa pixels físicos. */
  public pixelRatio: number = 1;
  /** Largura visível do canvas em pixels CSS (mesmo sistema de coordenadas de `MouseEvent.clientX`). */
  public viewportWidth: number = 0;
  /** Altura visível do canvas em pixels CSS (mesmo sistema de coordenadas de `MouseEvent.clientY`). */
  public viewportHeight: number = 0;

  /** @constructor Cria um novo elemento `<canvas>`, obtém seu contexto 2D, define suas dimensões iniciais e o anexa a um elemento container no DOM. @param container O elemento HTML pai onde o canvas será inserido. @param width A largura inicial do canvas em pixels CSS. @param height A altura inicial do canvas em pixels CSS. */
  constructor(container: HTMLElement, width: number, height: number) {
    this.element = document.createElement('canvas');
    const initialWidth = width > 0 ? width : (typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 800);
    const initialHeight = height > 0 ? height : (typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 600);
    this.resize(initialWidth, initialHeight);

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
    //! Se sobrar alguma diferença fracionária entre buffer e tela, o navegador amplia sem interpolar (sem borrar a pixel art)
    this.element.style.imageRendering = 'pixelated';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';
    window.addEventListener('resize', () => {
      if (window.innerWidth === 0 || window.innerHeight === 0) return;
      this.resize(window.innerWidth, window.innerHeight);
    });
  }

  /** Redimensiona o buffer do canvas para a resolução física da tela (pixels CSS × `devicePixelRatio`), evitando que o navegador estique e borre o frame quando a escala do sistema operacional é maior que 100%. @param cssWidth Largura visível em pixels CSS. @param cssHeight Altura visível em pixels CSS. */
  public resize(cssWidth: number, cssHeight: number): void {
    const ratio = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    this.pixelRatio = ratio;
    this.viewportWidth = cssWidth;
    this.viewportHeight = cssHeight;
    this.element.width = Math.round(cssWidth * ratio);
    this.element.height = Math.round(cssHeight * ratio);
  }

  /** Fase de Desenho: Limpa toda a área do canvas com preto sólido, garantindo que qualquer área fora dos chunks seja preta. */
  public clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.element.width, this.element.height);
  }
}