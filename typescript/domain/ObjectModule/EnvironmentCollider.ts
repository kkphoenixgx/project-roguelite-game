import ObjectElement from "./ObjectElement";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { objectTypeId } from "./objectType.type";
import { RegisterSpawner, type SpawnPayload } from "./SpawnRegistry";
import type { HitBox } from "../hitBox/HitBox";

@RegisterSpawner('environmentCollider')
export default class EnvironmentCollider extends ObjectElement {
    public tileType: string;
    public passable: boolean;
    public speedModifier?: number | undefined;

    constructor(
        id: number,
        coordinates: { x: number; y: number },
        size: { width: number; height: number },
        eventManager: IEventManager,
        hitboxes: HitBox[],
        objectId: objectTypeId = 'environmentCollider',
        tileType: string = 'none',
        passable: boolean = true,
        speedModifier?: number
    ) {
        //? Entidade de barreira física com estado 'static' sem renderização visual
        super(size, coordinates, id, objectId, eventManager, 'static', hitboxes);
        this.tileType = tileType;
        this.passable = passable;
        this.speedModifier = speedModifier;
    }

    public override update(_deltaTime: number): void {
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): EnvironmentCollider {
        //? Dimensões determinadas integralmente pela hitbox poligonal
        const size = payload.size || { width: 0, height: 0 };
        const hitboxes = payload.hitboxes || [];
        const metadata = payload.metadata || {};
        return new EnvironmentCollider(id, payload.coordinates, size, eventManager, hitboxes, 'environmentCollider', metadata.tileType, metadata.passable, metadata.speedModifier);
    }
}