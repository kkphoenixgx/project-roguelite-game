import { logger } from "../web/shared/Logger";
import { Lobby3DModelLoader } from "./Lobby3DModelLoader";

export class Lobby3DSceneManager {
    public canvas!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;
    private animationFrameId: number = 0;
    private modelLoader!: Lobby3DModelLoader;
    
    private startTime: number = performance.now();
    private rotation: number = 0;

    constructor(private container: HTMLDivElement) {}

    public initialize(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'lobby3d-canvas';
        this.canvas.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;`;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.container.appendChild(this.canvas);

        const gl = this.canvas.getContext('webgl', { antialias: true, alpha: false });
        if (!gl) {
            logger.log('error', 'Lobby3DAdapter: WebGL não suportado neste ambiente.');
            return;
        }
        this.gl = gl;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.02, 0.04, 0.08, 1.0);

        this.modelLoader = new Lobby3DModelLoader(this.gl);
        this.modelLoader.initialize();

        window.addEventListener('resize', this.onResize);
        
        this.loop();
    }

    private loop = (): void => {
        const gl = this.gl;
        if (!gl) return;

        const elapsed = performance.now() - this.startTime;
        this.rotation += 0.002;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.modelLoader.draw(elapsed, this.rotation);

        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    private onResize = (): void => {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
    };

    public destroy(): void {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.onResize);
        if (this.modelLoader) {
            this.modelLoader.destroy();
        }
        if (this.canvas?.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
