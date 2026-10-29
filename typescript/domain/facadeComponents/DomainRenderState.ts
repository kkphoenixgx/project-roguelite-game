import type Player from "../ObjectModule/Entities/Player/Player";
import type GameWorld from "../ObjectModule/GameWorld";
import type ObjectElementManager from "../ObjectModule/ObjectElementManager";
import type { ILogger } from "../ports/ILogger";
import type { WorldState, RenderableState } from "../ports/domain-contracts";
import SkillBranchManager from "../Skills/SkillBranchManager";

const TIER_LEVEL_MAP: Readonly<Record<number, number>> = { 1: 1, 2: 4, 3: 7, 4: 10 };
const EMPTY_DEPS: readonly string[] = [];

export default class DomainRenderState {
    private cachedRenderState = {
        world: { width: 0, height: 0, mapId: 'vilgem' },
        renderables: [] as any[]
    };
    private cachedPlayerState: any = null;

    // Dirty-checking state signatures for Skill Tree & Class Lists (Zero-GC per frame)
    private isSkillTreeDirty: boolean = true;
    private lastPlayerRef: Player | null = null;
    private lastViewedClass: string | null = null;
    private lastActiveClass: string | null = null;
    private lastPlayerLevel: number = -1;
    private lastUnlockedSkillsCount: number = -1;
    private lastFirstUnlockedSkill: string | undefined = undefined;
    private lastLastUnlockedSkill: string | undefined = undefined;
    private lastUnlockedClassesCount: number = -1;
    private lastClassesCount: number = -1;
    private lastEvolvingStageSum: number = -1;

    // Cache of skillId -> requiredLevel per class name to avoid linear Map entry scans
    private classSkillLevelCache: Map<string, Map<string, number>> = new Map();

    constructor(
        private logger: ILogger,
        private getViewedClass: () => string | null
    ) {}

    /**
     * Força a invalidação do cache da árvore de habilidades e classes no próximo frame.
     */
    public invalidateCache(): void {
        this.isSkillTreeDirty = true;
    }

    private getRequiredLevelMap(classInstance: any): Map<string, number> {
        let levelMap = this.classSkillLevelCache.get(classInstance.name);
        const allSkills = classInstance.allSkills || [];
        if (levelMap && levelMap.size === allSkills.length) {
            return levelMap;
        }

        levelMap = new Map<string, number>();
        const skillsMap = classInstance.skillsByLevel as Map<number, any> | undefined;
        if (skillsMap && typeof skillsMap.entries === 'function') {
            for (const [lvl, sk] of skillsMap.entries()) {
                if (sk && sk.id) {
                    levelMap.set(sk.id, lvl);
                }
            }
        }

        for (let s = 0; s < allSkills.length; s++) {
            const skill = allSkills[s];
            if (!skill) continue;
            let requiredLevel = levelMap.get(skill.id) ?? 1;
            if (requiredLevel === 1 && skill.tier) {
                requiredLevel = TIER_LEVEL_MAP[skill.tier] ?? 1;
            }
            levelMap.set(skill.id, requiredLevel);
        }

        this.classSkillLevelCache.set(classInstance.name, levelMap);
        return levelMap;
    }

