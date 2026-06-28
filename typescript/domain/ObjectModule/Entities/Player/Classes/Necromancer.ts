import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type Player from "../Player";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Vector2D from "../../../../shared/Vector2D";
import Attack from "../../../Items/Attack";

export default class Necromancer extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();
    private lastExplosionTime: number = 0;
    private readonly explosionCooldown: number = 6000;

    constructor(xpTable: IXPTable, player: Player, eventManager: IEventManager) {
        super('Necromante', xpTable, player, eventManager);
        this.skillsByLevel.set(1, new Skill('n_t1_reap', 'Colheita Sombria', 'Golpeia com a foice para arrancar as almas dos inimigos.', 'essential', 1));
        this.skillsByLevel.set(4, new Skill('n_t2_lifesteal', 'Sede de Sangue', 'Seus ataques passam a curar uma porcentagem do seu HP.', 'passive', 2, 'n_t1_reap'));
        this.skillsByLevel.set(6, new Skill('n_t3_soul', 'Ascensão do Lich', 'Abandone sua humanidade. Subclasse com foco em invocação imortal.', 'rare', 3, 'n_t2_lifesteal'));
        this.skillsByLevel.set(8, new Skill('n_t4_corpse_explosion', 'Explosão Sombria', 'Detona almas em uma área para causar dano massivo em corrente.', 'active', 4, 'n_t3_soul'));
    }

    public executeSkill(skillId: string, mouseCoordinates: {x: number, y: number}): void {
        if (skillId === 'n_t4_corpse_explosion') {
            const now = Date.now();
            if (now - this.lastExplosionTime < this.explosionCooldown) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Explosão Sombria em recarga!`, params: [] });
                return;
            }
            this.lastExplosionTime = now;
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Necromante] Explosão Sombria ativada no alvo: ${Math.floor(mouseCoordinates.x)}, ${Math.floor(mouseCoordinates.y)}`, params: [] });
            
            // Efeito visual
            this.eventManager.dispatch('spawnVisual', {
                type: 'darkPulse',
                coordinates: { x: mouseCoordinates.x - 64, y: mouseCoordinates.y - 64 },
                duration: 0.5,
                size: { width: 128, height: 128 }
            });

            // Dano em área
            const radius = 120;
            const damage = 50 + Math.floor(this.player.attributes.wisdom * 2.5);
            const attack = new Attack(this.player, damage, 'magical', []);
            
            this.eventManager.dispatch('requestNeighbors', {
                coordinates: mouseCoordinates,
                radius: radius,
                callback: (neighbors: any[]) => {
                    neighbors.forEach(n => {
                        if (n.id !== this.player.id && 'takeDamage' in n) {
                            const dir = new Vector2D(
                                (n.coordinates.x + n.size.width / 2) - mouseCoordinates.x,
                                (n.coordinates.y + n.size.height / 2) - mouseCoordinates.y
                            );
                            if (dir.x === 0 && dir.y === 0) dir.x = 1;
                            dir.normalizeMut();
                            attack.execute(n, dir);
                            this.eventManager.dispatch('particle', { effect: 'darkPulse', x: n.coordinates.x, y: n.coordinates.y });
                        }
                    });
                }
            });
        }
    }

    public getSkillForLevel(level: number): Skill | null {
        return this.skillsByLevel.get(level) || null;
    }

    public get allSkills(): Skill[] {
        return Array.from(this.skillsByLevel.values());
    }
}