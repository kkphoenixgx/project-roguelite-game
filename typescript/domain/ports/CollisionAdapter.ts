import type { ICollisionService } from "./ICollisionService";

export class CollisionAdapter implements ICollisionService {
    private worker: Worker;
    private isChecking: boolean = false;
    private currentCallback?: (result: Int32Array) => void;

    constructor() {
        this.worker = new Worker(new URL('../ObjectModule/Collision.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent<Int32Array>) => {
            this.isChecking = false;
            if (this.currentCallback) this.currentCallback(event.data);
        };
    }

    public checkCollisions(hitboxData: Float32Array, bufferLength: number, worldBounds: { x: number, y: number, width: number, height: number }, callback: (result: Int32Array) => void): void {
        if (this.isChecking) { callback(new Int32Array(0)); return; }
        this.isChecking = true;
        this.currentCallback = callback;
        this.worker.postMessage({ hitboxData, bufferLength, worldBounds });
    }
}