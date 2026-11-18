/**
 * @file MenuBar.ts
 * Barra de menus suspensos do topo do Assets Editor (estilo VS Code / editores de imagem).
 *
 * Estrutura esperada no HTML:
 *   <nav class="menu-bar">
 *     <div class="menu-root">
 *       <button class="menu-trigger">Arquivo</button>
 *       <div class="menu-dropdown"> <button class="menu-item" id="...">...</button> ... </div>
 *     </div>
 *   </nav>
 *
 * Comportamento:
 * - Clique no título abre/fecha o menu.
 * - Com um menu aberto, passar o mouse sobre outro título troca o menu aberto.
 * - Clique em um item executa a ação (os listeners de cada item ficam no EditorApp) e fecha o menu.
 * - Clique fora da barra ou tecla Escape fecha o menu.
 */
export class MenuBar {
    private readonly root: HTMLElement;
    private openMenu: HTMLElement | null = null;

    private readonly onDocumentMouseDown = (e: MouseEvent) => {
        if (this.openMenu && !this.root.contains(e.target as Node)) this.closeAll();
    };

    private readonly onDocumentKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.openMenu) this.closeAll();
    };

    constructor(root: HTMLElement) {
        this.root = root;
        this.bind();
    }

    /** Menu atualmente aberto (ou null). */
    public get currentMenu(): HTMLElement | null {
        return this.openMenu;
    }

    private bind(): void {
        this.root.querySelectorAll<HTMLElement>('.menu-root').forEach(menu => {
            const trigger = menu.querySelector<HTMLElement>('.menu-trigger');
            trigger?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.openMenu === menu) this.closeAll();
                else this.open(menu);
            });
            trigger?.addEventListener('mouseenter', () => {
                if (this.openMenu && this.openMenu !== menu) this.open(menu);
            });

            menu.querySelectorAll<HTMLElement>('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (!(item as HTMLButtonElement).disabled) this.closeAll();
                });
            });
        });

        document.addEventListener('mousedown', this.onDocumentMouseDown);
        document.addEventListener('keydown', this.onDocumentKeyDown);
    }

    public open(menu: HTMLElement): void {
        this.closeAll();
        menu.classList.add('is-open');
        menu.querySelector('.menu-trigger')?.setAttribute('aria-expanded', 'true');
        this.openMenu = menu;
    }

    public closeAll(): void {
        this.root.querySelectorAll<HTMLElement>('.menu-root.is-open').forEach(menu => {
            menu.classList.remove('is-open');
            menu.querySelector('.menu-trigger')?.setAttribute('aria-expanded', 'false');
        });
        this.openMenu = null;
    }

    /** Remove os listeners globais (usado em testes e ao desmontar o editor). */
    public destroy(): void {
        document.removeEventListener('mousedown', this.onDocumentMouseDown);
        document.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
