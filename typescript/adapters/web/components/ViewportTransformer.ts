import Camera from "./renderModule/scene/Camera";
import type IRenderer from "./renderModule/engine/IRenderer";
import type { IGameDomain } from "../../../domain/ports/domain-contracts";
import SceneManager from "./renderModule/scene/SceneManager";

export default class ViewportTransformer {
    constructor(
        private camera: Camera,
        private renderer: IRenderer<any>,
        private domain: IGameDomain,
        private sceneManager: SceneManager
    ) {}

    /**
     * Converte as coordenadas de clique da tela (pixels do canvas) para as coordenadas do mundo do jogo.
     */
    public screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
        const zoom = this.camera.zoom;
        const { world } = this.domain.getRenderState();
        const playerRenderable = this.sceneManager.renderables.get(1);

        const target = playerRenderable 
            ? { coordinates: playerRenderable.coordinates, size: playerRenderable.size }
            : { coordinates: { x: 0, y: 0 }, size: { width: 0, height: 0 } };

        const viewWidth = this.renderer.canvas.element.width / zoom;
        const viewHeight = this.renderer.canvas.element.height / zoom;

        const camX = (target.coordinates.x + target.size.width / 2) - viewWidth / 2;
        const camY = (target.coordinates.y + target.size.height / 2) - viewHeight / 2;

        const minX = world.bounds?.minX ?? world.minX ?? 0;
        const minY = world.bounds?.minY ?? world.minY ?? 0;
        const maxX = world.bounds?.maxX ?? world.maxX ?? (minX + world.width);
        const maxY = world.bounds?.maxY ?? world.maxY ?? (minY + world.height);
        const totalW = maxX - minX;
        const totalH = maxY - minY;

        const clampedCamX = totalW < viewWidth 
            ? minX + (totalW - viewWidth) / 2 
            : Math.max(minX, Math.min(camX, maxX - viewWidth));
        const clampedCamY = totalH < viewHeight 
            ? minY + (totalH - viewHeight) / 2 
            : Math.max(minY, Math.min(camY, maxY - viewHeight));
        
        return { x: (screenX / zoom) + clampedCamX, y: (screenY / zoom) + clampedCamY };
    }

    /**
     * Converte as coordenadas lógicas do mundo para a posição correspondente na tela.
     */
    public worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
        const zoom = this.camera.zoom;
        const { world } = this.domain.getRenderState();
        const playerRenderable = this.sceneManager.renderables.get(1);

        const target = playerRenderable 
            ? { coordinates: playerRenderable.coordinates, size: playerRenderable.size }
            : { coordinates: { x: 0, y: 0 }, size: { width: 0, height: 0 } };

        const viewWidth = this.renderer.canvas.element.width / zoom;
        const viewHeight = this.renderer.canvas.element.height / zoom;

        const camX = (target.coordinates.x + target.size.width / 2) - viewWidth / 2;
        const camY = (target.coordinates.y + target.size.height / 2) - viewHeight / 2;

        const minX = world.bounds?.minX ?? world.minX ?? 0;
        const minY = world.bounds?.minY ?? world.minY ?? 0;
        const maxX = world.bounds?.maxX ?? world.maxX ?? (minX + world.width);
        const maxY = world.bounds?.maxY ?? world.maxY ?? (minY + world.height);
        const totalW = maxX - minX;
        const totalH = maxY - minY;

        const clampedCamX = totalW < viewWidth 
            ? minX + (totalW - viewWidth) / 2 
            : Math.max(minX, Math.min(camX, maxX - viewWidth));
        const clampedCamY = totalH < viewHeight 
            ? minY + (totalH - viewHeight) / 2 
            : Math.max(minY, Math.min(camY, maxY - viewHeight));
        
        return { x: (worldX - clampedCamX) * zoom, y: (worldY - clampedCamY) * zoom };
    }
}
