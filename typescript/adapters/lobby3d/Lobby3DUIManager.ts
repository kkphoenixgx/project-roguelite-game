import { logger } from "../web/shared/Logger";

export class Lobby3DUIManager {
    private uiOverlay!: HTMLDivElement;

    constructor(private container: HTMLDivElement, private canvas: HTMLCanvasElement) {}

    public setupUI(): void {
        const style = document.createElement('style');
        style.id = 'lobby3d-style';
        style.textContent = `
            #lobby3d-root { color: #d4c8a8; }

            .lobby-title {
                font-size: clamp(1.8rem, 4vw, 3.2rem);
                letter-spacing: 0.3em;
                text-transform: uppercase;
                color: #f0e8c0;
                text-shadow: 0 0 30px rgba(120, 160, 255, 0.8), 0 0 60px rgba(80, 120, 220, 0.4);
                margin: 0;
                animation: lobby-pulse 4s ease-in-out infinite;
            }
            .lobby-subtitle {
                font-size: 0.9rem;
                letter-spacing: 0.5em;
                text-transform: uppercase;
                color: rgba(200, 190, 160, 0.6);
                margin: 0;
            }
            .lobby-btn {
                padding: 14px 48px;
                background: transparent;
                border: 1px solid rgba(200, 180, 100, 0.5);
                color: #f0e8c0;
                font-family: 'Georgia', serif;
                font-size: 1rem;
                letter-spacing: 0.3em;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .lobby-btn::before {
                content: '';
                position: absolute; inset: 0;
                background: linear-gradient(135deg, rgba(120,160,255,0.1), rgba(80,120,220,0.1));
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .lobby-btn:hover { 
                border-color: rgba(200, 180, 100, 0.9);
                color: #fff;
                text-shadow: 0 0 10px rgba(200, 180, 100, 0.8);
                transform: translateY(-2px);
            }
            .lobby-btn:hover::before { opacity: 1; }
            .lobby-btn:active { transform: translateY(0); }

            .lobby-divider {
                width: 200px; height: 1px;
                background: linear-gradient(90deg, transparent, rgba(200,180,100,0.4), transparent);
            }
            .lobby-stars {
                position: absolute; inset: 0; pointer-events: none; overflow: hidden;
            }
            @keyframes lobby-pulse {
                0%, 100% { text-shadow: 0 0 30px rgba(120, 160, 255, 0.8), 0 0 60px rgba(80, 120, 220, 0.4); }
                50% { text-shadow: 0 0 50px rgba(120, 160, 255, 1.0), 0 0 90px rgba(80, 120, 220, 0.7); }
            }
            @keyframes star-twinkle {
                0%, 100% { opacity: 0.2; } 50% { opacity: 1.0; }
            }
        `;
        document.head.appendChild(style);

        this.uiOverlay = document.createElement('div');
        this.uiOverlay.id = 'lobby3d-ui';
        this.uiOverlay.style.cssText = `
            position: relative; z-index: 10;
            display: flex; flex-direction: column; align-items: center; gap: 24px;
            pointer-events: auto;
        `;

        const starsSvg = this.buildStarField();
        this.container.insertBefore(starsSvg, this.canvas.nextSibling);

        const title = document.createElement('h1');
        title.className = 'lobby-title';
        title.textContent = 'RPG Roguelite';

        const subtitle = document.createElement('p');
        subtitle.className = 'lobby-subtitle';
        subtitle.textContent = 'Sonhos de Axioma';

        const divider = document.createElement('div');
        divider.className = 'lobby-divider';

        const playBtn = document.createElement('button');
        playBtn.id = 'lobby-play-btn';
        playBtn.className = 'lobby-btn';
        playBtn.textContent = '▶  Entrar no Sonho';
        playBtn.addEventListener('click', () => {
            logger.log('init', '[Lobby3DAdapter] Jogador solicitou retorno ao Gameplay.');
            this.container.style.transition = 'opacity 0.6s ease';
            this.container.style.opacity = '0';
            setTimeout(() => {
                window.location.reload();
            }, 650);
        });

        this.uiOverlay.appendChild(title);
        this.uiOverlay.appendChild(subtitle);
        this.uiOverlay.appendChild(divider);
        this.uiOverlay.appendChild(playBtn);
        this.container.appendChild(this.uiOverlay);
    }

    private buildStarField(): SVGSVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'lobby-stars');
        svg.setAttribute('viewBox', '0 0 1920 1080');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        svg.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%;';

        let seed = 42;
        const lcg = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

        for (let i = 0; i < 200; i++) {
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const x    = lcg() * 1920;
            const y    = lcg() * 1080;
            const r    = lcg() * 1.5 + 0.3;
            const dur  = (lcg() * 4 + 2).toFixed(1);
            const del  = (lcg() * 5).toFixed(1);

            star.setAttribute('cx', x.toFixed(1));
            star.setAttribute('cy', y.toFixed(1));
            star.setAttribute('r',  r.toFixed(2));
            star.setAttribute('fill', 'white');
            star.setAttribute('style', `animation: star-twinkle ${dur}s ${del}s ease-in-out infinite`);
            svg.appendChild(star);
        }
        return svg;
    }

    public destroy(): void {
        const style = document.getElementById('lobby3d-style');
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
        if (this.uiOverlay && this.uiOverlay.parentNode) {
            this.uiOverlay.parentNode.removeChild(this.uiOverlay);
        }
    }
}
