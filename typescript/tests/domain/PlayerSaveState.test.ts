import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import ItemFactory from '../../domain/ObjectModule/Items/ItemFactory';

describe('Player Save & Load State System (Zero-GC & Clean Architecture)', () => {
    let mockEventManager: any;
    let mockLogger: any;
    let mockCollision: any;
    let domain: DomainFacade;
    let player: Player;

    beforeEach(() => {
        mockEventManager = {
            dispatch: vi.fn(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            clear: vi.fn(),
            on: vi.fn()
        };
        mockLogger = { log: vi.fn() };
        mockCollision = {
            checkCollisions: vi.fn(),
            getPossibleCollisions: vi.fn(),
            updateEntityPosition: vi.fn(),
            removeEntity: vi.fn(),
            clear: vi.fn()
        };

        domain = new DomainFacade(
            { player: { id: 1, level: 3, initialPos: { x: 100, y: 150 } } } as any,
            mockLogger,
            mockEventManager,
            mockCollision
        );
        player = new Player(1, { x: 100, y: 150 }, new Attributes(8, 3, 14, 12, 10, 10, 10, 10), mockEventManager);
        (domain as any).player = player;
    });

    it('should accurately serialize backpack, equipment, classes, and attributes', () => {
        // 1. Setup backpack items
        const sword = ItemFactory.createItem(4); // SimpleSword
        const potion = ItemFactory.createItem(30); // HealthPotion
        const apple = ItemFactory.createItem(33, { amount: 5 }); // Apple stack
        expect(sword).not.toBeNull();
        expect(potion).not.toBeNull();
        expect(apple).not.toBeNull();
        player.backpack.push(sword!, potion!, apple!);

        // 2. Setup equipment
        const helmet = ItemFactory.createItem(10); // IronHelmet
        const bag = ItemFactory.createItem(100); // LeatherBag
        const belt = ItemFactory.createItem(205); // LeatherBelt
        const ring = ItemFactory.createItem(16); // SimpleRing
        player.equipment.helmet = helmet as any;
        player.equipment.bag = bag as any;
        player.equipment.belt = belt as any;
        player.equipment.leftHandRings.push(ring as any);
        player.equipmentManager.syncEquipedItens();

        // 3. Setup classes and skills
        player.unlockClass('Guerreiro');
        player.setActiveClass('Guerreiro');
        player.unlockSkill('w_t1_heavy_blow');
        player.equipSkillInLoadout('w_t1_heavy_blow', 0);

        player.coins = 250;

        // Act: Serialize via Domain Facade
        const serialized = domain.serializePlayerState();

        // Assert
        expect(serialized).not.toBeNull();
        expect(serialized!.coins).toBe(250);
        expect(serialized!.coordinates).toEqual({ x: 100, y: 150 });
        expect(serialized!.attributes.level).toBe(3);
        expect(serialized!.attributes.strength).toBe(14);
        expect(serialized!.attributes.constitution).toBe(12);

        // Check backpack
        expect(serialized!.backpack).toHaveLength(3);
        expect(serialized!.backpack[0]?.itemId).toBe(4);
        expect(serialized!.backpack[1]?.itemId).toBe(30);
        expect(serialized!.backpack[2]?.itemId).toBe(33);
        expect(serialized!.backpack[2]?.amount).toBe(5);

        // Check equipment
        expect(serialized!.equipment.helmet).toBeDefined();
        expect(serialized!.equipment.helmet?.itemId).toBe(10);
        expect(serialized!.equipment.bag?.itemId).toBe(100);
        expect(serialized!.equipment.belt?.itemId).toBe(205);
        expect(serialized!.equipment.leftHandRings).toHaveLength(1);
        expect(serialized!.equipment.leftHandRings?.[0]?.itemId).toBe(16);

        // Check classes & skill loadout
        expect(serialized!.classes.unlockedClasses).toContain('Guerreiro');
        expect(serialized!.classes.activeClass).toBe('Guerreiro');
        expect(serialized!.classes.unlockedSkills).toContain('w_t1_heavy_blow');
        expect(serialized!.classes.activeLoadout[0]).toBe('w_t1_heavy_blow');
    });

    it('should restore all player state (backpack, equipment, skills, attributes) from serialized data', () => {
        // Prepare saved data
        const savedData = {
            attributes: {
                level: 7,
                currentXp: 120,
                availablePoints: 2,
                maxHp: 180,
                hp: 150,
                mana: 90,
                strength: 22,
                constitution: 18,
                dexterity: 14,
                intelligence: 10,
                wisdom: 10,
                charisma: 10
            },
            coins: 999,
            coordinates: { x: 340, y: 520 },
            backpack: [
                { itemId: 30, name: 'Poção de Vida', amount: 3 },
                { itemId: 1, name: 'Cajado Simples', durability: 50 }
            ],
            equipment: {
                mainHand: { itemId: 3, name: 'Foice' },
                helmet: { itemId: 10, name: 'Elmo de Ferro' },
                bag: { itemId: 100, name: 'Bolsa de Couro' },
                belt: { itemId: 205, name: 'Cinto de Couro' },
                leftHandRings: [{ itemId: 16, name: 'Anel Simples' }]
            },
            classes: {
                unlockedClasses: ['Necromante', 'Guerreiro'],
                activeClass: 'Necromante',
                unlockedSkills: ['n_t1_reap', 'n_t2_bone_spear'],
                activeLoadout: ['n_t1_reap', 'n_t2_bone_spear', null, null],
                passiveLoadout: [null, null, null, null],
                globalActiveLoadout: [null, null, null, null]
            }
        };

        // Create a fresh new player
        const freshPlayer = new Player(1, { x: 0, y: 0 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
        (domain as any).player = freshPlayer;

        // Act: Restore via Domain Facade
        domain.restorePlayerState(savedData);

        // Assert: Attributes & Coordinates
        expect(freshPlayer.attributes.level).toBe(7);
        expect(freshPlayer.attributes.currentXp).toBe(120);
        expect(freshPlayer.attributes.hp).toBe(150);
        expect(freshPlayer.attributes.strength).toBe(22);
        expect(freshPlayer.attributes.constitution).toBe(18);
        expect(freshPlayer.coins).toBe(999);
        expect(freshPlayer.coordinates.x).toBe(340);
        expect(freshPlayer.coordinates.y).toBe(520);

        // Assert: Backpack
        expect(freshPlayer.backpack).toHaveLength(2);
        expect(freshPlayer.backpack[0]?.itemId).toBe(30);
        expect(freshPlayer.backpack[1]?.itemId).toBe(1);

        // Assert: Equipment
        expect(freshPlayer.equipment.mainHand).toBeDefined();
        expect(freshPlayer.equipment.mainHand?.itemId).toBe(3);
        expect(freshPlayer.equipment.helmet?.itemId).toBe(10);
        expect(freshPlayer.equipment.bag?.itemId).toBe(100);
        expect(freshPlayer.equipment.belt?.itemId).toBe(205);
        expect(freshPlayer.equipment.leftHandRings).toHaveLength(1);
        expect(freshPlayer.equipment.leftHandRings[0]?.itemId).toBe(16);

        // Assert: Classes & Skills
        expect(freshPlayer.unlockedClasses).toContain('Necromante');
        expect(freshPlayer.activeClass).toBe('Necromante');
        expect(freshPlayer.unlockedSkills.has('n_t1_reap')).toBe(true);
        expect(freshPlayer.unlockedSkills.has('n_t2_bone_spear')).toBe(true);
        expect(freshPlayer.activeLoadout[0]).toBe('n_t1_reap');
        expect(freshPlayer.activeLoadout[1]).toBe('n_t2_bone_spear');
    });

    it('should maintain backward compatibility with legacy flat checkpoint data', () => {
        const legacyCheckpoint = {
            level: 4,
            currentXp: 80,
            availablePoints: 1,
            maxHp: 120,
            hp: 110,
            mana: 60,
            strength: 15,
            constitution: 12,
            coins: 150,
            unlockedSkills: ['w_t1_heavy_blow'],
            unlockedClasses: ['Guerreiro'],
            activeClass: 'Guerreiro',
            coordinates: { x: 50, y: 75 }
        };

        const freshPlayer = new Player(1, { x: 0, y: 0 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
        (domain as any).player = freshPlayer;

        // Act
        domain.restorePlayerState(legacyCheckpoint);

        // Assert
        expect(freshPlayer.attributes.level).toBe(4);
        expect(freshPlayer.attributes.strength).toBe(15);
        expect(freshPlayer.coins).toBe(150);
        expect(freshPlayer.coordinates.x).toBe(50);
        expect(freshPlayer.coordinates.y).toBe(75);
        expect(freshPlayer.unlockedClasses).toContain('Guerreiro');
        expect(freshPlayer.activeClass).toBe('Guerreiro');
        expect(freshPlayer.unlockedSkills.has('w_t1_heavy_blow')).toBe(true);
    });

    it('should revive player to maxHp and set state to idle when loading a save with 0 HP or dead state', () => {
        const deadSave = {
            attributes: {
                level: 5,
                currentXp: 50,
                availablePoints: 0,
                maxHp: 150,
                hp: 0,
                mana: 50,
                strength: 10,
                constitution: 10,
                dexterity: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10
            },
            coins: 100,
            coordinates: { x: 200, y: 300 }
        };

        const freshPlayer = new Player(1, { x: 0, y: 0 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
        freshPlayer.state = 'dead';
        (domain as any).player = freshPlayer;

        // Act
        domain.restorePlayerState(deadSave);

        // Assert
        expect(freshPlayer.attributes.hp).toBe(150);
        expect(freshPlayer.attributes.maxHp).toBe(150);
        expect(freshPlayer.getState()).toBe('idle');

        // Verify player can move and update normally without returning early
        freshPlayer.direction.x = 1;
        freshPlayer.update(0.016);
        expect(freshPlayer.getState()).toBe('walking');
    });

    it('should serialize safe maxHp if player is dead when serialized', () => {
        player.attributes.hp = 0;
        player.state = 'dead';

        const serialized = domain.serializePlayerState();
        expect(serialized).not.toBeNull();
        expect(serialized!.attributes.hp).toBe(player.attributes.maxHp);
    });
});
