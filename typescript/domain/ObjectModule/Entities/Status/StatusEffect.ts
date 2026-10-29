import type Entity from "../Entity";
import type { StatusCategory } from "../../../ports/domain-contracts";

export default abstract class StatusEffect {
    public elapsed: number = 0;
    public tickTimer: number = 0;

    constructor(
        public id: string, 
        public description: string,
        public duration: number, 
        public tickInterval: number = 0,
        public category: StatusCategory = 'magical',
        public tier: number = 1
    ) {}

    public apply(target: Entity): void {
        this.onApply(target);
    }

    /**
     * Avança o tempo de vida do status. Retorna `true` se o tempo acabou.
     */
    public update(deltaTime: number, target: Entity): boolean {
        this.elapsed += deltaTime;
        this.tickTimer += deltaTime;

        if (this.tickInterval > 0 && this.tickTimer >= this.tickInterval) {
            this.onTick(target);
            this.tickTimer -= this.tickInterval;
        }

        if (this.elapsed >= this.duration) {
            this.onRemove(target);
            return true; // Finalizado
        }
        return false;
    }

    protected onApply(target: Entity): void {}
    protected onTick(target: Entity): void {}
    protected onRemove(target: Entity): void {}
}