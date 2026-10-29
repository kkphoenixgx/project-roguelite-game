import type { Meta, StoryObj } from '@storybook/html';
import CharacterMenuGui from './CharacterMenuGui';
import type { EntityRenderableState } from '../../../../domain/ports/domain-contracts';

const mockState: EntityRenderableState = {
    id: 1,
    coordinates: { x: 0, y: 0 },
    size: { width: 32, height: 32 },
    rotation: 0,
    entityTypeId: 'player',
    coins: 1500,
    maxBackpackSize: 36,
    attributes: {
        strength: 15,
        constitution: 12,
        dexterity: 18,
        intelligence: 10,
        wisdom: 8,
        charisma: 11,
        availablePoints: 3
    },
    derivedAttributes: {
        hp: 120,
        maxHp: 120,
        mana: 100,
        maxMana: 100,
        hpRegen: 6.0,
        manaRegen: 1.0,
        defence: 3.0,
        speed: 102,
        critChance: 4.8,
        critDamage: 168,
        dodge: 3.6,
        accuracy: 9.0,
        recharge: 4.5,
        piercing: 1,
        splashDamage: 3.6,
        tenacity: 6.0,
        vigor: 6.0,
        lucky: 1,
        insight: 0.8
    },
    equipment: {
        mainHand: { name: 'Cajado Aprendiz', rarity: 'Comum', baseDamage: 12, description: 'Um cajado simples.', iconId: 1, category: 'weapon' },
        secondHand: { name: 'Adaga de Ferro', rarity: 'Incomum', baseDamage: 10, description: 'Segunda arma rápida.', iconId: 4, category: 'weapon' },
        helmet: { name: 'Capacete Simples', rarity: 'Comum', description: 'Proteção básica.', iconId: 10, category: 'armor', armorType: 'helmet' },
        chestplate: { name: 'Peitoral de Ferro', rarity: 'Raro', description: 'Defesa sólida.', iconId: 11, category: 'armor', armorType: 'chestplate' },
        pants: { name: 'Calças de Ferro', rarity: 'Incomum', description: 'Protege as pernas.', iconId: 12, category: 'armor', armorType: 'pants' },
        boots: { name: 'Botas de Ferro', rarity: 'Incomum', description: 'Passos pesados.', iconId: 13, category: 'armor', armorType: 'boots' },
        gloves: { name: 'Luvas de Ferro', rarity: 'Incomum', description: 'Aderência forte.', iconId: 14, category: 'armor', armorType: 'gloves' },
        amulet: { name: 'Amuleto Simples', rarity: 'Raro', description: 'Aumenta sorte.', iconId: 15, category: 'armor', armorType: 'amulet' },
        bag: { name: 'Mochila de Couro', rarity: 'Comum', description: 'Espaço extra (+12 slots).', iconId: 100, category: 'storage', capacityBonus: 12, capacity: 12, storedItems: [] },
        belt: {
            name: 'Cinto de Couro Simples',
            rarity: 'Incomum',
            description: 'Cinto reforçado com 4 compartimentos para ferramentas.',
            iconId: 205,
            category: 'belt',
            capacity: 4,
            activeToolIndex: 0,
            toolSlots: [
                { name: 'Enxada de Ferro', rarity: 'Comum', tier: 1, description: 'Prepara solo arável.', iconId: 210, category: 'tool', toolType: 'hoe' },
                { name: 'Regador de Metal', rarity: 'Comum', tier: 1, description: 'Irriga plantações.', iconId: 211, category: 'tool', toolType: 'watering_can', currentWater: 10, maxWater: 10 },
                { name: 'Machado Silvestre', rarity: 'Incomum', tier: 1, description: 'Corta lenha em áreas selvagens.', iconId: 212, category: 'tool', toolType: 'axe' },
                null
            ]
        },
        leftHandRings: [
            { name: 'Anel Simples', rarity: 'Comum', description: 'Brilho discreto.', iconId: 16, category: 'armor', armorType: 'ring' },
            { name: 'Anel Invisível', rarity: 'Desconhecido', description: 'Sem imagem.', iconId: 999, category: 'armor', armorType: 'ring' }
        ],
        rightHandRings: [
            { name: 'Anel Simples Duplo', rarity: 'Incomum', description: 'Mais um anel.', iconId: 16, category: 'armor', armorType: 'ring' }
        ]
    },
    backpack: [
        { name: 'Martelo de Obras', rarity: 'Comum', tier: 1, description: 'Permite reformas civis na cidade.', iconId: 213, category: 'tool', toolType: 'hammer' },
        { name: 'Poção de Vida', rarity: 'Comum', description: 'Recupera HP.', iconId: 30, category: 'potion' },
        { name: 'Poção de Mana', rarity: 'Comum', description: 'Recupera MP.', iconId: 31, category: 'potion' },
        { name: 'Maçã', rarity: 'Comum', description: 'Lanche rápido.', iconId: 32, category: 'food' },
        { name: 'Arma de Fogo', rarity: 'Raro', description: 'Tecnologia antiga.', iconId: 2, category: 'weapon' },
        { name: 'Foice Sombria', rarity: 'Épico', description: 'Corta a alma.', iconId: 3, category: 'weapon' },
        { name: 'Tomo de Experiência', rarity: 'Épico', description: 'Garante 500 XP ao ser consumido.', iconId: 34, category: 'quest' },
        { name: 'Vara de Pesca', rarity: 'Incomum', description: 'Paciência.', iconId: 5, category: 'weapon' },
        { name: 'Moeda Antiga', rarity: 'Comum', description: 'Riqueza.', iconId: 33, category: 'currency' },
        { name: 'Presa de Vampiro', rarity: 'Raro', description: 'Roubo de vida.', iconId: 40, category: 'potion' },
        { name: 'Cogumelo Mega', rarity: 'Épico', description: 'Fica gigante.', iconId: 41, category: 'food' },
        { name: 'Frasco de Adrenalina', rarity: 'Lendário', description: 'Coração a mil.', iconId: 42, category: 'potion' }
    ],
    // 1. Habilidades Ativas da Classe (Slots 1 a 4 - Quadrados)
    activeLoadout: ['m_t1_fireball', 'm_t4_teleport', 'w_t2_cleave', null],
    // 2. Broches Ativos da Árvore Global (Slots 1 a 6 - Sol com espinhos)
    globalActiveLoadout: ['brooch_meteor', 'brooch_blink', 'brooch_chain', null, null, null],
    // 3. Broches Passivos da Árvore Global (Slots I a IV - Triângulos truncados)
    passiveLoadout: ['brooch_phoenix', 'brooch_titan', 'brooch_shadow', null],
    // Habilidades Ativas Desbloqueadas
    unlockedActiveSkills: [
        { id: 'm_t1_fireball', name: 'Axioma Inicial', description: 'Dispara um projétil de fogo arcano concentrado.', type: 'active', tier: 1, unlocked: true, canUnlock: false },
        { id: 'm_t4_teleport', name: 'Translocação (Blink)', description: 'Teletransporta pelo tecido da realidade numa curta distância.', type: 'active', tier: 4, unlocked: true, canUnlock: false },
        { id: 'w_t2_cleave', name: 'Corte Giratório', description: 'Gira a arma em 360 graus varrendo todos os inimigos ao redor.', type: 'active', tier: 2, unlocked: true, canUnlock: false }
    ],
    // Árvore de Habilidades da Classe (Passivas, Ativas e Primordial / Estrela)
    skillTree: [
        { id: 'pesc_t4_fishpet', name: 'Peixinho Místico', description: 'Invoca o companheiro peixe essencial do pescador que luta e auxilia em combate.', type: 'essential', tier: 1, unlocked: true, canUnlock: false },
        { id: 'm_t2_burn', name: 'Sobrecarga de Mana', description: 'Aumenta passivamente a regeneração de mana no calor da batalha.', type: 'passive', tier: 2, unlocked: true, canUnlock: false },
        { id: 'm_t3_knowledge', name: 'Erudição Arcana', description: 'Concede bônus permanente de escalonamento mágico.', type: 'passive', tier: 3, unlocked: true, canUnlock: false }
    ]
};

