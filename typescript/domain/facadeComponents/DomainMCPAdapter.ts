import type { IEventManager } from "../eventDispacher/IGameEvents";
import type Player from "../ObjectModule/Entities/Player/Player";
import type ObjectElementManager from "../ObjectModule/ObjectElementManager";

export default class DomainMCPAdapter {
    constructor(
        private player: Player,
        private objectManager: ObjectElementManager,
        private eventManager: IEventManager
    ) {
        this.setupListener();
    }

    private setupListener(): void {
        this.eventManager.on('bdiAction', (payload: any) => {
            const actionStr = payload.action;
            if (typeof actionStr === 'string' && actionStr.startsWith('mcp_domain_')) {
                this.handleDomainCommand(actionStr, payload.content, payload.agent);
            }
        });
    }

    private handleDomainCommand(action: string, argsRaw: string, agentName: string): void {
        const args = argsRaw ? argsRaw.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, '')) : [];

        try {
            switch (action) {
                case 'mcp_domain_spawn':
                    this.triggerSpawn(args[0]!, parseFloat(args[1]!), parseFloat(args[2]!), args[3]!);
                    break;
                case 'mcp_domain_heal':
                    this.triggerHeal(parseFloat(args[0]!));
                    break;
                case 'mcp_domain_damage':
                    this.triggerDamage(parseFloat(args[0]!));
                    break;
                case 'mcp_domain_query':
                    this.triggerOracleQuery(args[0]!, payload => {
                        if ((window as any).__TAURI_INTERNALS__) {
                            import('@tauri-apps/api/core').then(({ invoke }) => {
                                invoke('panteao_send', { 
                                    agent: 'broadcast', 
                                    ilf: 'tell', 
                                    content: `oracle_response("${args[0]!}", "${payload}")` 
                                }).catch(console.error);
                            }).catch(console.error);
                        }
                    });
                    break;
                case 'mcp_domain_use_skill':
                    this.triggerSkill(agentName, args[0]!, parseFloat(args[1]!), parseFloat(args[2]!));
                    break;
                case 'mcp_domain_use_skill_on_target':
                    this.triggerSkillOnTarget(agentName, args[0]!);
                    break;
            }
        } catch (e) {
            this.eventManager.dispatch('log', { channel: 'error', message: `Erro no DomainMCPAdapter: ${e}`, params: [] });
        }
    }

    private triggerSkillOnTarget(agentName: string, skillId: string): void {
        const entities = this.objectManager.getEntities();
        const npc = entities.find(e => (e as any).agentName === agentName);
        if (npc && (npc as any).classManager) {
            const classManager = (npc as any).classManager;
            const targetId = (npc as any).currentTargetEnemyId;
            let targetEntity = null;
            if (targetId && targetId !== -1) {
                targetEntity = entities.find(e => e.id === targetId);
            }
            if (targetEntity) {
                classManager.executeActiveSkill(skillId, { x: targetEntity.coordinates.x, y: targetEntity.coordinates.y });
                this.eventManager.dispatch('log', { channel: 'domain', message: `NPC ${agentName} usou a skill ${skillId} no alvo ${targetId}!`, params: [] });
            } else {
      //? Direção frontal padrão caso nenhum alvo seja especificado no comando
                classManager.executeActiveSkill(skillId, { x: npc.coordinates.x, y: npc.coordinates.y });
                this.eventManager.dispatch('log', { channel: 'domain', message: `NPC ${agentName} usou a skill ${skillId} sem alvo válido!`, params: [] });
            }
        }
    }

    private triggerSkill(agentName: string, skillId: string, x: number, y: number): void {
        const entities = this.objectManager.getEntities();
        const npc = entities.find(e => (e as any).agentName === agentName);
        if (npc && (npc as any).classManager) {
            const classManager = (npc as any).classManager;
            classManager.executeActiveSkill(skillId, { x, y });
            this.eventManager.dispatch('log', { channel: 'domain', message: `NPC ${agentName} usou a skill ${skillId}!`, params: [] });
        } else {
            this.eventManager.dispatch('log', { channel: 'error', message: `NPC ${agentName} não encontrado ou sem classe para usar skill ${skillId}`, params: [] });
        }
    }

    private triggerSpawn(type: string, x: number, y: number, behavior: string): void {
        const safeX = isNaN(x) ? this.player.coordinates.x + 50 : x;
        const safeY = isNaN(y) ? this.player.coordinates.y + 50 : y;
        const safeType = type || 'slime';
        
        this.eventManager.dispatch('spawn', {
            type: safeType,
            coordinates: { x: safeX, y: safeY }
        });
        this.eventManager.dispatch('log', { channel: 'domain', message: `MCP Spawna entidade: ${safeType} amigável? ${behavior}`, params: [] });
    }

    private triggerHeal(amount: number): void {
        const safeAmount = isNaN(amount) ? 10 : amount;
        this.player.heal(safeAmount);
        this.eventManager.dispatch('log', { channel: 'domain', message: `MCP curou o player em ${safeAmount}`, params: [] });
    }

    private triggerDamage(amount: number): void {
        const safeAmount = isNaN(amount) ? 10 : amount;
        this.player.attributes.hp -= safeAmount;
        if (this.player.attributes.hp <= 0) {
            this.eventManager.dispatch('playerDied', {});
        }
        this.eventManager.dispatch('log', { channel: 'domain', message: `MCP causou ${safeAmount} de dano ao player`, params: [] });
    }

    private triggerOracleQuery(topic: string, callback: (response: string) => void): void {
        const t = topic.toLowerCase();
        let answer = '';

        if (t === 'player') {
            answer = `O jogador possui ${Math.floor(this.player.attributes.hp)}/${this.player.attributes.maxHp} HP, Nível ${this.player.attributes.level}, Classe Ativa: ${this.player.classManager?.activeClass || 'Nenhuma'}.`;
        } else if (t === 'world') {
            const entities = this.objectManager.getEntities();
            const npcCount = entities.filter(e => (e as any).npcName).length;
            const enemyCount = entities.filter(e => e.objectId === 'enemy' || e.objectId === 'slime').length;
            answer = `O mundo atualmente contém ${entities.length} entidades, das quais ${npcCount} são NPCs cognitivos e ${enemyCount} são inimigos hostis.`;
        } else {
    //? Base de conhecimento sintetizada do Oráculo para consultas cognitivas
            const compendium: Record<string, string> = {
                'slime': 'Slimes são criaturas fracas a fogo que se dividem.',
                'fireball': 'Magia de projétil que queima inimigos. Causa dano em área.',
                'regras_magia': 'Magia custa mana e escala com Inteligência (int). Use com sabedoria.',
                'derocar': 'Derocar é um prodígio arrogante, evite irritá-lo.'
            };
            
            answer = compendium[t] || `O Oráculo não encontrou dados vitais ou de código no sistema sobre [${topic}].`;
        }
        
        callback(answer);
        this.eventManager.dispatch('log', { channel: 'domain', message: `MCP Consulta Oráculo: ${topic} -> ${answer}`, params: [] });
    }
}
