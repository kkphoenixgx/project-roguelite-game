import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type { IPlayer } from "../../../../ports/domain-contracts";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Vector2D from "../../../../shared/Vector2D";
import Attack from "../../../Items/Attack";

export default class Gunslinger extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();
    private lastFanHammerTime: number = 0;
    private readonly fanHammerCooldown: number = 5000;

    constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
        super('Gunslinger', xpTable, player, eventManager);
        this.skillsByLevel.set(1, new Skill('gs_t1_quickdraw', 'Saque Rápido', 'Reduz drasticamente o cooldown do tiro principal.', 'essential', 1, undefined, undefined, undefined, undefined, true));
        this.skillsByLevel.set(4, new Skill('gs_t2_fanhammer', 'Fan the Hammer', 'Descarrega o tambor da arma causando dano explosivo em área.', 'active', 2, 'gs_t1_quickdraw', undefined, undefined, undefined, true));
        this.skillsByLevel.set(6, new Skill('gs_t3_deadeye', 'Caminho do Franco-Atirador', 'Especialize-se na Subclasse Franco-Atirador para dano crítico avassalador.', 'rare', 3, 'gs_t2_fanhammer'));
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (skillId === 'gs_t2_fanhammer') {
            if ((this.player as any).isSkillOnCooldown?.(skillId)) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Gunslinger] Fan the Hammer em recarga!`, params: [] });
                return;
            }
            const now = Date.now();
            if (now - this.lastFanHammerTime < this.fanHammerCooldown) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Gunslinger] Fan the Hammer em recarga!`, params: [] });
                return;
            }
            this.lastFanHammerTime = now;
            (this.player as any).setSkillCooldown?.(skillId, this.fanHammerCooldown);
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Gunslinger] Fan the Hammer ativado no alvo: ${Math.floor(mouseCoordinates.x)}, ${Math.floor(mouseCoordinates.y)}`, params: [] });
            
            const px = this.player.coordinates.x + this.player.size.width / 2;
            const py = this.player.coordinates.y + this.player.size.height / 2;
            const baseDir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py).normalizeMut();
            
            const damage = 15 + Math.floor(this.player.attributes.dexterity * 1.5);
            
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    const angleOffset = (Math.random() - 0.5) * 0.5; //? Dispersão angular aleatória simulando recuo
                    const cos = Math.cos(angleOffset);
                    const sin = Math.sin(angleOffset);
                    const dir = new Vector2D(
                        baseDir.x * cos - baseDir.y * sin,
                        baseDir.x * sin + baseDir.y * cos
                    ).normalizeMut();

                    const attack = new Attack(this.player as any, damage, 'physical', []);
                    this.eventManager.dispatch('spawn', {
                        type: 'simpleBullet',
                        coordinates: { x: px - 4, y: py - 4 },
                        direction: dir,
                        attack: attack
                    });
                }, i * 100);
            }
        }
    }

    public getSkillForLevel(level: number): Skill | null {
        return this.skillsByLevel.get(level) || null;
    }

    public get allSkills(): Skill[] {
        return Array.from(this.skillsByLevel.values());
    }
}