const mockDomain: any = {
    globalMetaSummary: {
        stats: [
            { name: 'Vitalidade', totalValue: 40 },
            { name: 'Agilidade', totalValue: 15 },
            { name: 'Foco Crítico', totalValue: 12 },
            { name: 'Dano de Splash', totalValue: 20 },
            { name: 'Regen Mana', totalValue: 5 },
            { name: 'Penetração', totalValue: 8 },
            { name: 'Tenacidade', totalValue: 10 },
            { name: 'Sorte Ancestral', totalValue: 3 }
        ],
        brooches: [
            { id: 'brooch_meteor', name: 'Meteoro Ígneo', description: 'Evoca uma chuva de meteoros das cinzas ancestrais.' },
            { id: 'brooch_blink', name: 'Salto Dimensional', description: 'Rasga o espaço teleportando instantaneamente.' },
            { id: 'brooch_chain', name: 'Corrente de Raios', description: 'Eletrocuta inimigos em cadeia propagando choque.' },
            { id: 'brooch_phoenix', name: 'Broche da Fênix', description: 'Ressuscita uma vez por jornada com 50% de HP máximo.' },
            { id: 'brooch_shadow', name: 'Broche das Sombras', description: 'Fica invisível por 3s e garante acerto crítico após esquiva.' },
            { id: 'brooch_titan', name: 'Broche do Titã', description: 'Concede +20 de armadura e resistência a atordoamentos.' }
        ]
    }
};

