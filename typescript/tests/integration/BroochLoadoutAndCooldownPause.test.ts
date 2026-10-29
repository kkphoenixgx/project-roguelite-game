import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ActionManager from '../../domain/eventDispacher/ActionManager';

describe('Brooch Loadout, Keybinds 5-8 & Cooldown Pause Integration', () => {
    let eventManager: EventHandler;
    let mockLogger: any;
    let player: Player;
    let actionManager: ActionManager;

    beforeEach(() => {
        vi.useFakeTimers();
        eventManager = new EventHandler();
        mockLogger = { log: vi.fn() };
        player = new Player(1, { x: 100, y: 100 }, new Attributes(10, 10, 10, 10, 10, 10, 10, 10), eventManager);
        actionManager = new ActionManager(player, mockLogger, eventManager);
    });

    it('deve equipar broches ativos nos slots 5-8 e acionar corretamente via teclas slot_5 a slot_8', () => {
        // Simula o setup do GameAdapter com broches vindos do Loadout inicial
        const activeBrooches = ['brooch_active_heal', 'brooch_active_dash', 'brooch_active_shield', null];
        activeBrooches.forEach((id, i) => {
            if (id && id.startsWith('brooch_')) {
                player.equipGlobalActiveBrooch(id, i);
            }
        });

        expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');
        expect(player.globalActiveLoadout[1]).toBe('brooch_active_dash');
        expect(player.globalActiveLoadout[2]).toBe('brooch_active_shield');
        expect(player.globalActiveLoadout[3]).toBeNull();

        // Slots de habilidades de classe (1-4) não devem ser contaminados por broches
        expect(player.activeLoadout).toEqual([null, null, null, null]);

        // Testa execução via ActionManager pelas teclas 5, 6, 7
        const executeSpy = vi.spyOn(player, 'executeActiveBrooch');

        actionManager.checkEvent(['slot_5'], { x: 120, y: 120 });
        expect(executeSpy).toHaveBeenCalledWith('brooch_active_heal', { x: 120, y: 120 });

        actionManager.checkEvent(['slot_6'], { x: 130, y: 130 });
        expect(executeSpy).toHaveBeenCalledWith('brooch_active_dash', { x: 130, y: 130 });

        actionManager.checkEvent(['slot_7'], { x: 140, y: 140 });
        expect(executeSpy).toHaveBeenCalledWith('brooch_active_shield', { x: 140, y: 140 });
    });

    it('não deve permitir equipar passivas de classe nos slots de broches passivos', () => {
        // Tenta equipar uma passiva de mago no slot de broche passivo
        player.equipPassiveInLoadout('m_t2_burn', 0);
        expect(player.passiveLoadout[0]).toBeNull();

        // Equipar broche passivo legítimo deve funcionar
        player.equipPassiveInLoadout('brooch_phoenix', 0);
        expect(player.passiveLoadout[0]).toBe('brooch_phoenix');
    });

    it('cooldown deve congelar quando o jogo estiver pausado (sem update de simulação)', () => {
        player.attributes.dexterity = 0; // Sem CDR para duração exata
        player.setSkillCooldown('brooch_active_heal', 5000);
        expect(player.isSkillOnCooldown('brooch_active_heal')).toBe(true);

        const cdInitial = player.getActiveCooldowns()['brooch_active_heal'];
        expect(cdInitial).toBeDefined();
        expect(cdInitial!.remainingMs).toBe(5000);

        // Simula passagem de tempo no mundo real (ex: menu de personagem aberto por 10 segundos)
        vi.advanceTimersByTime(10000);

        // Como player.update(deltaTime) NÃO foi chamado, o cooldown continua congelado
        expect(player.isSkillOnCooldown('brooch_active_heal')).toBe(true);
        expect(player.getActiveCooldowns()['brooch_active_heal']!.remainingMs).toBe(5000);

        // Despausa o jogo e roda 2 segundos de simulação
        player.update(2.0);
        expect(player.getActiveCooldowns()['brooch_active_heal']!.remainingMs).toBe(3000);

        // Roda mais 3.1 segundos de simulação -> cooldown expira
        player.update(3.1);
        expect(player.isSkillOnCooldown('brooch_active_heal')).toBe(false);
        expect(player.getActiveCooldowns()['brooch_active_heal']).toBeUndefined();
    });

    it('broches equipados no Menu Principal devem prevalecer sobre o checkpoint e refletir no player do domínio e Character Menu', () => {
        // Simula checkpoint antigo salvo com broches desatualizados ou nulos
        const oldCheckpoint = {
            slot: 1,
            mapId: 'vilgem',
            player: {
                level: 5,
                globalActiveLoadout: [null, null, null, null],
                passiveLoadout: [null, null, null, null],
                classes: {
                    globalActiveLoadout: [null, null, null, null],
                    passiveLoadout: [null, null, null, null]
                }
            }
        };

        // 1. Simula restauração de checkpoint
        player.restoreState(oldCheckpoint.player);
        expect(player.globalActiveLoadout).toEqual([null, null, null, null]);

        // 2. Simula aplicação dos broches selecionados no menu principal pelo usuário
        const selectedMenuActives = ['brooch_active_heal', 'brooch_active_dash', null, null];
        const selectedMenuPassives = ['brooch_phoenix', null, null, null];

        selectedMenuActives.forEach((id, i) => {
            if (id && id.startsWith('brooch_')) player.equipGlobalActiveBrooch(id, i);
        });
        selectedMenuPassives.forEach((id, i) => {
            if (id) player.equipPassiveInLoadout(id, i);
        });

        // 3. Verifica se os broches estão realmente equipados nos slots 5-8 do domínio
        expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');
        expect(player.globalActiveLoadout[1]).toBe('brooch_active_dash');
        expect(player.passiveLoadout[0]).toBe('brooch_phoenix');

        // 4. Executa ação com a tecla slot_5 -> deve acionar brooch_active_heal
        const broochSpy = vi.spyOn(player, 'executeActiveBrooch');
        actionManager.checkEvent(['slot_5'], { x: 50, y: 50 });
        expect(broochSpy).toHaveBeenCalledWith('brooch_active_heal', { x: 50, y: 50 });

        // 5. Verifica se os dados expostos para o CharacterMenu / HUD contêm o loadout correto
        expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');
        expect(player.globalActiveLoadout[1]).toBe('brooch_active_dash');
        expect(player.passiveLoadout[0]).toBe('brooch_phoenix');

        const serialized = player.serializeState();
        expect(serialized.classes.globalActiveLoadout[0]).toBe('brooch_active_heal');
        expect(serialized.classes.globalActiveLoadout[1]).toBe('brooch_active_dash');
        expect(serialized.classes.passiveLoadout[0]).toBe('brooch_phoenix');
    });
});