    public getRenderState(
        world: GameWorld | undefined,
        player: Player | undefined,
        objectManager: ObjectElementManager
    ): { world: WorldState; renderables: readonly RenderableState[] } {
        this.logger.log('sync', 'DomainFacade getting render state...');
        if (!world || !player) throw new Error("O mundo do domínio não foi inicializado. Chame loadWorld() antes de getRenderState().");

        const worldBounds = world.bounds || {
            minX: (world as any).minX ?? 0,
            minY: (world as any).minY ?? 0,
            maxX: (world as any).maxX ?? world.width,
            maxY: (world as any).maxY ?? world.height,
            width: world.width,
            height: world.height,
            originChunk: (world as any).originChunk ?? { cx: 0, cy: 0 }
        };
        this.cachedRenderState.world.width = world.width;
        this.cachedRenderState.world.height = world.height;
        this.cachedRenderState.world.mapId = world.mapId;
        (this.cachedRenderState.world as any).minX = worldBounds.minX;
        (this.cachedRenderState.world as any).minY = worldBounds.minY;
        (this.cachedRenderState.world as any).maxX = worldBounds.maxX;
        (this.cachedRenderState.world as any).maxY = worldBounds.maxY;
        (this.cachedRenderState.world as any).originChunk = worldBounds.originChunk;
        (this.cachedRenderState.world as any).bounds = worldBounds;
        const chunkMgr = objectManager.getChunkManager?.();
        if (chunkMgr) {
            (this.cachedRenderState.world as any).activeChunk = chunkMgr.getCurrentChunk();
            (this.cachedRenderState.world as any).activeChunks = chunkMgr.getActiveChunks();
        }

        if (!this.cachedPlayerState) {
            this.cachedPlayerState = {
                id: player.id,
                entityTypeId: player.objectId,
                coordinates: { x: 0, y: 0 },
                size: { width: 0, height: 0 },
                attributes: {},
                equipment: {}
            };
            this.isSkillTreeDirty = true;
        }

        const ps = this.cachedPlayerState;
        ps.id = player.id;
        ps.entityTypeId = player.objectId;
        ps.coordinates.x = player.coordinates.x;
        ps.coordinates.y = player.coordinates.y;
        ps.size.width = player.size.width;
        ps.size.height = player.size.height;
        ps.state = player.state;
        ps.rotation = player.rotation;
        ps.hasBeard = player.hasBeard;
        ps.facingDirection = player.facingDirection;
        
        ps.level = player.attributes.level;
        ps.currentXp = player.attributes.currentXp;
        ps.xpToNextLevel = player.attributes.xpToNextLevel;
        ps.hp = player.attributes.hp;
        ps.maxHp = player.attributes.maxHp;
        ps.mana = player.attributes.mana;
        ps.maxMana = player.attributes.maxMana;
        ps.coins = player.coins;
        
        // Object Pooling para Hitboxes do Player
        if (!ps.hitboxes) ps.hitboxes = [];
        const playerHitboxes = player.hitboxes || [];
        for (let i = 0; i < playerHitboxes.length; i++) {
            ps.hitboxes[i] = playerHitboxes[i]!.getDebugShape();
        }
        ps.hitboxes.length = playerHitboxes.length;

        // Object Pooling para Status Ativos
        if (!ps.activeStatuses) ps.activeStatuses = [];
        let statusIndex = 0;
        const statusesList = player.activeStatusesList || [];
        for (let i = 0; i < statusesList.length; i++) {
            const s = statusesList[i]!;
            if (!ps.activeStatuses[statusIndex]) ps.activeStatuses[statusIndex] = { id: '', description: '', remaining: 0 };
            const uiStatus = ps.activeStatuses[statusIndex];
            uiStatus.id = s.id;
            uiStatus.description = s.description;
            uiStatus.remaining = Math.max(0, s.duration - s.elapsed);
            statusIndex++;
        }
        ps.activeStatuses.length = statusIndex;
        
        ps.attributes.strength = player.attributes.strength;
        ps.attributes.constitution = player.attributes.constitution;
        ps.attributes.dexterity = player.attributes.dexterity;
        ps.attributes.intelligence = player.attributes.intelligence;
        ps.attributes.wisdom = player.attributes.wisdom;
        ps.attributes.charisma = player.attributes.charisma;
        ps.attributes.availablePoints = player.attributes.availablePoints;

        if (!ps.derivedAttributes) ps.derivedAttributes = {} as any;
        const da = ps.derivedAttributes;
        const pa = player.attributes;
        da.hp = pa.hp;
        da.maxHp = pa.maxHp;
        da.mana = pa.mana;
        da.maxMana = pa.maxMana;
        da.hpRegen = pa.hpRegen;
        da.manaRegen = pa.manaRegen;
        da.defence = pa.defence;
        da.speed = pa.speed;
        da.critChance = pa.critChance;
        da.critDamage = pa.critDamage;
        da.dodge = pa.dodge;
        da.accuracy = pa.accuracy;
        da.recharge = pa.recharge;
        da.piercing = pa.piercing;
        da.splashDamage = pa.splashDamage;
        da.tenacity = pa.tenacity;
        da.vigor = pa.vigor;
        da.lucky = pa.lucky;
        da.insight = pa.insight;

        ps.backpack = player.backpack;
        ps.equipment = player.equipment;
        ps.maxBackpackSize = player.maxBackpackSize;

        ps.activeClass = player.activeClass;
        ps.unlockedClasses = player.unlockedClasses;

        const classToView = this.getViewedClass() || player.activeClass;

        // Calcula assinatura rápida (O(1)) para detectar se a árvore de skills ou classes mudou
        let evolvingStageSum = 0;
        const playerClasses = player.classes;
        for (let i = 0; i < playerClasses.length; i++) {
            const c = playerClasses[i] as any;
            if (c && c.isEvolving && typeof c.currentStage === 'number') {
                evolvingStageSum += c.currentStage * (i + 1);
            }
        }

        const unlockedSkillsSet = player.unlockedSkills;
        const unlockedSkillsCount = unlockedSkillsSet.size;
        let firstUnlocked: string | undefined = undefined;
        let lastUnlocked: string | undefined = undefined;
        if (unlockedSkillsCount > 0) {
            for (const skId of unlockedSkillsSet) {
                if (firstUnlocked === undefined) firstUnlocked = skId;
                lastUnlocked = skId;
            }
        }

        const needsTreeRebuild =
            this.isSkillTreeDirty ||
            !ps.classes ||
            !ps.skillTree ||
            !ps.unlockedActiveSkills ||
            this.lastPlayerRef !== player ||
            this.lastViewedClass !== classToView ||
            this.lastActiveClass !== player.activeClass ||
            this.lastPlayerLevel !== player.attributes.level ||
            this.lastUnlockedSkillsCount !== unlockedSkillsCount ||
            this.lastFirstUnlockedSkill !== firstUnlocked ||
            this.lastLastUnlockedSkill !== lastUnlocked ||
            this.lastUnlockedClassesCount !== player.unlockedClasses.length ||
            this.lastClassesCount !== playerClasses.length ||
            this.lastEvolvingStageSum !== evolvingStageSum;

        if (needsTreeRebuild) {
            this.isSkillTreeDirty = false;
            this.lastPlayerRef = player;
            this.lastViewedClass = classToView;
            this.lastActiveClass = player.activeClass;
            this.lastPlayerLevel = player.attributes.level;
            this.lastUnlockedSkillsCount = unlockedSkillsCount;
            this.lastFirstUnlockedSkill = firstUnlocked;
            this.lastLastUnlockedSkill = lastUnlocked;
            this.lastUnlockedClassesCount = player.unlockedClasses.length;
            this.lastClassesCount = playerClasses.length;
            this.lastEvolvingStageSum = evolvingStageSum;

            // Object Pooling para Classes (sem operador delete para preservar Hidden Classes no V8)
            if (!ps.classes) ps.classes = [];
            let viewedClassInstance = undefined;
            for (let i = 0; i < playerClasses.length; i++) {
                const c = playerClasses[i]!;
                if (c.name === classToView) {
                    viewedClassInstance = c;
                }
                if (!ps.classes[i]) {
                    ps.classes[i] = {
                        name: '',
                        isUnlocked: false,
                        isActive: false,
                        isEvolving: undefined,
                        currentStage: undefined,
                        stageTitle: undefined
                    };
                }
                const uiClass = ps.classes[i];
                uiClass.name = c.name;
                uiClass.isUnlocked = player.unlockedClasses.includes(c.name);
                uiClass.isActive = c.name === classToView;
                if ('isEvolving' in c && (c as any).isEvolving) {
                    uiClass.isEvolving = true;
                    uiClass.currentStage = (c as any).currentStage;
                    uiClass.stageTitle = (c as any).stageTitle;
                } else {
                    uiClass.isEvolving = undefined;
                    uiClass.currentStage = undefined;
                    uiClass.stageTitle = undefined;
                }
            }
            ps.classes.length = playerClasses.length;

            if (!ps.skillTree) ps.skillTree = [];
            if (viewedClassInstance) {
                const requiredLevelMap = this.getRequiredLevelMap(viewedClassInstance);
                const isClassUnlocked = player.unlockedClasses.includes(viewedClassInstance.name);
                const allClassSkills = viewedClassInstance.allSkills;

                let stIndex = 0;
                for (let s = 0; s < allClassSkills.length; s++) {
                    const skill = allClassSkills[s]!;
                    const requiredLevel = requiredLevelMap.get(skill.id) ?? 1;

                    if (!ps.skillTree[stIndex]) {
                        ps.skillTree[stIndex] = {
                            id: '',
                            name: '',
                            description: '',
                            type: 'active',
                            tier: 1,
                            unlocked: false,
                            canUnlock: false,
                            dependencies: EMPTY_DEPS,
                            requiredSkillId: undefined,
                            isBranchBlocked: false,
                            requiresMainHandWeapon: undefined
                        };
                    }
                    const uiNode = ps.skillTree[stIndex];

                    uiNode.id = skill.id;
                    uiNode.name = skill.name;
                    uiNode.description = skill.description || '';
                    uiNode.type = skill.type;
                    uiNode.tier = skill.tier || 1;
                    uiNode.unlocked = unlockedSkillsSet.has(skill.id);
                    uiNode.dependencies = skill.dependencies || (skill.requiredSkillId ? [skill.requiredSkillId] : EMPTY_DEPS);
                    uiNode.requiredSkillId = skill.requiredSkillId;

                    const deps = uiNode.dependencies;
                    let hasPrereq = true;
                    for (let d = 0; d < deps.length; d++) {
                        if (!unlockedSkillsSet.has(deps[d]!)) {
                            hasPrereq = false;
                            break;
                        }
                    }

                    const isBranchBlocked = SkillBranchManager.isSkillBlockedByBranchSelection(
                        skill.id,
                        allClassSkills,
                        unlockedSkillsSet,
                        viewedClassInstance.name
                    );
                    uiNode.isBranchBlocked = isBranchBlocked;
                    uiNode.requiresMainHandWeapon = skill.requiresMainHandWeapon;
                    uiNode.canUnlock = isClassUnlocked && !uiNode.unlocked && !isBranchBlocked && player.attributes.level >= requiredLevel && hasPrereq;

                    stIndex++;
                }
                ps.skillTree.length = stIndex;
            } else {
                ps.skillTree.length = 0;
            }

            if (!ps.unlockedActiveSkills) ps.unlockedActiveSkills = [];
            let activeSkillIndex = 0;
            for (let c = 0; c < playerClasses.length; c++) {
                const cls = playerClasses[c]!;
                const clsSkills = cls.allSkills;
                for (let s = 0; s < clsSkills.length; s++) {
                    const skill = clsSkills[s]!;
                    if (skill.type === 'active' && unlockedSkillsSet.has(skill.id)) {
                        if (!ps.unlockedActiveSkills[activeSkillIndex]) ps.unlockedActiveSkills[activeSkillIndex] = {} as any;
                        const uiSkill = ps.unlockedActiveSkills[activeSkillIndex];
                        uiSkill.id = skill.id;
                        uiSkill.name = skill.name;
                        uiSkill.description = skill.description || '';
                        uiSkill.type = skill.type;
                        uiSkill.tier = skill.tier || 1;
                        uiSkill.unlocked = true;
                        uiSkill.canUnlock = false;
                        uiSkill.requiresMainHandWeapon = skill.requiresMainHandWeapon;
                        activeSkillIndex++;
                    }
                }
            }
            ps.unlockedActiveSkills.length = activeSkillIndex;
        }

        if (!ps.activeLoadout) ps.activeLoadout = [];
        for (let i = 0; i < player.activeLoadout.length; i++) {
            ps.activeLoadout[i] = player.activeLoadout[i];
        }
        ps.activeLoadout.length = player.activeLoadout.length;

        if (!ps.passiveLoadout) ps.passiveLoadout = [];
        for (let i = 0; i < (player as any).passiveLoadout.length; i++) {
            ps.passiveLoadout[i] = (player as any).passiveLoadout[i];
        }
        ps.passiveLoadout.length = (player as any).passiveLoadout.length;

        if (!ps.globalActiveLoadout) ps.globalActiveLoadout = [];
        const gal = (player as any).globalActiveLoadout || [];
        for (let i = 0; i < gal.length; i++) {
            ps.globalActiveLoadout[i] = gal[i];
        }
        ps.globalActiveLoadout.length = gal.length;

        ps.skillCooldowns = typeof (player as any).getActiveCooldowns === 'function' ? (player as any).getActiveCooldowns() : {};

        ps.visualTint = (player as any).visualTint;
        ps.visualScale = (player as any).visualScale;

        const otherStates = objectManager.getAllRenderableStates();
        
        let nearestDistSq = 2500; // 50 * 50 (evita Math.hypot/sqrt em cada NPC a cada frame)
        let nearestNpc = null;
        const px = ps.coordinates.x + ps.size.width * 0.5;
        const py = ps.coordinates.y + ps.size.height * 0.5;

        for (let i = 0; i < otherStates.length; i++) {
            const st = otherStates[i]!;
            if (st.isInteractiveNpc) {
                const dx = px - (st.coordinates.x + st.size.width * 0.5);
                const dy = py - (st.coordinates.y + st.size.height * 0.5);
                const distSq = dx * dx + dy * dy;
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearestNpc = st;
                }
            }
        }

        if (nearestNpc) {
            const npcName = nearestNpc.npcName || 'NPC';
            
            if (!ps.interactablePrompt) ps.interactablePrompt = { npcId: 0, text: '', npcName: '', entityTypeId: '' };
            ps.interactablePrompt.npcId = nearestNpc.id;
            ps.interactablePrompt.text = '[Z] Falar';
            ps.interactablePrompt.npcName = npcName;
            ps.interactablePrompt.entityTypeId = nearestNpc.entityTypeId;
        } else {
            ps.interactablePrompt = undefined;
        }
        
        this.cachedRenderState.renderables.length = otherStates.length + 1;
        this.cachedRenderState.renderables[0] = ps;
        for (let i = 0; i < otherStates.length; i++) {
            this.cachedRenderState.renderables[i + 1] = otherStates[i];
        }
        return this.cachedRenderState;
    }
}

