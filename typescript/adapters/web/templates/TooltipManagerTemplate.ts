export interface TooltipItemData {
  title: string;
  subtitle?: string;
  rarity?: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'ancestral';
  tags?: string[];
  stats?: { label: string; value: string | number; isPositive?: boolean }[];
  description?: string;
  lore?: string;
}

/**
 * ==============================================================================
 * GERENCIADOR CANÔNICO DE TOOLTIPS DINÂMICOS (TooltipManagerTemplate)
 * ==============================================================================
 * Cria uma camada flutuante Glassmorphism única no DOM com posicionamento inteligente,
 * garantindo que o tooltip nunca corte nas bordas da tela nem sobreponha o cursor.
 * ==============================================================================
 */
export class TooltipManagerTemplate {
  private static instance: TooltipManagerTemplate | null = null;
  private tooltipEl!: HTMLElement;
  private isVisible: boolean = false;

  private constructor() {
    this.createTooltipElement();
  }

  public static getInstance(): TooltipManagerTemplate {
    if (!TooltipManagerTemplate.instance) {
      TooltipManagerTemplate.instance = new TooltipManagerTemplate();
    }
    return TooltipManagerTemplate.instance;
  }

  private createTooltipElement(): void {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('global-game-tooltip');
    if (existing) {
      this.tooltipEl = existing;
      return;
    }

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.id = 'global-game-tooltip';
    this.tooltipEl.className = 'glassmorphism-tooltip is-hidden';
    this.tooltipEl.style.position = 'fixed';
    this.tooltipEl.style.pointerEvents = 'none';
    this.tooltipEl.style.zIndex = '999999';
    this.tooltipEl.style.display = 'none';
    document.body.appendChild(this.tooltipEl);
  }

  public show(data: TooltipItemData, clientX: number, clientY: number): void {
    if (!this.tooltipEl) this.createTooltipElement();
    if (!this.tooltipEl) return;

    this.tooltipEl.innerHTML = this.renderTooltipHtml(data);
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.classList.remove('is-hidden');
    this.isVisible = true;

    this.updatePosition(clientX, clientY);
  }

  public updatePosition(clientX: number, clientY: number): void {
    if (!this.isVisible || !this.tooltipEl) return;

    const offset = 14;
    const rect = this.tooltipEl.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let x = clientX + offset;
    let y = clientY + offset;

    // Clamping Horizontal: se vazar da direita, inverte para a esquerda do cursor
    if (x + rect.width > winWidth - 10) {
      x = clientX - rect.width - offset;
    }

    // Clamping Vertical: se vazar de baixo, inverte para cima do cursor
    if (y + rect.height > winHeight - 10) {
      y = clientY - rect.height - offset;
    }

    this.tooltipEl.style.left = `${Math.max(8, x)}px`;
    this.tooltipEl.style.top = `${Math.max(8, y)}px`;
  }

  public hide(): void {
    if (!this.tooltipEl) return;
    this.tooltipEl.style.display = 'none';
    this.tooltipEl.classList.add('is-hidden');
    this.isVisible = false;
  }

  private renderTooltipHtml(data: TooltipItemData): string {
    const rarityClass = data.rarity ? `rarity-${data.rarity}` : 'rarity-comum';
    
    let html = `
      <div class="tooltip-box ${rarityClass}">
        <div class="tooltip-header">
          <span class="tooltip-title">${data.title}</span>
          ${data.subtitle ? `<span class="tooltip-subtitle">${data.subtitle}</span>` : ''}
        </div>
    `;

    if (data.tags && data.tags.length > 0) {
      html += `<div class="tooltip-tags">${data.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>`;
    }

    if (data.stats && data.stats.length > 0) {
      html += `<div class="tooltip-stats">`;
      for (const stat of data.stats) {
        const sign = stat.isPositive ? '+' : '';
        html += `<div class="tooltip-stat-row">
                   <span class="stat-lbl">${stat.label}</span>
                   <span class="stat-val ${stat.isPositive ? 'stat-pos' : ''}">${sign}${stat.value}</span>
                 </div>`;
      }
      html += `</div>`;
    }

    if (data.description) {
      html += `<div class="tooltip-desc">${data.description}</div>`;
    }

    if (data.lore) {
      html += `<div class="tooltip-lore">"${data.lore}"</div>`;
    }

    html += `</div>`;
    return html;
  }
}

export default TooltipManagerTemplate;
