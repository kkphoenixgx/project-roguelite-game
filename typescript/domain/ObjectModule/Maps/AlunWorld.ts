import GameWorld from "../GameWorld";

export default class AlunWorld extends GameWorld {
    public readonly mapId = 'alun';
    //? <!-- ASSETS_ADAPTER_MAP_DIMS_START -->
    public readonly width = 4000;
    public readonly height = 4000;
    public override readonly originChunk = { cx: 0, cy: 0 };
    public override readonly defaultSpawn = { x: 500, y: 500 };
    //? <!-- ASSETS_ADAPTER_MAP_DIMS_END -->

    protected async generateCustomElements(): Promise<void> {
    }
}