const createGuiStory = (initialTab: 'status' | 'inv' | 'skill') => {
    const existing = document.getElementById('character-menu-container') || document.querySelector('#character-menu-container');
    if (existing && existing.parentElement === document.body) existing.remove();

    const previousInstances = document.querySelectorAll('#character-menu-container');
    previousInstances.forEach((el) => {
        if (el.parentElement === document.body) el.remove();
    });

    let currentState = JSON.parse(JSON.stringify(mockState));

    const gui = new CharacterMenuGui(
        mockDomain,
        () => console.log('Toggle pause'),
        (idx) => {
            const item = currentState.backpack[idx];
            if (!item) return;
            const cat = (item.category || '').toLowerCase();
            
            // 1. Consumíveis (potion, food, currency, quest) -> remove da mochila com splice
            if (['potion', 'food', 'currency', 'quest'].includes(cat)) {
                console.log('Consumed item:', item.name);
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
                return;
            }

            // 2. Storage / Mochila extra
            if (cat === 'storage') {
                const bagItem = item;
                if (currentState.equipment.bag) {
                    const currentBag = currentState.equipment.bag;
                    const totalCap = 24 + (currentBag.capacityBonus || 0);
                    if (currentState.backpack.length >= totalCap) {
                        console.warn(`Inventário e bolsa totalmente cheios (${currentState.backpack.length}/${totalCap})! Não há espaço para trocar a bolsa.`);
                        return;
                    }
                    if (currentState.backpack.length >= 24) {
                        const excess = currentState.backpack.splice(23);
                        currentBag.storedItems = (currentBag.storedItems || []).concat(excess);
                    }
                    currentState.backpack.push(currentBag);
                    currentState.equipment.bag = undefined;

                    const newBagIdx = currentState.backpack.indexOf(bagItem);
                    if (newBagIdx !== -1) {
                        currentState.backpack.splice(newBagIdx, 1);
                    }
                } else {
                    currentState.backpack.splice(idx, 1);
                }

                currentState.equipment.bag = bagItem;
                if (bagItem.storedItems && bagItem.storedItems.length > 0) {
                    const restored = [...bagItem.storedItems];
                    bagItem.storedItems = [];
                    currentState.backpack.push(...restored);
                }
                currentState.maxBackpackSize = 24 + (bagItem.capacityBonus || 12);
                gui.update(currentState);
                return;
            }

            // 3. Cinto de Utilidades (Belt)
            if (cat === 'belt') {
                if (currentState.equipment.belt) {
                    currentState.backpack.push(currentState.equipment.belt);
                }
                currentState.equipment.belt = item;
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
                return;
            }

            // 4. Ferramentas (Tool)
            if (cat === 'tool') {
                if (!currentState.equipment.belt) {
                    console.warn('Você precisa equipar um Cinto antes de equipar ferramentas!');
                    return;
                }
                const toolSlots = currentState.equipment.belt.toolSlots;
                const emptyIdx = toolSlots.findIndex((t: any) => t === null);
                if (emptyIdx !== -1) {
                    toolSlots[emptyIdx] = item;
                } else {
                    const activeIdx = currentState.equipment.belt.activeToolIndex || 0;
                    const old = toolSlots[activeIdx];
                    toolSlots[activeIdx] = item;
                    if (old) currentState.backpack.push(old);
                }
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
                return;
            }

            // 5. Armas e Offhand (Suporta empunhadura dupla / segunda arma)
            if (cat === 'weapon' || cat === 'offhand') {
                const isOffhand = cat === 'offhand' || item.weaponType === 'offhand';
                const targetSlot = (isOffhand || (currentState.equipment.mainHand && !currentState.equipment.secondHand)) ? 'secondHand' : 'mainHand';

                if (targetSlot === 'secondHand') {
                    if (currentState.equipment.secondHand) {
                        currentState.backpack.push(currentState.equipment.secondHand);
                    }
                    currentState.equipment.secondHand = item;
                } else {
                    if (currentState.equipment.mainHand) {
                        currentState.backpack.push(currentState.equipment.mainHand);
                    }
                    currentState.equipment.mainHand = item;
                }
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
                return;
            }

            // 6. Armaduras e Acessórios
            let armorType = (item.armorType || '').toLowerCase();
            if (!armorType) {
                if (item.name.includes('Anel')) armorType = 'ring';
                else if (item.name.includes('Capacete')) armorType = 'helmet';
                else if (item.name.includes('Peitoral') || item.name.includes('Cota') || item.name.includes('Armadura')) armorType = 'chestplate';
                else if (item.name.includes('Calça')) armorType = 'pants';
                else if (item.name.includes('Bota')) armorType = 'boots';
                else if (item.name.includes('Luva')) armorType = 'gloves';
                else if (item.name.includes('Amuleto')) armorType = 'amulet';
            }

            if (armorType === 'ring') {
                if (!currentState.equipment.leftHandRings) currentState.equipment.leftHandRings = [];
                if (!currentState.equipment.rightHandRings) currentState.equipment.rightHandRings = [];
                
                if (currentState.equipment.leftHandRings.length < 5) {
                    currentState.equipment.leftHandRings.push(item);
                } else if (currentState.equipment.rightHandRings.length < 5) {
                    currentState.equipment.rightHandRings.push(item);
                } else {
                    const oldRing = currentState.equipment.leftHandRings.shift();
                    if (oldRing) currentState.backpack.push(oldRing);
                    currentState.equipment.leftHandRings.push(item);
                }
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
                return;
            }

            if (armorType && ['helmet', 'chestplate', 'pants', 'boots', 'gloves', 'amulet'].includes(armorType)) {
                if (currentState.equipment[armorType]) {
                    currentState.backpack.push(currentState.equipment[armorType]);
                }
                currentState.equipment[armorType] = item;
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
                return;
            }

            // Fallback genérico para outros itens
            currentState.backpack.splice(idx, 1);
            gui.update(currentState);
        },
        (slot, idx) => {
            const maxBackpack = currentState.maxBackpackSize || 24;
            if (slot !== 'bag' && currentState.backpack.length >= maxBackpack) {
                console.warn('Inventário cheio!');
                return;
            }

            if (slot === 'leftHandRings' && idx !== undefined) {
                if (currentState.equipment.leftHandRings && currentState.equipment.leftHandRings.length > idx) {
                    const ring = currentState.equipment.leftHandRings.splice(idx, 1)[0];
                    if (ring) currentState.backpack.push(ring);
                }
            } else if (slot === 'rightHandRings' && idx !== undefined) {
                if (currentState.equipment.rightHandRings && currentState.equipment.rightHandRings.length > idx) {
                    const ring = currentState.equipment.rightHandRings.splice(idx, 1)[0];
                    if (ring) currentState.backpack.push(ring);
                }
            } else if (slot === 'bag' && currentState.equipment.bag) {
                const bag = currentState.equipment.bag;
                const totalCapacity = 24 + (bag.capacityBonus || 12);
                if (currentState.backpack.length >= totalCapacity) {
                    console.warn(`Inventário e bolsa totalmente cheios (${currentState.backpack.length}/${totalCapacity})! Não há espaço para guardar a bolsa.`);
                    return;
                }
                if (currentState.backpack.length >= 24) {
                    const excessItems = currentState.backpack.splice(23);
                    bag.storedItems = (bag.storedItems || []).concat(excessItems);
                    console.log(`${excessItems.length} itens foram guardados dentro da ${bag.name} ao desequipá-la.`);
                }
                currentState.backpack.push(bag);
                currentState.equipment.bag = undefined;
                currentState.maxBackpackSize = 24;
            } else if (slot === 'belt' && currentState.equipment.belt) {
                currentState.backpack.push(currentState.equipment.belt);
                currentState.equipment.belt = undefined;
            } else if (currentState.equipment[slot]) {
                currentState.backpack.push(currentState.equipment[slot]);
                currentState.equipment[slot] = undefined;
            }
            gui.update(currentState);
        },
        (attr) => console.log('Allocate attribute', attr),
        (idx) => {
            if (currentState.backpack[idx]) {
                currentState.backpack.splice(idx, 1);
                gui.update(currentState);
            }
        },
        undefined, // skillActionCallback
        (action: 'equipTool' | 'unequipTool' | 'selectTool', payload: any) => {
            if (!currentState.equipment.belt) return;
            if (action === 'selectTool' && payload.beltSlotIndex !== undefined) {
                currentState.equipment.belt.activeToolIndex = payload.beltSlotIndex;
                console.log('Ferramenta ativa alterada para o slot:', payload.beltSlotIndex);
            }
            if (action === 'unequipTool' && payload.beltSlotIndex !== undefined) {
                const tool = currentState.equipment.belt.toolSlots[payload.beltSlotIndex];
                if (tool) {
                    currentState.equipment.belt.toolSlots[payload.beltSlotIndex] = null;
                    currentState.backpack.push(tool);
                    console.log('Ferramenta desequipada do cinto:', tool.name);
                }
            }
            gui.update(currentState);
        }
    );

    gui.toggle();
    gui.update(currentState);
    if (initialTab !== 'status') {
        gui.switchTab(initialTab);
    }

    return document.createElement('div');
};

interface StoryArgs {}

const meta: Meta<StoryArgs> = {
    title: 'HUD/CharacterMenuGui',
};

export default meta;

export const Default: StoryObj<StoryArgs> = {
    args: {},
    render: () => createGuiStory('status')
};

export const Habilidades: StoryObj<StoryArgs> = {
    args: {},
    render: () => createGuiStory('skill')
};

export const Inventario: StoryObj<StoryArgs> = {
    args: {},
    render: () => createGuiStory('inv')
};
