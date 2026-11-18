/**
 * @file ToolbarStatus.ts
 * Textos dos itens de menu alternáveis e dos indicadores de modos ativos da barra superior do Assets Editor.
 * Mantido separado do EditorApp para ser testável sem montar o editor inteiro.
 */

/** Estado das ferramentas/visualizações alternáveis do editor. */
export interface EditorToggleState {
    snapToGrid: boolean;
    gridSize: number;
    showHitboxes: boolean;
    showPlayerReference: boolean;
    isStampMode: boolean;
    isChunkBrushMode: boolean;
    chunkBrushRadius: number;
}

/** Rótulos dos itens de menu (o estado ligado/desligado é mostrado pelo ✓ via classe `.active`). */
export function getToggleMenuLabels(state: EditorToggleState): Record<'snap' | 'hitboxes' | 'playerRef' | 'stamp' | 'chunkBrush', string> {
    return {
        snap: state.snapToGrid ? `Encaixe na Grade (${state.gridSize}px)` : 'Encaixe na Grade',
        hitboxes: 'Hitboxes',
        playerRef: 'Referência do Player',
        stamp: 'Modo Carimbo',
        chunkBrush: state.isChunkBrushMode ? `Pincel de Chunk (${state.chunkBrushRadius}px)` : 'Pincel de Chunk'
    };
}

/** Indicadores (chips) exibidos no canto direito da barra enquanto um modo que muda o comportamento do clique está ativo. */
export function getActiveModeChips(state: EditorToggleState): { id: string; label: string; title: string }[] {
    const chips: { id: string; label: string; title: string }[] = [];
    if (state.isChunkBrushMode) chips.push({ id: 'chunkBrush', label: `🎨 Pincel ${state.chunkBrushRadius}px`, title: 'Pincel de Chunk ativo (T para desligar)' });
    if (state.isStampMode) chips.push({ id: 'stamp', label: '🖌️ Carimbo', title: 'Modo Carimbo ativo (B para desligar)' });
    if (state.snapToGrid) chips.push({ id: 'snap', label: `📐 Grade ${state.gridSize}px`, title: 'Encaixe na grade ativo' });
    if (state.showHitboxes) chips.push({ id: 'hitboxes', label: '🎯 Hitboxes', title: 'Hitboxes visíveis (F2 para ocultar)' });
    return chips;
}
