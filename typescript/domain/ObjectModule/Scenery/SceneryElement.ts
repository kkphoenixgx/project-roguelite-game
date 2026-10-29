import EnvironmentCollider from "../EnvironmentCollider";
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import { RegisterSpawner, type SpawnPayload } from "../SpawnRegistry";
import { buildAssetHitboxes, getAssetBaseSize } from "./SceneryRegistry";

@RegisterSpawner('scenery')
export default class SceneryElement extends EnvironmentCollider {
    public presetType: string;

    constructor(
        id: number,
        coordinates: { x: number; y: number },
        eventManager: IEventManager,
        presetType: string,
        targetSize?: { width: number; height: number },
        flipX: boolean = false,
        flipY: boolean = false
    ) {
        const resolvedSize = targetSize || getAssetBaseSize(presetType);
        const hitboxes = buildAssetHitboxes(presetType, coordinates, resolvedSize, flipX, flipY);

        super(id, coordinates, resolvedSize, eventManager, hitboxes, presetType, presetType, false);
        this.presetType = presetType;
    }

    public static override createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): SceneryElement {
        const presetType = payload.metadata?.preset || 'house';
        const flipX = Boolean(payload.metadata?.flipX);
        const flipY = Boolean(payload.metadata?.flipY);

        let targetSize = payload.size;
        if (!targetSize && typeof payload.metadata?.scale === 'number') {
            const baseSize = getAssetBaseSize(presetType);
            targetSize = {
                width: Math.round(baseSize.width * payload.metadata.scale),
                height: Math.round(baseSize.height * payload.metadata.scale)
            };
        }

        return new SceneryElement(id, payload.coordinates, eventManager, presetType, targetSize, flipX, flipY);
    }

    /**
     * Altera o estado visual do asset de cenário (ex: 'static' para 'open' ou 'idle')
     * e sincroniza sua propriedade de colisão passável.
     */
    public setState(newState: string, passable?: boolean): void {
        const previousState = this.state;
        this.state = newState;
        if (passable !== undefined) {
            this.passable = passable;
        }
        this.eventManager.dispatch('assetStateChanged', {
            elementId: this.id,
            presetType: this.presetType,
            previousState,
            currentState: this.state,
            passable: this.passable
        });
    }

    /** Abre o portão/passagem, transitando para o sprite 'open' e tornando-o transponível. */
    public open(targetState: string = 'open'): void {
        this.setState(targetState, true);
    }

    /** Fecha o portão/passagem, retornando ao estado 'static' e bloqueando passagem física. */
    public close(targetState: string = 'static'): void {
        this.setState(targetState, false);
    }
}
