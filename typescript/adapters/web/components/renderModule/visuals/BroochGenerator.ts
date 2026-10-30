import VisualComposer, { type VisualLayer } from "./VisualComposer";
import { RenderRegistry } from "../../../shared/RenderRegistry";

export class BroochGenerator {
    /**
     * Demonstração prática do uso do VisualComposer com dados mockados.
     * Gera a composição de um Broche combinando Base, Elemento e Brilho.
     * 
     * NOTA DE USO: Isso é ideal para a UI (CharacterMenuGui ou Tela de Vitória)
     * pintar as recompensas trazidas do sonho de forma modular.
     */
    public static generateRandomBrooch() {
        /* 1. Dados gerados aleatoriamente (Mock do que viria do Domínio) */
        const bases = ['brooch-base-gold', 'brooch-base-silver'];
        const elements = ['element-fire', 'element-water', 'element-shadow'];
        const glows = ['glow-legendary', 'glow-common'];

        const selectedBase = bases[Math.floor(Math.random() * bases.length)]!;
        const selectedElement = elements[Math.floor(Math.random() * elements.length)]!;
        const selectedGlow = glows[Math.floor(Math.random() * glows.length)]!;

        /* 2. Monta as camadas (Layers) seguindo o contrato do VisualComposer */
        const layers: VisualLayer[] = [
            { id: selectedBase, type: 'brooch_base' },
            { id: selectedElement, type: 'brooch_element' },
            { id: selectedGlow, type: 'brooch_glow' }
        ];

        //? VisualComposer avalia o Z-Index e busca as configurações ativas no Registrador (VisualConfigMap)
        const composedBrooch = VisualComposer.compose(layers, RenderRegistry.spriteConfigs, 'idle');

        console.log("Broche Composto gerado com sucesso (Camadas ordenadas por Z-Index):", composedBrooch);
        
        //? Retorna camadas com SpriteConfig e Z-Index para renderização pela UI
        return composedBrooch;
    }
}