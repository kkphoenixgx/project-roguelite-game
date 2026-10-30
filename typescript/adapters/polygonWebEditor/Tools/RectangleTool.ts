/**
 * @file RectangleTool.ts
 * Ferramenta visual para criacao de hitboxes retangulares no Hitbox Editor.
 * Permite definir caixas de colisao perfeitamente alinhadas aos eixos (AABB)
 * atraves de clique-e-arrasto ou duplo clique, com suporte a trava de proporcao
 * quadrada (1:1) via Shift e preview dinamico de dimensoes.
 */

import type { ITool } from "./ITool";
import type { HitboxModel, Point } from "../Models/HitboxModel";

export class RectangleTool implements ITool {
    private startPoint: Point | null = null;
    private currentPoint: Point | null = null;
    private isDragging: boolean = false;

    constructor(private onComplete: (hitbox: HitboxModel) => void) {}

    /**
     * Inicia a criacao do retangulo no primeiro clique ou finaliza no segundo clique.
     */
    public onMouseDown(e: MouseEvent, worldPos: Point, _zoom: number): void {
        if (e.button === 0) {
            if (!this.startPoint) {
                this.startPoint = { x: Math.round(worldPos.x), y: Math.round(worldPos.y) };
                this.currentPoint = { x: Math.round(worldPos.x), y: Math.round(worldPos.y) };
                this.isDragging = true;
            } else {
                this.currentPoint = { x: Math.round(worldPos.x), y: Math.round(worldPos.y) };
                this.commitRectangle(e.shiftKey);
            }
        } else if (e.button === 2) {
            this.reset();
        }
    }

    /**
     * Atualiza o vertice oposto enquanto o mouse se move, aplicando trava de proporcao se Shift estiver ativo.
     */
    public onMouseMove(e: MouseEvent, worldPos: Point, _zoom: number): void {
        if (this.startPoint) {
            let curX = Math.round(worldPos.x);
            let curY = Math.round(worldPos.y);

            //? Trava proporção 1:1 quando shift está ativo
            if (e.shiftKey) {
                const dx = curX - this.startPoint.x;
                const dy = curY - this.startPoint.y;
                const side = Math.max(Math.abs(dx), Math.abs(dy));
                curX = this.startPoint.x + (dx >= 0 ? side : -side);
                curY = this.startPoint.y + (dy >= 0 ? side : -side);
            }

            this.currentPoint = { x: curX, y: curY };
        }
    }

    /**
     * Finaliza a criacao se tiver ocorrido arraste com deslocamento minimo.
     */
    public onMouseUp(e: MouseEvent, worldPos: Point, _zoom: number): void {
        if (e.button === 0 && this.startPoint && this.isDragging) {
            const curX = Math.round(worldPos.x);
            const curY = Math.round(worldPos.y);
            const dist = Math.hypot(curX - this.startPoint.x, curY - this.startPoint.y);

            //? Finaliza se houver deslocamento mínimo de arrasto (deadzone de 3px)
            if (dist > 3) {
                this.currentPoint = { x: curX, y: curY };
                this.commitRectangle(e.shiftKey);
            } else {
                this.isDragging = false;
            }
        }
    }

    /**
     * Trata cancelamento via Escape ou conclusao via Enter.
     */
    public onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            this.reset();
        } else if (e.key === 'Enter' && this.startPoint && this.currentPoint) {
            this.commitRectangle(e.shiftKey);
        }
    }

    /**
     * Permite desfazer o inicio da selecao.
     */
    public onUndo(): boolean {
        if (this.startPoint) {
            this.reset();
            return true;
        }
        return false;
    }

    /**
     * Consolida e valida o retangulo, gerando a HitboxModel com 4 vertices ordenados em sentido horario.
     */
    private commitRectangle(lockSquare: boolean): void {
        if (!this.startPoint || !this.currentPoint) return;

        let curX = this.currentPoint.x;
        let curY = this.currentPoint.y;

        if (lockSquare) {
            const dx = curX - this.startPoint.x;
            const dy = curY - this.startPoint.y;
            const side = Math.max(Math.abs(dx), Math.abs(dy));
            curX = this.startPoint.x + (dx >= 0 ? side : -side);
            curY = this.startPoint.y + (dy >= 0 ? side : -side);
        }

        const minX = Math.min(this.startPoint.x, curX);
        const maxX = Math.max(this.startPoint.x, curX);
        const minY = Math.min(this.startPoint.y, curY);
        const maxY = Math.max(this.startPoint.y, curY);

        const width = maxX - minX;
        const height = maxY - minY;

        //? Exige dimensões mínimas de 2x2 para evitar hitboxes degeneradas
        if (width >= 2 && height >= 2) {
            const hitbox: HitboxModel = {
                id: `rect_${Date.now()}`,
                type: 'polygon',
                coordinates: { x: minX, y: minY },
                rotation: 0,
                points: [
                    { x: minX, y: minY },
                    { x: maxX, y: minY },
                    { x: maxX, y: maxY },
                    { x: minX, y: maxY }
                ]
            };
            this.onComplete(hitbox);
        }

        this.reset();
    }

    /**
     * Desenha o preview visual do retangulo em construcao com dimensoes e vertices destacados.
     */
    public draw(ctx: CanvasRenderingContext2D, panX: number, panY: number, zoom: number): void {
        if (!this.startPoint || !this.currentPoint) return;

        const minX = Math.min(this.startPoint.x, this.currentPoint.x);
        const maxX = Math.max(this.startPoint.x, this.currentPoint.x);
        const minY = Math.min(this.startPoint.y, this.currentPoint.y);
        const maxY = Math.max(this.startPoint.y, this.currentPoint.y);

        const px = minX * zoom + panX;
        const py = minY * zoom + panY;
        const pw = (maxX - minX) * zoom;
        const ph = (maxY - minY) * zoom;

        ctx.fillStyle = 'rgba(0, 255, 128, 0.2)';
        ctx.fillRect(px, py, pw, ph);

        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        ctx.fillStyle = '#FF0055';
        const vertexRadius = 4;
        const corners = [
            { x: px, y: py },
            { x: px + pw, y: py },
            { x: px + pw, y: py + ph },
            { x: px, y: py + ph }
        ];
        for (const c of corners) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, vertexRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 0 && h > 0) {
            ctx.fillStyle = '#00FF88';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`${w}x${h} px`, px, py - 6);
        }
    }

    /**
     * Reseta o estado da ferramenta.
     */
    public reset(): void {
        this.startPoint = null;
        this.currentPoint = null;
        this.isDragging = false;
    }
}
