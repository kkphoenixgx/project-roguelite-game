import Class from "./Class";
import Skill from "../../../../Skills/Skill";
import type IXPTable from "../../IXPTable";
import type Player from "../Player";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Vector2D from "../../../../shared/Vector2D";
import Attack from "../../../Items/Attack";

export default class Warrior extends Class {
    private skillsByLevel: Map<number, Skill> = new Map();
    private lastCleaveTime: number = 0;
    private readonly cleaveCooldown: number = 4000;

    constructor(xpTable: IXPTable, player: Player, eventManager: IEventManager) {
        super('Guerreiro', xpTable, player, eventManager);
        this.skillsByLevel.set(1, new Skill('w_t1_strike', 'Força Bruta', 'Aumenta significativamente a Constituição da entidade.', 'attribute', 1));
        this.skillsByLevel.set(4, new Skill('w_t2_cleave', 'Corte Giratório', 'Gira a arma varrendo todos os inimigos ao seu redor em um ataque devastador.', 'active', 2, 'w_t1_strike'));
    }

    public executeSkill(skillId: string, _mouseCoordinates: {x: number, y: number}): void {
        if (skillId === 'w_t2_cleave') {
            const now = Date.now();
            if (now - this.lastCleaveTime < this.cleaveCooldown) {
                this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Corte Giratório em recarga!`, params: [] });
                return;
            }
            this.lastCleaveTime = now;
            this.eventManager.dispatch('log', { channel: 'domain', message: `[Guerreiro] Corte Giratório ativado!`, params: [] });
            
            const px = this.player.coordinates.x + this.player.size.width / 2;
            const py = this.player.coordinates.y + this.player.size.height / 2;
            
            // Efeito visual
            this.eventManager.dispatch('spawnVisual', {
                type: 'slashSparks',
                coordinates: { x: px - 64, y: py - 64 },
                duration: 0.4,
                size: { width: 128, height: 128 }
            });

            // Dano em área
            const radius = 100;
            const damage = 25 + Math.floor(this.player.attributes.strength * 2);
            const attack = new Attack(this.player, damage, 'physical', []);
            
            this.eventManager.dispatch('requestNeighbors', {
                coordinates: { x: px, y: py },
                radius: radius,
                callback: (neighbors: any[]) => {
                    neighbors.forEach(n => {
                        if (n.id !== this.player.id && 'takeDamage' in n) {
                            // Empurrão fraco para fora
                            const dir = new Vector2D(
                                (n.coordinates.x + n.size.width / 2) - px,
                                (n.coordinates.y + n.size.height / 2) - py
                            );
                            if (dir.x === 0 && dir.y === 0) dir.x = 1;
                            dir.normalizeMut();
                            attack.execute(n, dir);
                            this.eventManager.dispatch('particle', { effect: 'slashSparks', x: n.coordinates.x, y: n.coordinates.y });
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