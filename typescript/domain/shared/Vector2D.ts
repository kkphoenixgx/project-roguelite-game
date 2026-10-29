/**
 * Representa um vetor 2D com coordenadas X e Y.
 */
export default class Vector2D {
    public x
    public y
    
    constructor(x:number, y:number) {
        this.x = x;
        this.y = y;
    }

    //? --- Métodos Estáticos (Não alteram 'this', retornam um novo Vector2D) ---

    /**
     * Subtrai dois vetores (a - b) e retorna um novo vetor com o resultado.
     * @param a O primeiro vetor (minuendo).
     * @param b O segundo vetor (subtraendo).
     * @returns Um novo Vector2D resultante da subtração.
     */
    public static sub(a: {x: number, y: number}, b: {x: number, y: number}): Vector2D {
        return new Vector2D(a.x - b.x, a.y - b.y);
    }

    /**
     * Adiciona dois vetores (a + b) e retorna um novo vetor com o resultado.
     */
    public static add(a: Vector2D, b: Vector2D): Vector2D {
        return new Vector2D(a.x + b.x, a.y + b.y);
    }
    //? --- Métodos de Mutação (Alteram 'this') ---

    /**
     * Normaliza o vetor, transformando-o em um vetor de unidade (magnitude = 1),
     * mantendo sua direção original.
     * * @returns {Vector2D} O próprio vetor, agora normalizado.
     */
    public normalizeMut(): Vector2D {
        const magnitude = this.magnitude();
        if (magnitude === 0) {
            this.x = 0;
            this.y = 0;
            return this;
        }
        this.x /= magnitude;
        this.y /= magnitude;
        return this;
    }

    /**
     * Multiplica o vetor por um escalar (velocidade/força).
     * @param {number} scalar O valor pelo qual multiplicar.
     * @returns {Vector2D} O vetor escalado.
     */
    public multiplyMut(scalar:number): Vector2D {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * Adiciona outro vetor a este vetor.
     * @param {Vector2D} other O outro vetor a ser somado.
     * @returns {Vector2D} O vetor resultante da soma.
     */
    public addMut(other:Vector2D): Vector2D {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /**
     * Subtrai outro vetor deste vetor (result = this - other). Retorna o próprio vetor.
     * @param {Vector2D} other O vetor a ser subtraído.
     * @returns {Vector2D} Um novo vetor resultante da subtração.
     */
    public subtractMut(other: Vector2D): Vector2D {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    /**
     * Zera os valores do vetor.
     * @returns {Vector2D} O vetor zerado.
     */
    public resetMut(): Vector2D {
        this.x = 0
        this.y = 0
        return this
    }

    /**
     * Inverte os valores de X e Y do vetor.
     * @returns {Vector2D} O vetor invertido.
     */
    public invertMut(): Vector2D {
        this.x = -this.x
        this.y = -this.y
        return this
    }

    /**
     * Rotaciona o vetor por um determinado ângulo em graus.
     * @param {number} degrees O ângulo em graus para rotacionar.
     * @returns {Vector2D} O próprio vetor, agora rotacionado.
     */
    public rotateMut(degrees: number): Vector2D {
        const radians = degrees * (Math.PI / 180);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const newX = this.x * cos - this.y * sin;
        const newY = this.x * sin + this.y * cos;
        this.x = newX;
        this.y = newY;
        return this;
    }

    //? --- Métodos de Retorno (Retornam um novo Vector2D ou um valor) ---

    /**
     * Cria uma cópia exata desta instância do vetor.
     * @returns {Vector2D} Uma nova instância do vetor.
     */
    public clone(): Vector2D {
        return new Vector2D(this.x, this.y);
    }


    /**
     * Calcula a magnitude (comprimento) deste vetor.
     * @returns {number} A magnitude do vetor.
     */
    public magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Calcula o produto escalar (Dot Product) entre este vetor e outro.
     * @param {Vector2D} other O outro vetor.
     * @returns {number} O resultado escalar do produto.
     */
    public dot(other: Vector2D): number {
        return this.x * other.x + this.y * other.y;
    }


    /**
     * Calcula o vetor perpendicular (90 graus de rotação) a este vetor.
     * O vetor perpendicular aponta para um dos lados (neste caso direita).
     * Retorna um NOVO vetor.
     * @returns {Vector2D} Um novo vetor perpendicular.
     */
    public perpendicularDireita(): Vector2D {
        return new Vector2D(-this.y, this.x);
    }

    /**
     * Calcula o vetor perpendicular (-90 graus de rotação) a este vetor.
     * O vetor perpendicular aponta para um dos lados (neste caso esquerda).
     * Retorna um NOVO vetor.
     * @returns {Vector2D} Um novo vetor perpendicular.
     */
    public perpendicularEsquerda(): Vector2D {
        return new Vector2D(this.y, -this.x);
    }

    /**
     * Calcula o ângulo (em radianos) que o vetor faz com o eixo positivo X.
     * O resultado está no intervalo $(-\pi, \pi]$.
     * @returns {number} O ângulo em radianos.
     */
    public angle(): number {
        //? Retorna o arco tangente em radianos calculando a rotação angular do vetor
        const perpendicularVector = this.perpendicularDireita(); //? Perpendicular à direita considerando eixos do canvas
        return Math.atan2(perpendicularVector.y, perpendicularVector.x);
    }

    /**
     * Divide o vetor por um escalar.
     */
    public divideMut(scalar: number): Vector2D {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
        }
        return this;
    }
}