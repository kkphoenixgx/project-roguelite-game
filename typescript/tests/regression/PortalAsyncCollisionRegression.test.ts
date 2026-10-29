import { describe, it, expect, beforeEach, vi } from 'vitest';
import PortalLinkRequest from '../../domain/ObjectModule/Maps/PortalLinkRequest';

/**
 * Regressão: no jogo real, as colisões vêm de um Web Worker assíncrono e NÃO chegam em todo frame.
 * Antes da correção, um único frame sem colisão escondia o prompt e zerava isPlayerInside,
 * fazendo o [E] no portal de saída do interior_black_default não teleportar o jogador.
 */
function createBus() {
  const listeners = new Map<string, Function[]>();
  const dispatched: { event: string; payload: any }[] = [];
  return {
    dispatched,
    on: vi.fn((e: string, cb: Function) => { listeners.set(e, [...(listeners.get(e) || []), cb]); }),
    off: vi.fn((e: string, cb: Function) => { listeners.set(e, (listeners.get(e) || []).filter(f => f !== cb)); }),
    dispatch: vi.fn((e: string, p: any) => { dispatched.push({ event: e, payload: p }); (listeners.get(e) || []).forEach(f => f(p)); }),
  };
}

describe('Regressão: PortalLinkRequest com colisão assíncrona (Web Worker)', () => {
  let bus: ReturnType<typeof createBus>;
  let portal: PortalLinkRequest;
  const player = { id: 1, objectId: 'player' };
  const dt = 1 / 60;

  beforeEach(() => {
    PortalLinkRequest.focusedPortalId = null;
    bus = createBus();
    portal = new PortalLinkRequest(42, { x: 1936, y: 3 }, { width: 106, height: 1011 }, bus as any, 'vilgem', { x: 700, y: 450 });
  });

  it('[unit] mantém o jogador dentro em frames sem resultado de colisão (dentro da janela de tolerância)', () => {
    portal.handleCollision(player);
    portal.update(dt);           // frame com colisão
    portal.update(dt);           // worker ainda não respondeu
    portal.update(dt);
    expect(portal.isPlayerInside).toBe(true);
    expect(bus.dispatched.some(d => d.event === 'portalPromptHide')).toBe(false);
  });

  it('[unit] esconde o prompt quando o jogador realmente sai (após a janela de tolerância)', () => {
    portal.handleCollision(player);
    portal.update(dt);
    for (let i = 0; i < 30; i++) portal.update(dt);
    expect(portal.isPlayerInside).toBe(false);
    expect(bus.dispatched.some(d => d.event === 'portalPromptHide')).toBe(true);
  });

  it('[regressão] pressionar [E] num frame sem colisão ainda teleporta para (700, 450) em Vilgem', () => {
    // Worker entrega colisão apenas a cada 3 frames
    for (let frame = 0; frame < 9; frame++) {
      if (frame % 3 === 0) portal.handleCollision(player);
      portal.update(dt);
    }
    // Frame atual sem colisão; jogador aperta E
    portal.update(dt);
    bus.dispatch('portalInteract', {});

    const transition = bus.dispatched.find(d => d.event === 'mapTransitionRequested');
    expect(transition).toBeDefined();
    expect(transition!.payload).toEqual({ targetMapId: 'vilgem', targetCoordinates: { x: 700, y: 450 } });
  });
});
