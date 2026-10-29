import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type { IPlayer } from "../../../../ports/domain-contracts";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import { BindAction } from "../../../../eventDispacher/ActionBindings";
import type { action } from "../../../../eventDispacher/actions.type";
import Vector2D from "../../../../shared/Vector2D";
import MageSpellCraftingRegistry from "../../../../templates/mage/MageSpellCraftingRegistry";


/**
 * ==============================================================================
 * CLASSE DO JOGADOR: MAGO (AXIOMANTE)
 * ==============================================================================
 * Classe focada em conjuração rúnica dinâmica e estática.
 * Toda a gramática de feitiços, combinações elementais e resolução física é
 * delegada ao MageSpellCraftingRegistry (Hexagonal / SRP / Clean Code).
 * ==============================================================================
 */
export default class Mage extends Class {
    private readonly skillsByLevel: Map<number, Skill> = new Map();

    private spellBuffer: action[] = [];
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private readonly SPELL_TIMEOUT = 500;
    
    private lastTeleportTime: number = 0;
    private readonly teleportCooldown: number = 3000;

    public readonly spellRegistry: MageSpellCraftingRegistry;

    constructor(
        xpTable: IXPTable,
        player: IPlayer,
        eventManager: IEventManager,
        spellRegistry?: MageSpellCraftingRegistry
    ) {
        super('Mago', xpTable, player, eventManager);
        this.spellRegistry = spellRegistry ?? MageSpellCraftingRegistry.createDefault();

        this.skillsByLevel.set(1, new Skill('m_t1_fireball', 'Axioma Inicial', 'A fundação do Axiomante. Dispara um projétil puro usando as teclas de feitiço.', 'essential', 1));
        this.skillsByLevel.set(4, new Skill('m_t2_burn', 'Sobrecarga de Mana', 'Aumenta passivamente a regeneração de mana no calor da batalha.', 'passive', 2, 'm_t1_fireball'));
        this.skillsByLevel.set(6, new Skill('m_t3_knowledge', 'Erudição', 'Concede um aumento formidável em Inteligência Máxima.', 'attribute', 3, 'm_t2_burn'));
        this.skillsByLevel.set(8, new Skill('m_t4_teleport', 'Translocação (Blink)', 'Teletransporta o corpo pelo tecido da realidade numa curta distância.', 'active', 4, 'm_t3_knowledge'));
        this.skillsByLevel.set(10, new Skill('m_t5_blackhole', 'Buraco Negro', 'Colapsa o espaço-tempo em uma singularidade de gravidade devastadora.', 'active', 5, 'm_t4_teleport'));
    }

    @BindAction('spell_0')
    @BindAction('spell_1')
    @BindAction('spell_2')
    @BindAction('spell_3')
    @BindAction('spell_4')
    @BindAction('spell_5')
    @BindAction('spell_6')
    @BindAction('spell_7')
    @BindAction('spell_8')
    @BindAction('spell_9')
    public onSpellInput(_mouseCoordinates: any, action: action) {
        if (!this.canUseSpellBuffer()) return;
        if (this.player.activeStatuses?.has('stun') || this.player.activeStatuses?.has('paralyze')) return; // Concentração quebrada!
        this.spellBuffer.push(action);
        
        // Trava de segurança: se passar de 9 teclas (overload de magia), a concentração quebra e o buffer limpa
        if (this.spellBuffer.length > 9) {
            this.spellBuffer = [];
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.eventManager.dispatch('log', { channel: 'input', message: "Spell buffer overflow (>9). Concentration broken!", params: [] });
            return;
        }

        this.eventManager.dispatch('log', { channel: 'input', message: `Current Spell Buffer: [${this.spellBuffer.map(s => s.split('_')[1]).join(', ')}]`, params: [] });
        
        if (this.timeoutId) clearTimeout(this.timeoutId);

        // O timer é o responsável por engatilhar a magia (Auto-Cast) após o jogador parar de digitar
        this.timeoutId = setTimeout(() => {
            this.evaluateSpellBuffer();
            this.spellBuffer = [];
        }, this.SPELL_TIMEOUT);
    }

    @BindAction('castSpell')
    public onCastSpell() {
        if (!this.canUseSpellBuffer()) return;
        if (this.spellBuffer.length > 0) {
            this.evaluateSpellBuffer();
            this.spellBuffer = [];
            if (this.timeoutId) clearTimeout(this.timeoutId);
        }
    }

