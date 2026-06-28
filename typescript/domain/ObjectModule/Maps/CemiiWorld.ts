import GameWorld from "../GameWorld";

export default class CemiiWorld extends GameWorld {
    public readonly mapId = 'cemii';
    public readonly width = 4000;
    public readonly height = 4000;
    public readonly chunkSize = 1000;
    public readonly chunks = [
        ['cemii-0-0', 'cemii-1-0', 'cemii-2-0', 'cemii-3-0'],
        ['cemii-0-1', 'cemii-1-1', 'cemii-2-1', 'cemii-3-1'],
        ['cemii-0-2', 'cemii-1-2', 'cemii-2-2', 'cemii-3-2'],
        ['cemii-0-3', 'cemii-1-3', 'cemii-2-3', 'cemii-3-3']
    ];

    protected async generateCustomElements(): Promise<void> {
        // Adicione NPCs, inimigos e elementos customizados das ruínas aqui
    }
}