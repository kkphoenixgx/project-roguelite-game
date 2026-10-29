/**
 * Define a interface para um retângulo, usada para limites e objetos.
 * A Quadtree precisa que os objetos tenham uma caixa delimitadora (bounding box).
 */
interface IRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Representa um nó em uma Quadtree.
 * Cada nó pode conter objetos ou ser subdividido em quatro sub-nós.
 */
export default class Quadtree<T> {
  private max_objects: number;
  private max_levels: number;
  private level: number;
  private elements: (T & IRectangle)[];
  private bounds: IRectangle;
  private nodes: Quadtree<T>[];

  /**
   * @param boundary Os limites (x, y, largura, altura) deste nó da árvore.
   * @param max_objects O número máximo de objetos que um nó pode conter antes de se subdividir.
   * @param max_levels A profundidade máxima da árvore.
   * @param level O nível de profundidade atual deste nó.
   */
  constructor(boundary: IRectangle, max_objects: number = 10, max_levels: number = 4, level: number = 0) {
    this.max_objects = max_objects;
    this.max_levels = max_levels;
    this.level = level;
    this.bounds = boundary;
    this.elements = [];
    this.nodes = [];
  }

  /**
   * Subdivide o nó atual em quatro quadrantes filhos.
   */
  private subdivide(): void {
    const nextLevel = this.level + 1;
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes[0] = new Quadtree<T>({ x: x + subWidth, y: y, width: subWidth, height: subHeight }, this.max_objects, this.max_levels, nextLevel);
    this.nodes[1] = new Quadtree<T>({ x: x, y: y, width: subWidth, height: subHeight }, this.max_objects, this.max_levels, nextLevel);
    this.nodes[2] = new Quadtree<T>({ x: x, y: y + subHeight, width: subWidth, height: subHeight }, this.max_objects, this.max_levels, nextLevel);
    this.nodes[3] = new Quadtree<T>({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.max_objects, this.max_levels, nextLevel);
  }

  /**
   * Determina em qual quadrante um objeto pertence.
   * @param element O objeto a ser verificado.
   * @returns O índice do nó (0-3) ou -1 se não couber completamente em nenhum filho.
   */
  private getIndex(element: IRectangle): number {
    let index = -1;
    const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
    const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

    const topQuadrant = (element.y < horizontalMidpoint && element.y + element.height <= horizontalMidpoint);
    const bottomQuadrant = (element.y >= horizontalMidpoint);

    if (element.x < verticalMidpoint && element.x + element.width <= verticalMidpoint) {
      if (topQuadrant) {
        index = 1;
      } else if (bottomQuadrant) {
        index = 2;
      }
    } else if (element.x >= verticalMidpoint) {
      if (topQuadrant) {
        index = 0;
      } else if (bottomQuadrant) {
        index = 3;
      }
    }
    return index;
  }

  /** Insere um elemento na Quadtree. */
  public insert(element: T & IRectangle): void {
    if (this.nodes[0]) {
      const index = this.getIndex(element);

      if (index !== -1) {
        const node = this.nodes[index];
        if (node) {
          node.insert(element);
        }
        return;
      }
    }

    this.elements.push(element);

    if (this.elements.length > this.max_objects && this.level < this.max_levels) {
      if (!this.nodes[0]) {
        this.subdivide();
      }

      // Iteração reversa para garantir Swap and Pop O(1) sem pular índices
      let i = this.elements.length;
      while (i--) {
        const el = this.elements[i];
        if (!el) continue;
        const index = this.getIndex(el);
        
        if (index !== -1 && this.nodes[index]) {
          this.nodes[index].insert(el);
          
          // Remoção O(1) (Swap and Pop)
          const last = this.elements.pop();
          if (i < this.elements.length && last !== undefined) {
            this.elements[i] = last;
          }
        }
      }
    }
  }

  /**
   * Retorna uma lista de todos os objetos que podem colidir com a área fornecida.
   * @param area A área para a qual se deseja encontrar colisões potenciais.
   * @param found Buffer mutável para evitar alocação de memória (Zero-GC).
   * @returns O array mutado `found`.
   */
  public retrieve(area: IRectangle, found: (T & IRectangle)[] = []): (T & IRectangle)[] {
    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];
      if (el && !(
        area.x > el.x + el.width ||
        area.x + area.width < el.x ||
        area.y > el.y + el.height ||
        area.y + area.height < el.y
      )) {
        found.push(el);
      }
    }

    if (this.nodes.length > 0) {
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        if (node && node.intersects(area)) {
          node.retrieve(area, found);
        }
      }
    }
    return found;
  }

  /**
   * Verifica se a caixa delimitadora se sobrepõe aos limites deste nó.
   */
  private intersects(area: IRectangle): boolean {
    const boundary = this.bounds;
    return !(
      area.x > boundary.x + boundary.width ||
      area.x + area.width < boundary.x ||
      area.y > boundary.y + boundary.height ||
      area.y + area.height < boundary.y
    );
  }

  /** Limpa a Quadtree, mantendo as referências de memória dos nós filhos (Zero-GC). */
  public clear(): void {
    this.elements.length = 0;

    if (this.nodes.length) {
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        if (node) {
          node.clear();
        }
      }
    }
  }
}