    private canUseSpellBuffer(): boolean {
        if (this.player.unlockedClasses && this.player.unlockedClasses.length > 0) {
            if (!this.player.unlockedClasses.includes('Mago')) {
                return false;
            }
        }
        const mainHand = (this.player.equipment as any)?.mainHand;
        if (mainHand) {
            return mainHand.weaponType === 'staff'
                || mainHand.unlocksClass === 'Mago'
                || mainHand.projectileType === 'magicMissile'
                || (typeof mainHand.name === 'string' && mainHand.name.toLowerCase().includes('cajado'));
        }
        return true;
    }

    /**
     * Avalia e executa o feitiço no buffer através do registro de feitiços desacoplado.
     */
    private evaluateSpellBuffer(): boolean {
        return this.spellRegistry.executeSpell(this.spellBuffer, this.player, this.eventManager);
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        const px = this.player.coordinates.x + this.player.size.width / 2;
        const py = this.player.coordinates.y + this.player.size.height / 2;

        if (skillId === 'm_t4_teleport') {
            if ((this.player as any).isSkillOnCooldown?.(skillId)) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Translocação em recarga!`, params: [] });
                return;
            }
            const now = Date.now();
            if (now - this.lastTeleportTime < this.teleportCooldown) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Translocação em recarga!`, params: [] });
                return;
            }
            this.lastTeleportTime = now;
            (this.player as any).setSkillCooldown?.(skillId, this.teleportCooldown);
            
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py);
            const dist = dir.magnitude();
            const maxDist = 200; // Limite de distância do Blink
            
            if (dist > maxDist) {
                dir.normalizeMut().multiplyMut(maxDist);
            }
            
            // Efeito visual e partícula de saída
            this.eventManager.dispatch('spawnVisual', {
                type: 'teleport-blink',
                coordinates: { x: px - 32, y: py - 32 },
                duration: 0.35,
                size: { width: 64, height: 64 }
            });
            this.eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py });
            
            // Move player
            this.player.coordinates.x += dir.x;
            this.player.coordinates.y += dir.y;
            
            // Efeito visual e partícula de chegada
            const destX = this.player.coordinates.x + this.player.size.width / 2;
            const destY = this.player.coordinates.y + this.player.size.height / 2;
            this.eventManager.dispatch('spawnVisual', {
                type: 'teleport-blink',
                coordinates: { x: destX - 32, y: destY - 32 },
                duration: 0.35,
                size: { width: 64, height: 64 }
            });
            this.eventManager.dispatch('particle', { effect: 'magicPulse', x: destX, y: destY });
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Translocação (Blink) executada!`, params: [] });
        } else if (skillId === 'm_t5_blackhole') {
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py);
            const buffer: action[] = ['spell_0', 'spell_3', 'spell_7', 'spell_7'];
            this.spellRegistry.executeSpell(buffer, this.player, this.eventManager, dir, { x: px, y: py }, 50);
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Buraco Negro Conjurado!`, params: [] });
        } else if (skillId === 'm_t1_fireball') {
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py);
            this.spellRegistry.executeStaticSpell('fireball', this.player, this.eventManager, dir, { x: px, y: py }, 10);
        } else if (skillId === 'dynamicSpell') {
            const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py);
            const forms = ['spell_0', 'spell_1'];
            const forces = ['spell_2', 'spell_3', ''];
            const elements = ['spell_4', 'spell_5', 'spell_6', 'spell_7', 'spell_8', 'spell_9'];
            
            const buffer: action[] = [];
            buffer.push(forms[Math.floor(Math.random() * forms.length)] as action);
            const force = forces[Math.floor(Math.random() * forces.length)];
            if (force) buffer.push(force as action);
            buffer.push(elements[Math.floor(Math.random() * elements.length)] as action);
            buffer.push(elements[Math.floor(Math.random() * elements.length)] as action);
            
            this.spellRegistry.executeSpell(buffer, this.player, this.eventManager, dir, { x: px, y: py }, 25);
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Magia Dinâmica Conjurada!`, params: [] });
        } else {
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Mago] Tentando usar a skill ${skillId} via Loadout (Axiomante geralmente usa digitação!)`, params: [] });
        }
    }

    //? ----------- Skills -----------
    public getSkillForLevel(level: number): Skill | null { return this.skillsByLevel.get(level) || null; }
    public get allSkills(): Skill[] { return Array.from(this.skillsByLevel.values()); }
}