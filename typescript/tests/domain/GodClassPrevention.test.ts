import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Rules: Prevention of God Classes', () => {
    it('DomainFacade should not act as a switchboard for UI mechanics (No God Class)', () => {
        const facadePath = path.resolve(__dirname, '../../domain/DomainFacade.ts');
        const facadeContent = fs.readFileSync(facadePath, 'utf-8');

        // A Facade deve ser um funil agnóstico. Não deve conter métodos específicos de UI
        // que precisam ser atualizados a cada nova funcionalidade do jogo.
        const forbiddenMethods = [
            'manageInventory',
            'manageSkillTree',
            'useItem',
            'equipArmor',
            'dropItem'
        ];

        for (const method of forbiddenMethods) {
            const regex = new RegExp(`(public|private)?\\s*${method}\\s*\\(`, 'g');
            expect(regex.test(facadeContent)).toBe(false);
        }
    });

    it('GameAdapter should not manually instantiate every UI module', () => {
        const adapterPath = path.resolve(__dirname, '../../adapters/web/components/GameAdapter.ts');
        const adapterContent = fs.readFileSync(adapterPath, 'utf-8');

        // O GameAdapter não deve ter um acoplamento duro chamando 'new Gui()' para toda tela do jogo.
        // As GUIs devem ser registradas dinamicamente ou reagir autônomas ao EventBus.
        const manualUIs = [
            'new InventoryGui',
            'new SkillTreeGui',
            'new CharacterMenuGui'
        ];

        for (const uiInst of manualUIs) {
            expect(adapterContent.includes(uiInst)).toBe(false);
        }
    });
});
