import { StorybookGuiBuilder } from "../../templates/StorybookGuiBuilder";
import SpellBufferHudGui from "./SpellBufferHudGui";

/**
 * Storybook interativo para o widget SpellBufferHudGui.
 */
export default {
    title: 'HUDs/SpellBufferHud',
    component: SpellBufferHudGui,
};

export const DefaultStory = () => {
    return StorybookGuiBuilder.create()
        .withTitle('Spell Buffer HUD (Glassmorphism & Runic Feedback)')
        .withDarkBackground()
        .withAction('Adicionar [Self] (spell_1)', (container) => {
            let instance = (container as any).__spellBufferInstance;
            if (!instance) {
                instance = new SpellBufferHudGui();
                (container as any).__spellBufferInstance = instance;
            }
            instance.pushRune('spell_1');
        })
        .withAction('Adicionar [Potência] (spell_9)', (container) => {
            let instance = (container as any).__spellBufferInstance;
            if (!instance) {
                instance = new SpellBufferHudGui();
                (container as any).__spellBufferInstance = instance;
            }
            instance.pushRune('spell_9');
        })
        .withAction('Adicionar [Ar] (spell_4, spell_5)', (container) => {
            let instance = (container as any).__spellBufferInstance;
            if (!instance) {
                instance = new SpellBufferHudGui();
                (container as any).__spellBufferInstance = instance;
            }
            instance.pushRune('spell_4');
            instance.pushRune('spell_5');
        })
        .withAction('Disparar Sucesso (Flash Dourado/Azul)', (container) => {
            const instance = (container as any).__spellBufferInstance;
            if (instance) instance.triggerSuccess();
        })
        .withAction('Disparar Estilhaço (Flash Vermelho)', (container) => {
            const instance = (container as any).__spellBufferInstance;
            if (instance) instance.triggerShatter();
        })
        .build();
};
