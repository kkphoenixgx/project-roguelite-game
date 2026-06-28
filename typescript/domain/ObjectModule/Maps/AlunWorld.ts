import GameWorld from "../GameWorld";

export default class AlunWorld extends GameWorld {
    public readonly mapId = 'alun';
    public readonly width = 4000;
    public readonly height = 4000;

    protected async generateCustomElements(): Promise<void> {
        // Adicione NPCs, inimigos e elementos customizados da torre aqui
    }
}