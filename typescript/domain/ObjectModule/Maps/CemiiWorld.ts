import GameWorld from "../GameWorld";

export default class CemiiWorld extends GameWorld {
    public readonly mapId = 'cemii';
    //? <!-- ASSETS_ADAPTER_MAP_DIMS_START -->
    public readonly width = 4000;
    public readonly height = 4000;
    public override readonly originChunk = { cx: 0, cy: 0 };
    public override readonly defaultSpawn = { x: 500, y: 500 };
    //? <!-- ASSETS_ADAPTER_MAP_DIMS_END -->
    public override readonly chunkSize = 1000;
    public override readonly chunks = [
        ['cemii-0-0', 'cemii-1-0', 'cemii-2-0', 'cemii-3-0'],
        ['cemii-0-1', 'cemii-1-1', 'cemii-2-1', 'cemii-3-1'],
        ['cemii-0-2', 'cemii-1-2', 'cemii-2-2', 'cemii-3-2'],
        ['cemii-0-3', 'cemii-1-3', 'cemii-2-3', 'cemii-3-3']
    ];

    protected async generateCustomElements(): Promise<void> {
    }
}