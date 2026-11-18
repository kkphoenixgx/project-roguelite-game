/**
 * @file TrailPath.ts
 * Caminho percorrido por um rastro (trail/ribbon): lista de pontos com idade, guardada em buffers fixos
 * em anel (Zero-GC, sem alocações durante a partida).
 *
 * Convenção de índices: `0` = cabeça (posição atual do objeto, sempre "viva"), `count - 1` = cauda (ponto mais antigo).
 * A cabeça acompanha o objeto a cada frame; quando ela se afasta `minSegmentLength` do ponto anterior,
 * a posição é "gravada" e uma nova cabeça começa.
 */
export default class TrailPath {
    private readonly xs: Float32Array;
    private readonly ys: Float32Array;
    private readonly ages: Float32Array;
    /** Distância percorrida desde o início do rastro até cada ponto (Float64 para não perder precisão em rastros longos). */
    private readonly travelled: Float64Array;
    private readonly capacity: number;
    /** Posição física (no anel) da cabeça. */
    private headSlot: number = 0;
    private _count: number = 0;
    private _detached: boolean = false;

    constructor(maxPoints: number, private readonly lifetime: number, private readonly minSegmentLength: number) {
        this.capacity = Math.max(2, Math.floor(maxPoints));
        this.xs = new Float32Array(this.capacity);
        this.ys = new Float32Array(this.capacity);
        this.ages = new Float32Array(this.capacity);
        this.travelled = new Float64Array(this.capacity);
    }

    /** Quantidade de pontos (cabeça + pontos gravados). */
    public get count(): number { return this._count; }

    /** Se o rastro foi solto do objeto (objeto destruído/sumiu): não cresce mais e só desaparece. */
    public get isDetached(): boolean { return this._detached; }

    /** Sem pontos para desenhar. */
    public get isEmpty(): boolean { return this._count === 0; }

    private slot(index: number): number {
        return (this.headSlot - index + this.capacity) % this.capacity;
    }

    public getX(index: number): number { return this.xs[this.slot(index)]!; }
    public getY(index: number): number { return this.ys[this.slot(index)]!; }
    public getAge(index: number): number { return this.ages[this.slot(index)]!; }
    /** Distância percorrida (no caminho) desde o início do rastro até o ponto; fixa para pontos já gravados. */
    public getTravelled(index: number): number { return this.travelled[this.slot(index)]!; }

    /** Adiciona um ponto novo como cabeça; se o anel estiver cheio, o ponto mais antigo é descartado. */
    private pushHead(x: number, y: number): void {
        const previousTravelled = this._count > 0 ? this.travelled[this.headSlot]! : 0;
        this.headSlot = (this.headSlot + 1) % this.capacity;
        this.xs[this.headSlot] = x;
        this.ys[this.headSlot] = y;
        this.ages[this.headSlot] = 0;
        this.travelled[this.headSlot] = previousTravelled;
        if (this._count < this.capacity) this._count++;
    }

    /** Move a cabeça para a posição atual do objeto (chamado a cada frame enquanto o objeto existir). */
    public setHead(x: number, y: number): void {
        if (this._detached) return;

        if (this._count < 2) {
            //? Primeiro frame (ou depois de todo o rastro expirar): grava a âncora e cria a cabeça viva no mesmo ponto
            this._count = 0;
            this.pushHead(x, y);
            this.pushHead(x, y);
            return;
        }

        const head = this.headSlot;
        this.xs[head] = x;
        this.ys[head] = y;
        this.ages[head] = 0;

        const prev = this.slot(1);
        const dx = x - this.xs[prev]!;
        const dy = y - this.ys[prev]!;
        const distSq = dx * dx + dy * dy;
        //? A cabeça viva fica sempre a "distância do ponto anterior" à frente no caminho percorrido
        this.travelled[head] = this.travelled[prev]! + Math.sqrt(distSq);
        if (distSq >= this.minSegmentLength * this.minSegmentLength) {
            this.pushHead(x, y);
        }
    }

    /** Envelhece os pontos e descarta da cauda os que passaram do tempo de vida. */
    public update(deltaTime: number): void {
        const firstAging = this._detached ? 0 : 1;
        for (let i = firstAging; i < this._count; i++) {
            const s = this.slot(i);
            this.ages[s] = this.ages[s]! + deltaTime;
        }
        while (this._count > 0 && this.getAge(this._count - 1) >= this.lifetime) {
            this._count--;
        }
        //? Rastro preso ao objeto: se só sobrou a cabeça, ainda não há segmento para desenhar
        if (!this._detached && this._count === 1) this._count = 0;
    }

    /** Solta o rastro do objeto: a cabeça para de acompanhar e passa a envelhecer como os demais pontos. */
    public detach(): void {
        this._detached = true;
    }

    /** Remove todos os pontos (sem realocar memória). */
    public clear(): void {
        this._count = 0;
    }
}
