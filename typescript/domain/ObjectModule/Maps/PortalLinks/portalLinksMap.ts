/**
 * @file Catálogo e mapa de configuração de PortalLinks (diretos e com confirmação [E]).
 * Permite facilmente cadastrar, editar e ajustar portais e suas hitboxes por mapa.
 */
import type { HitboxJSON } from "../../../hitBox/HitboxParser";

export type PortalLinkType = 'direct' | 'request';

export interface PortalLinkConfig {
  /** Identificador semântico único do portal (ex: 'vilgem_bakery_door', 'interior_black_exit') */
  id: string;
  /** Tipo de portal: 'direct' (ao encostar) ou 'request' (ao apertar [E]) */
  type: PortalLinkType;
  /** Coordenadas no mundo do mapa de origem */
  coordinates: { x: number; y: number };
  /** Dimensões (largura e altura) do portal / área de colisão */
  size: { width: number; height: number };
  /** ID do mapa ou intermap de destino (ex: 'interior_black_default', 'vilgem') */
  targetMapId: string;
  /** Identificador do mundo pai de onde este portal e sua conexão derivam */
  parentWorldId?: string | undefined;
  /** Coordenadas exatas onde o jogador surgirá no mapa de destino */
  targetSpawnCoords?: { x: number; y: number } | undefined;
  /** Texto exibido no balão de interação (apenas para tipo 'request', padrão: 'Entrar') */
  promptText?: string | undefined;
  /** Tecla de atalho exibida no balão (apenas para tipo 'request', padrão: 'E') */
  actionKey?: string | undefined;
  /** Tempo de segurança em ms para evitar re-gatilho pós-teleporte (padrão: 1000ms) */
  cooldownMs?: number | undefined;
  /** Hitboxes customizadas (polígonos ou círculos no formato padrão do PolygonWebEditor). Se omitido, usa retângulo do size. */
  hitboxes?: HitboxJSON[] | undefined;
}

/**
 * Catálogo central de PortalLinks indexado por `mapId`.
 * Edite ou adicione novos portais diretamente aqui.
 */
export const PortalLinksMap: Record<string, PortalLinkConfig[]> = {
  vilgem: [
    {
      id: "vilgem_bakery_entrance",
      type: "request",
      coordinates: { x: -324, y: -634 },
      size: { width: 64, height: 48 },
      targetMapId: "interior_black_default",
      targetSpawnCoords: { x: 512, y: 700 },
      promptText: "Entrar",
      actionKey: "E",
      cooldownMs: 1000,
      hitboxes: [
        {
          id: "vilgem_bakery_door_hb",
          type: "polygon",
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: 0, y: 0 },
            { x: 64, y: 0 },
            { x: 64, y: 48 },
            { x: 0, y: 48 }
          ]
        }
      ]
    },
    {
      id: "vilgem_black_inn_entrance",
      type: "request",
      coordinates: { x: 272, y: 870 },
      size: { width: 36, height: 38 },
      targetMapId: "interior_black_default",
      targetSpawnCoords: { x: 512, y: 700 },
      promptText: "Entrar",
      actionKey: "E",
      cooldownMs: 1000
    }
  ],
  interior_black_default: [
    {
      id: "interior_black_default_exit",
      type: "request",
      coordinates: { x: 1936, y: 3 },
      size: { width: 106, height: 1011 },
      targetMapId: "vilgem",
      targetSpawnCoords: { x: -324, y: -574 },
      promptText: "Entrar",
      actionKey: "E",
      cooldownMs: 1000,
      hitboxes: [
        {
          id: "interior_black_exit_hb",
          type: "polygon",
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: 0, y: 0 },
            { x: 106, y: 0 },
            { x: 106, y: 1011 },
            { x: 0, y: 1011 }
          ]
        }
      ]
    }
  ]
};

/**
 * Retorna a lista de portais configurados para um determinado mapa.
 */
export function getPortalLinksForMap(mapId: string): PortalLinkConfig[] {
  return PortalLinksMap[mapId] || [];
}

/**
 * Adiciona ou substitui um portal na configuração em tempo de execução.
 */
export function registerPortalLink(mapId: string, portal: PortalLinkConfig): void {
  if (!PortalLinksMap[mapId]) {
    PortalLinksMap[mapId] = [];
  }
  const existingIndex = PortalLinksMap[mapId]!.findIndex(p => p.id === portal.id);
  if (existingIndex >= 0) {
    PortalLinksMap[mapId]![existingIndex] = portal;
  } else {
    PortalLinksMap[mapId]!.push(portal);
  }
}

/**
 * Define todos os portais de um mapa.
 */
export function setPortalLinksForMap(mapId: string, portals: PortalLinkConfig[]): void {
  PortalLinksMap[mapId] = portals;
}
