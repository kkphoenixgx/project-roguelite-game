import type Player from "../ObjectModule/Entities/Player/Player";
import type { ILogger } from "../ports/ILogger";
import type { IEventManager } from "../eventDispacher/IGameEvents";

/**
 * Gateway responsável pelo canal de comunicação de ações de ferramentas (Tools) e Cinto (Belt).
 * Valida regras de negócio do Domínio (ex: ferramentas permitidas por zona, durabilidade, cinto equipado)
 * sem acoplar a física ou o subsistema de renderização.
 */
export default class ToolActionGateway {
    constructor(
        private player: Player,
        private logger: ILogger,
        private eventManager: IEventManager
    ) {
        this.eventManager.on('requestToolAction', (payload) => {
            this.handleToolAction(payload);
        });
    }

    public handleToolAction(payload: {
        toolType: string;
        targetPosition: { x: number; y: number };
        playerPosition?: { x: number; y: number };
        targetTileType?: string;
        zoneType?: 'city' | 'wilderness' | 'farmland';
    }): void {
        const activeTool = this.player.getActiveTool();
        if (!activeTool) {
            this.eventManager.dispatch('toolActionResult', {
                success: false,
                message: 'Nenhuma ferramenta ativa equipada no Cinto de Utilidades!',
                reason: 'no_tool_equipped'
            });
            this.logger.log('actions', '[ToolActionGateway] Ação rejeitada: Nenhuma ferramenta ativa no Cinto.');
            return;
        }

        const zone = payload.zoneType || 'farmland';
        if (!activeTool.canUseInZone(zone)) {
            const forbiddenMsg = zone === 'city'
                ? `A ferramenta '${activeTool.name}' não pode ser usada dentro da cidade! Construções civis utilizam o Martelo.`
                : `A ferramenta '${activeTool.name}' não pode ser operada nesta zona (${zone}).`;

            this.eventManager.dispatch('toolActionResult', {
                success: false,
                message: forbiddenMsg,
                reason: 'invalid_zone'
            });
            this.logger.log('actions', `[ToolActionGateway] Ação negada por restrição de zona: ${forbiddenMsg}`);
            return;
        }

        if (activeTool.durability <= 0) {
            this.eventManager.dispatch('toolActionResult', {
                success: false,
                message: `A ferramenta '${activeTool.name}' está desgastada e sem durabilidade!`,
                reason: 'durability_depleted'
            });
            return;
        }

        // Aplica o desgaste padrão de durabilidade
        activeTool.durability = -1;

        this.logger.log('actions', `[ToolActionGateway] Ação executada: ${activeTool.name} (tipo: ${activeTool.toolType}) na zona '${zone}' em (${payload.targetPosition.x}, ${payload.targetPosition.y}).`);

        this.eventManager.dispatch('toolActionResult', {
            success: true,
            message: `Ação realizada com sucesso usando ${activeTool.name}.`,
            modifiedTile: {
                x: payload.targetPosition.x,
                y: payload.targetPosition.y,
                action: payload.toolType,
                type: payload.toolType === 'hoe' ? 'tilled_soil' : undefined
            }
        });
    }
}
