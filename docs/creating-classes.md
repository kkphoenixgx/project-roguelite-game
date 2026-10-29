# Guia de Criação e Extensão de Classes: Arquitetura & Templates

Este documento é o guia canônico definitivo para desenvolvedores e agentes que desejam adicionar ou estender elementos de jogo no ecossistema do **RPG Roguelite Game**.

Ele explica a filosofia por trás dos **Templates Arquetípicos**, como utilizar a pasta [`typescript/domain/templates/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/), os passos para registrar novos componentes e a prevenção de erros comuns de arquitetura e performance.

---

## 1. Por que Templates? A Filosofia do "Copiar e Colar Seguro"

Em codebases grandes e complexas, ninguém constrói um novo Inimigo, Projétil ou Classe partindo de um arquivo em branco. A prática mais comum (e produtiva) de engenharia é **replicar um padrão existente**.

Porém, copiar arquivos de produção antigos traz riscos:
* Copiar código legado que ainda continha alocações no hot path violando o **Zero-GC**.
* Esquecer decorators de registro como `@RegisterSpawner`.
* Esquecer contratos de comunicação desacoplada via `eventManager`.
* Acoplar lógicas de apresentação (DOM, Canvas, WebGPU) dentro do Domínio puro.

Para resolver isso, criamos o diretório [`typescript/domain/templates/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/) (marcado no VS Code com o ícone `folder-template` do Material Icon Theme). Ele funciona como a **fonte da verdade dos padrões de design** do jogo.

---

## 2. Catálogo Geral de Templates de Domínio

Todos os templates canônicos estão centralizados e documentados em [`typescript/domain/templates/index.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/index.ts):

| Template | Arquivo de Origem | Responsabilidade & Padrão Aplicado |
| :--- | :--- | :--- |
| **Enemy** | [`EnemyTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/EnemyTemplate.ts) | Criaturas inimigas com `@RegisterSpawner`, atributos por dados `Dice`, flocking via `requestNeighbors` e atualização de HitBox sem GC. |
| **Projectile** | [`ProjectileTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/ProjectileTemplate.ts) | Balas e magias com velocidade, controle de alcance `maxRange`, `hitTargets` para perfuração e despawn via evento. |
| **PlayerClass** | [`PlayerClassTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/PlayerClassTemplate.ts) | Classes do jogador (`Warrior`, `Gunslinger`, `Mage`, `Pescador`) com árvore de habilidades `skillsByLevel`, cooldowns e disparo de ações. |
| **CognitiveNPC** | [`CognitiveNpcTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/CognitiveNpcTemplate.ts) | NPCs inteligentes integrados ao motor BDI (Panteão/Rust) e LLM local (Ollama) com planos `.asl`. |
| **Weapon** | [`WeaponTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/WeaponTemplate.ts) | Armas corpo-a-corpo e à distância com `iconId`, requisitos de atributos e passivas no impacto. |
| **Armor** | [`ArmorTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/ArmorTemplate.ts) | Peças de armadura e acessórios (Capacete, Peitoral, Calças, Botas, Luvas, Amuletos, Anéis) com redução de dano e Paperdoll. |
| **Consumable** | [`ConsumableTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/ConsumableTemplate.ts) | Itens de uso único e poções com método seguro `use(target)` e validação de consumo. |
| **StatusEffect** | [`StatusEffectTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/StatusEffectTemplate.ts) | Condições e debuffs contínuos (`onApply`, `onTick` in-place, `onRemove`). |
| **Skill** | [`SkillTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/SkillTemplate.ts) | Habilidades ativas, passivas, atributos e essenciais com validação de mana/HP, cooldown e conversão canônica para `Skill`. |
| **EvolvingClass** | [`EvolvingClassTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/EvolvingClassTemplate.ts) | Classes evolutivas de múltiplos estágios (Iniciado $\rightarrow$ Desperto $\rightarrow$ Forma Verdadeira / Transcendência) com metamorfose de skills e marcos de lore. |
| **AttackBuilder** | [`AttackBuilder.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/AttackBuilder.ts) | Construtor fluente e expressivo para orquestrar ataques complexos sem erros de construtor. |
| **AttackTemplates** | [`attacks/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/) | Cinemáticas geométricas de ataque: Orbital (Whirlwind), SweepingArc (Cleave), ChanneledBeam (Laser), NovaBurst (Onda de Choque). |
| **Brooch** | [`BroochTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/BroochTemplate.ts) | Broches ancestrais de meta-progressão (Ativos redondos e Passivos triangulares) com hooks encapsulados e registro no `BroochRegistry`. |
| **Transformation** | [`TransformationTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/TransformationTemplate.ts) | Metamorfoses, avatares e formas alternativas (ex: Urso, Avatar Cósmico) com tint, escala, imunidades e reversão automática. |
| **Summon** | [`SummonTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/SummonTemplate.ts) | Mascotes, totens e lacaios autônomos com IA desacoplada, distância de trela e disparo de `AttackBuilder`. |
| **GroundHazard** | [`GroundHazardTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/GroundHazardTemplate.ts) | Zonas de chão, poças venenosas, campos de fogo e santuários de cura com ticks periódicos Zero-GC. |
| **SynergyReaction** | [`SynergyReactionTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/SynergyReactionTemplate.ts) | Matriz de reações e sinergias elementais entre status (ex: Burn + Wet = Evaporação Explosiva). |
| **MageSpell** | [`mage/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/mage/) | Sistema modular de feitiços do Mago: `MageSpellTemplate` (receitas estáticas fluentes), `RuneGrammarEngine` (gramática e fusão elemental Deep-2) e `MageSpellCraftingRegistry` (orquestrador de solvers de forma e forças físicas). |


---

## 3. Passo a Passo: Criando Novas Entidades

### 3.1. Como Criar um Novo Inimigo (Ex: `Goblin`)
1. **Copie o molde:** Duplique [`EnemyTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/EnemyTemplate.ts) para `typescript/domain/ObjectModule/Entities/Enemies/Goblin.ts`.
2. **Renomeie e Registre:**
   ```typescript
   @RegisterSpawner('goblin')
   export default class Goblin extends Enemy {
     public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Goblin {
       // Configuração de atributos e nível
       return new Goblin(id, payload.level || 1, 30, payload.coordinates, attrs, eventManager);
     }
   }
   ```
3. **Configure o Visual no Adaptador:**
   Em `typescript/adapters/web/shared/VisualConfigMap.ts`, adicione a chave `'goblin'` com o caminho do sprite e a animação.

---

### 3.2. Como Criar uma Nova Classe de Jogador (Ex: `Paladino`)
1. **Copie o molde:** Duplique [`PlayerClassTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/PlayerClassTemplate.ts) para `typescript/domain/ObjectModule/Entities/Player/Classes/Paladin.ts`.
2. **Defina a Árvore de Habilidades (`skillsByLevel`):**
   ```typescript
   export default class Paladin extends Class {
     constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
       super('Paladino', xpTable, player, eventManager);
       this.skillsByLevel.set(1, new Skill('pal_t1_aura', 'Aura Sagrada', 'Regenera vida passivamente.', 'passive', 1));
       this.skillsByLevel.set(4, new Skill('pal_t2_smite', 'Punição Divina', 'Golpe radiante com dano sagrado massivo.', 'active', 2, 'pal_t1_aura'));
     }
   }
   ```
3. **Construa o Ataque usando o `AttackBuilder`:**
   ```typescript
   public executeSkill(skillId: string, mouseCoordinates: { x: number, y: number }): void {
     if (skillId === 'pal_t2_smite') {
       const attack = AttackBuilder.create(this.player)
         .withBaseDamage(50)
         .asLight()
         .withStrengthScaling(0.6)
         .withWisdomScaling(0.4)
         .withUndeadBonus(2.5) // Dano amplificado em mortos-vivos
         .withAreaDamage(this.eventManager, 80, 0.5) // Splash sagrado
         .withParticle(this.eventManager, 'lightFlash', '#FFE57F')
         .build();

       // Dispare projétil ou golpe animado
     }
   }
   ```
4. **Registre no `PlayerClassManager`:**
   Adicione `new Paladin(defaultXpTable, player, eventManager)` dentro da lista `_classes` em [`PlayerClassManager.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Player/components/PlayerClassManager.ts#L25).

---

### 3.3. Como Criar Classes Hiper-Complexas (Multi-Mecânicas, AoE, Blink, Pull, Buffs)
Para classes muito complexas (com 4 ou mais habilidades com custos de mana distintos, cooldowns automáticos, teletransporte, gravidade ou ultimates), estenda [`ComplexClassBase`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/ComplexClassBase.ts) e declare as skills via [`ClassSkillBuilder`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/ComplexClassBase.ts).

Exemplo completo em [`VortexArcanistTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/VortexArcanistTemplate.ts):
```typescript
export default class VortexArcanist extends ComplexClassBase {
  constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
    super('ArcanistaDoVortice', xpTable, player, eventManager);

    // Habilidade 1: Vórtice de Gravidade (Pull em Área)
    this.registerSkill(
      4,
      ClassSkillBuilder.create('va_t2_gravity', 'Poço Gravitacional', 'Puxa todos os inimigos.')
        .asActive(2, 6000) // 6s cooldown automático
        .withManaCost(35)
        .onExecute(({ player, eventManager, mouseCoords }) => {
          // Lógica executada sem if-elses ou boilerplate de cooldown
        })
    );
  }
}
```
* O `ComplexClassBase` lida automaticamente com `isSkillOnCooldown`, consumo de mana do jogador e roteamento do `executeSkill`.

---

### 3.4. Como Criar e Registrar Broches Ancestrais (Ativos e Passivos)
Os broches são a recompensa máxima da meta-progressão (Nível 4 da Árvore Global em `MetaProgressionMap.ts`), divididos em dois tipos de formato geométrico:
* **Broches Ativos (`circle`):** Equipados nos slots 5 a 8 (`player.globalActiveLoadout`), ativados via teclado (teclas `5`, `6`, `7`, `8`), possuem cooldown individual e manipulam o campo de batalha.
* **Broches Passivos (`triangle`):** Equipados nos slots 1 a 4 (`player.passiveLoadout`), concedem imunidades, ressurreição, sinergia elemental de queimadura ou cura no crítico.

#### Criando um Broche Ativo com Cooldown:
```typescript
import BroochTemplate from "./BroochTemplate";
import AttackBuilder from "./AttackBuilder";

export const MeteorBrooch = BroochTemplate.createActive(
  'brooch_active_meteor',
  'Chamado do Meteoro',
  'Ativo: Evoca um meteoro causando dano em área devastador. Recarga: 90s.',
  90000 // 90s cooldown
)
  .withTags('dano', 'fogo')
  .onExecute(({ player, eventManager, mouseCoords }) => {
    // Efeito visual no ponto do cursor
    eventManager.dispatch('spawnVisual', {
      type: 'fireExplosion',
      coordinates: { x: mouseCoords.x - 96, y: mouseCoords.y - 96 },
      duration: 0.8,
      size: { width: 192, height: 192 }
    });

    // Query de vizinhos e ataque em área com AttackBuilder
    eventManager.dispatch('requestNeighbors', {
      coordinates: mouseCoords,
      radius: 180,
      callback: (neighbors: any[]) => {
        const attack = AttackBuilder.create(player)
          .withBaseDamage(120)
          .asFire()
          .withKnockback(30)
          .withBurn(4.0)
          .withStun(1.0)
          .build();

        for (let i = 0; i < neighbors.length; i++) {
          const target = neighbors[i]!;
          if (target && target.id !== player.id && 'takeDamage' in target) {
            attack.execute(target, new Vector2D(0, 1));
          }
        }
      }
    });
  })
  .build();
```

#### Registrando no `BroochRegistry`:
Todos os broches são registrados no [`BroochRegistry.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Player/components/BroochRegistry.ts), permitindo que a execução via `player.executeActiveBrooch(id, mouseCoords)` e a verificação passiva via `player.hasPassiveBrooch(id)` funcionem sem switch-cases gigantescos acoplados.

---

### 3.5. Como Criar um Novo NPC Cognitivo (Ex: `Gideon`)
1. **Copie o molde:** Duplique [`CognitiveNpcTemplate.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/CognitiveNpcTemplate.ts) para `typescript/domain/ObjectModule/Entities/NPCs/Gideon/Gideon.ts`.
2. **Defina a Persona:** Escreva o texto de contextualização da personalidade para o Ollama local.
3. **Crie a Mente em AgentSpeak (`.asl`):**
   Crie `gideon.asl` no mesmo diretório com os planos lógicos BDI.
4. **Registre o Agente no Manifesto:**
   Adicione a linha em `typescript/domain/ObjectModule/Entities/project.jcm`:
   ```
   agent gideon : Gideon/gideon.asl
   ```

---

### 3.6. Como Criar Transformações e Metamorfoses (`TransformationTemplate`)
Permite criar estados alterados de personagem (ex: Forma Cósmica, Forma de Urso, Avatar Celestial):
```typescript
const cosmicForm = TransformationTemplate.create('trans_astral', 'Estase Cósmica')
  .withDuration(4.0)
  .withVisualTint('#00E5FF') // Tingimento ciano/azul sem shaders no domínio
  .withVisualScale(1.4)      // Ampliação de silhueta
  .withImmunities('stun', 'slow', 'freeze')
  .withDamageReduction(100)  // 100% invulnerabilidade
  .onEnter((player, ctx) => {
    // Reseta cooldowns do player
    player.classManager.resetAllCooldowns();
    ctx.eventManager.dispatch('particle', { effect: 'magicPulse', x: player.coordinates.x, y: player.coordinates.y, color: '#00E5FF' });
  })
  .onExit((player, ctx) => {
    ctx.eventManager.dispatch('log', { channel: 'domain', message: 'Forma Cósmica dissipada.', params: [] });
  });

// Para ativar:
const activeInstance = cosmicForm.applyTo(player, eventManager);
```

---

### 3.7. Como Criar Invocadores e Companheiros (`SummonTemplate`)
Permite criar lacaios, totens, lobos e espíritos com IA autônoma e leashing ao mestre:
```typescript
const wolfCompanion = SummonTemplate.create('wolf_companion', 'Lobo Espiritual')
  .withMaxHealth(120)
  .withSpeed(110)
  .withDuration(30) // 30s de duração
  .withBehavior('aggressive') // 'follow' | 'aggressive' | 'defensive' | 'stationary'
  .withLeashDistance(200)
  .withAttackBehavior((summon) => {
    return AttackBuilder.create(summon)
      .withBaseDamage(30)
      .asPhysical()
      .withStrengthScaling(0.5)
      .withBleed(3, 50)
      .build();
  }, 1200, 140)
  .withVisualTint('#78909C')
  .onSummon((summon, master, em) => {
    em.dispatch('particle', { effect: 'magicPulse', x: summon.coordinates.x, y: summon.coordinates.y, color: '#00E5FF' });
  });

// Para invocar:
const wolf = wolfCompanion.spawn(player, { x: player.coordinates.x + 30, y: player.coordinates.y }, eventManager);
```

---

### 3.8. Como Criar Zonas e Poças no Solo (`GroundHazardTemplate`)
Permite criar áreas de dano contínuo, poças venenosas, armadilhas ou santuários de cura:
```typescript
const toxicSwamp = GroundHazardTemplate.create('hazard_poison_pool', 'Pântano Tóxico')
  .withRadius(96)
  .withDuration(6.0)
  .withTickInterval(0.5) // Aplica a cada meio segundo
  .withTargetFilter('enemies') // 'enemies' | 'allies' | 'all'
  .withDamage(20, 'magical')
  .withStatus((target) => new PoisonStatus(3.0))
  .withParticle('magicPulse', '#76FF03')
  .withVisual('poisonCloud');

// Para instanciar no solo (ex: no cursor ou debaixo de uma magia):
const hazard = toxicSwamp.spawnAt(mouseCoords, player, eventManager);
```

---

### 3.9. Como Criar Sinergias e Reações Elementais (`SynergyReactionTemplate`)
Permite orquestrar reações em cadeia quando dois status colidem numa mesma entidade:
```typescript
SynergyReactionTemplate.create('reaction_vaporize', 'Evaporação Explosiva')
  .between('burn', 'wet')
  .withExtraDamage(75, 'magical')
  .withAreaExplosion(140, 'fireExplosion', '#FF9100')
  .withConsumesStatus(true, true) // Consome ambos os status
  .onTrigger((ctx) => {
    ctx.eventManager.dispatch('log', { channel: 'domain', message: 'Vapor superaquecido detonado!', params: [] });
  })
  .register();
```

---

### 3.10. Como Criar Habilidades de Classe (`SkillTemplate`)

O [`SkillTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/SkillTemplate.ts) padroniza a criação de habilidades (ativas, passivas, essenciais e atributos), com validação de recursos (Mana, HP), verificação de recarga (`cooldownMs`), conversão para a entidade canônica [`Skill`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/Skills/Skill.ts) e integração com os templates de ataque:

```typescript
import SkillTemplate from 'domain/templates/SkillTemplate';
import { OrbitalAttackTemplate } from 'domain/templates/attacks';
import AttackBuilder from 'domain/templates/AttackBuilder';

// 1. Definição Fluente da Habilidade
export const WhirlwindSkill = SkillTemplate.create(
  'warrior_cyclone',
  'Ciclone de Aço',
  'Gira uma lâmina devastadora em volta do guerreiro, acertando todos ao redor.'
)
  .asActive(2, 4000) // Tier 2, 4s de recarga
  .withManaCost(20)
  .withRequiredLevel(4)
  .withPrerequisite('warrior_strike')
  .withKeybind('spell_1')
  .withIcon('icon_whirlwind')
  .onExecute((ctx) => {
    // 2. Dispara ataque cinemático orbital desacoplado
    const spin = OrbitalAttackTemplate.create('cyclone_blade', 'Lâmina do Ciclone', (owner) => {
      return AttackBuilder.create(owner)
        .withBaseDamage(45)
        .asPhysical()
        .withKnockback(12)
        .build();
    })
      .withBaseRadius(65)
      .withStrengthRadiusScaling(1.5)
      .withAngularSpeed(Math.PI * 2.5)
      .withRotations(3)
      .withHitboxRadius(28)
      .withTargetHitCooldown(350)
      .withKnockbackMode('tangential');

    spin.applyTo(ctx.player as any, ctx.eventManager, 0);
  });

// 3. Registro na Classe do Jogador
// skillsByLevel.set(4, WhirlwindSkill.toSkill());

// 4. Execução a partir de comando de input do jogador:
// WhirlwindSkill.execute(player, eventManager, mouseCoordinates);
```

---

### 3.11. Como Criar Classes Evolutivas & Narrativas (`EvolvingClassTemplate`)

Para classes que não são estáticas e que **evoluem em estágios narrativos** (do Early Game até a Transcendência no Late Game) mediante a descoberta de segredos através de múltiplas runs:

```typescript
import EvolvingClassTemplate from 'domain/templates/EvolvingClassTemplate';
import SkillTemplate from 'domain/templates/SkillTemplate';

// 1. Criação declarativa da classe com múltiplos estágios
export const VoidHarbinger = EvolvingClassTemplate.create('Arauto do Vazio')
  .withInitialStage(1)

  // ESTÁGIO 1: O Receptáculo (Early Game)
  .withStage(1, (stage) => stage
    .setTitle('O Receptáculo')
    .setDescription('Um guerreiro tocado pelo abismo primordial.')
    .withVisualTint('#2A1635')
    .addSkill(1, SkillTemplate.create('void_bolt', 'Dardo Sombrio', 'Disparo de éter').asActive(1).toSkill())
    .addSkill(4, SkillTemplate.create('void_shield', 'Barreira de Sombra', 'Absorve dano').asActive(2).toSkill())
  )

  // ESTÁGIO 2: O Despertar (Mid Game - Requer marco de história)
  .withStage(2, (stage) => stage
    .setTitle('O Despertar do Vazio')
    .setDescription('A mente se expande e canaliza a distorção.')
    .withVisualTint('#4A148C') // Aura roxa profunda
    .requireMilestone('story_ancient_tomb_opened') // Desbloqueado via lore entre runs
    .requirePlayerLevel(5)
    .withAttributeBonuses({ intelligence: 5, dexterity: 3 })
    .addSkill(1, SkillTemplate.create('void_bolt_v2', 'Dardo Enegrecido', 'Projétil perfurante').asActive(1).toSkill())
    .addSkill(4, SkillTemplate.create('void_rift', 'Fenda Dimensional', 'Cria vórtice de vácuo').asActive(2).toSkill())
    .addSkill(8, SkillTemplate.create('astral_slip', 'Passo do Vazio', 'Teleporte curto com invulnerabilidade').asActive(3).toSkill())
  )

  // ESTÁGIO 3: A Transcendência (Late Game - A Forma Verdadeira)
  .withStage(3, (stage) => stage
    .setTitle('A Forma Verdadeira: Devorador de Éter')
    .setDescription('Transcendeu a casca mortal. O espaço se curva à sua vontade.')
    .withVisualTint('#00E5FF') // Cyan etéreo cósmico
    .withVisualScale(1.2) // Silhueta ampliada
    .requireMilestone('story_defeat_ancient_boss')
    .withAttributeBonuses({ intelligence: 15, wisdom: 10, strength: 5 })
    .addSkill(1, SkillTemplate.create('singularity', 'Supernova Dimensional', 'Colapso gravitacional total').asActive(4).toSkill())
  );

// 2. Registro Global para novos jogadores
VoidHarbinger.registerGlobally();

// 3. Em tempo de jogo: ascensão disparada ao cumprir os requisitos
// if (voidHarbingerInstance.canAscend(metaProgressionManager)) {
//   voidHarbingerInstance.ascend(metaProgressionManager);
// }
```

---

## 4. O Construtor Fluente: `AttackBuilder`

O [`AttackBuilder`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/AttackBuilder.ts) encapsula a complexidade matemática e comportamental do combate em uma API limpa:

```typescript
const lethalVenomStrike = AttackBuilder.create(player)
  .withBaseDamage(35)
  .asPhysical()
  .withDexterityScaling(0.8)
  .withExtraCritChance(15) // +15% de crítico
  .withExecute(0.30, 1.5) // +50% de dano se o alvo estiver com < 30% HP
  .withPoison(5, 100) // 100% de chance de aplicar veneno por 5s
  .withLifesteal(10) // 10% de vampirismo
  .withKnockback(8)
  .withParticle(eventManager, 'slashSparks')
  .build();
```

### 4.1. Templates Cinemáticos de Ataque (`typescript/domain/templates/attacks/`)

Para ataques com geometrias e cinemáticas espaciais avançadas (redemoinhos, cortes em leque, lasers canalizados e ondas de choque), utilize os templates dedicados em [`typescript/domain/templates/attacks/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/):

#### A. Ataque Orbital / Redemoinho (`OrbitalAttackTemplate`)
Ideal para habilidades do Warrior como Whirlwind, Dança das Lâminas ou orbes giratórias. A velocidade angular e o raio escalonam diretamente com Destreza e Força do mestre, com proteção de cooldown por alvo para evitar derretimento em 60 FPS:
```typescript
import { OrbitalAttackTemplate } from 'domain/templates/attacks';

const whirlwind = OrbitalAttackTemplate.create('warrior_whirlwind', 'Ciclone de Aço', (owner) => {
  return AttackBuilder.create(owner)
    .withBaseDamage(45)
    .asPhysical()
    .withKnockback(12)
    .build();
})
  .withBaseRadius(65)
  .withStrengthRadiusScaling(1.5) // +1.5px de alcance por ponto de Força
  .withAngularSpeed(Math.PI * 2.5) // ~1.25 voltas/s base
  .withDexterityScaling(0.12) // acelera o giro por Destreza
  .withRotations(3) // 3 rotações completas (ou -1 para contínuo)
  .withHitboxRadius(28)
  .withTargetHitCooldown(350) // Intervalo mínimo de 350ms para rebater o mesmo inimigo
  .withKnockbackMode('tangential') // 'tangential' (arremessa pela tangente) | 'radial' | 'pull'
  .withParticle('slashSparks', '#FFD700');

// Disparo no jogador:
const activeSpin = whirlwind.applyTo(player, eventManager, 0);
```

#### B. Corte em Arco / Cleave (`SweepingArcAttackTemplate`)
Varre um setor circular dinâmico a partir do ângulo mirado, acelerando o tempo de execução com a Destreza:
```typescript
import { SweepingArcAttackTemplate } from 'domain/templates/attacks';

const cleave = SweepingArcAttackTemplate.create('warrior_cleave', 'Corte Transversal', (owner) => {
  return AttackBuilder.create(owner).withBaseDamage(60).asPhysical().build();
})
  .withArcAngleDegrees(135) // Leque de 135 graus
  .withRadius(80)
  .withDuration(0.25)
  .withDexterityScaling(0.01) // +1% velocidade por Destreza
  .withParticle('slashSparks');

const activeCleave = cleave.sweep(player, aimAngle, eventManager);
```

#### C. Raio Canalizado Contínuo (`ChanneledBeamAttackTemplate`)
Feixe linear de energia ou fogo com rotação angular suave em direção ao cursor do mouse e ticks periódicos:
```typescript
import { ChanneledBeamAttackTemplate } from 'domain/templates/attacks';

const deathBeam = ChanneledBeamAttackTemplate.create('mage_disintegration', 'Raio Desintegrador', (owner) => {
  return AttackBuilder.create(owner).withBaseDamage(20).asMagical().build();
})
  .withLength(250)
  .withWidth(24)
  .withTickInterval(0.12)
  .withMaxChannelDuration(4.0)
  .withTurnRateDegreesPerSec(120) // Velocidade que o raio acompanha o mouse
  .withParticle('magicPulse', '#9C27B0');

const activeBeam = deathBeam.channel(player, initialAngle, eventManager);
activeBeam.setAimCoordinates(mouseCoords);
```

#### D. Onda Expansiva / Nova (`NovaBurstAttackTemplate`)
Frente de onda circular expansiva que viaja do centro para fora, atingindo cada alvo uma única vez:
```typescript
import { NovaBurstAttackTemplate } from 'domain/templates/attacks';

const seismicNova = NovaBurstAttackTemplate.create('earth_nova', 'Impacto Sísmico', (owner) => {
  return AttackBuilder.create(owner).withBaseDamage(70).asPhysical().withKnockback(16).build();
})
  .withStartRadius(15)
  .withMaxRadius(180)
  .withExpansionSpeed(350)
  .withRingThickness(30)
  .withParticle('stoneShard', '#8D6E63');

const activeNova = seismicNova.triggerAt(player.coordinates, player, eventManager);
```

---

### 4.3. Template de Magias do Mago e Gramática Rúnica (`domain/templates/mage/`)

O sistema de magias do Mago (Axiomante) utiliza digitação em tempo real (runas `spell_0` até `spell_9`). Em vez de acumular switches quilométricos ou verificações manuais de `if/else`, o sistema é desacoplado em 3 componentes canônicos:

```
[Input do Jogador (spellBuffer)]
          │
          ▼
[MageSpellCraftingRegistry]
   ├── 1. Procura Receita Estática (StaticSpellRecipe) via O(1)
   │        └── Encontrou? -> Dispara MageSpellTemplate.executeRecipe()
   │
   └── 2. Não encontrou? -> Delega para RuneGrammarEngine
            ├── Extrai Formas ('projectile', 'self', etc.)
            ├── Extrai Forças ('knockback', 'pull')
            ├── Funde Elementos Adjacentes (Deep-2 Fusion Matrix)
            └── Executa o FormSolver registrado (Zero-GC)
```

#### A. Criando uma Nova Receita Estática (Ex: Orbe de Relâmpago)
```typescript
import { MageSpellTemplate } from 'domain/templates/mage';

const lightningOrb = MageSpellTemplate.createStatic('lightning_orb', 'Orbe de Relâmpago')
  .matchingSequence(['spell_0', 'spell_4', 'spell_8']) // Projétil + Fogo + Luz
  .withBaseDamage(45)
  .withIntelligenceScaling(2.0)
  .asProjectile('lightning_orb')
  .withCastParticle('slashSparks')
  .withOnHitParticle('slashSparks')
  .withLogMessage('Disparou Orbe de Relâmpago!')
  .build();

// Registre no registry da classe sem tocar no código interno do Mago:
mage.spellRegistry.registerRecipe(lightningOrb);
```

#### B. Registrando um Novo Solucionador de Forma Dinâmica (Ex: 'beam')
```typescript
// 1. Registra a runa no motor gramatical
mage.spellRegistry.grammarEngine.registerRune('spell_f', 'form', 'beam');

// 2. Registra o comportamento geométrico da nova forma
mage.spellRegistry.registerFormSolver('beam', (ctx) => {
  const { player, eventManager, spawnCoordinates, elements } = ctx;
  eventManager.dispatch('spawnVisual', {
    type: 'channeled-beam' as any,
    coordinates: spawnCoordinates,
    duration: 1.5
  });
  return true;
});
```

#### C. Axiomas de Infusão de Lâmina (Battlemage / Spellblade)
O Axiomante pode canalizar a gramática da realidade em suas armas com janelas táticas de **5 segundos**:
* **Axioma Base:** `Self` (`spell_1`) + `Potência` (`magic,fire` = `spell_9,spell_4`).
* **Infusão de Ar (`Self + Potência + Air`):** Transforma o golpe físico em dano de vento cortante com velocidade ampliada.
* **Infusão de Luz (`Self + Potência + Light`):** A **Luz** irradia e expande o corte físico, concedendo bônus direto em `areaMultiplier` e `splashDamage` no [`Attributes.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Attributes.ts).
* **Infusão de Ordem (`Self + Potência + Order`):** Canaliza a radiação sacra da Ordem (`magic,light`), reproduzindo o dano sagrado de um Paladino com base puramente axiomática.
* **Buff Stacking por Mérito:** Não há travas artificiais limitando o número de infusões; o jogador que tiver agilidade manual para digitar múltiplos buffs em 5 segundos é recompensado com a soma das propriedades elementais!

> [!NOTE]
> Para a matriz ontológica completa dos elementos, consulte [`docs/axiomas_magicos.md`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/docs/axiomas_magicos.md).

---

### 4.2. Exemplo Canônico: O Guerreiro (`Warrior.ts`) e o Catálogo de Ataques

A classe [`Warrior.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Player/Classes/Warrior.ts) exemplifica o uso completo do catálogo de templates geométricos em tempo de execução com uma árvore rica de **12 habilidades canônicas**:

| Nível / Tier | ID da Habilidade | Nome | Tipo | Mecânica / Template | Efeito no Combate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lvl 1 (T1)** | `w_t1_strike` | **Força Bruta** | Atributo | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +5 permanente de Constituição. |
| **Lvl 2 (T1)** | `w_t1_heavy_blow` | **Pancada Pesada** | Ativa | [`SweepingArcAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/SweepingArcAttackTemplate.ts) | Golpe frontal direto em arco rápido (90°) com alto escalonamento de Força e knockback. |
| **Lvl 3 (T1)** | `w_t1_iron_skin` | **Pele de Aço** | Passiva | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +4 permanente de Constituição. |
| **Lvl 4 (T2)** | `w_t2_cleave` | **Turbilhão de Aço** | Ativa | [`OrbitalAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/OrbitalAttackTemplate.ts) | **O ataque giratório:** a lâmina realiza 2.5 voltas orbitais contínuas em torno do jogador. Escala rotação com Destreza e raio com Força/Área. Knockback tangencial. |
| **Lvl 5 (T2)** | `w_t2_shield_bash` | **Investida com Escudo** | Ativa | Dash Físico In-Place | Impulsiona o guerreiro à frente atingindo inimigos e atordoando-os ([`StunStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/StunStatus.ts)) por 1.2s. |
| **Lvl 6 (T2)** | `w_t3_berserk` | **Fúria de Batalha** | Passiva | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +6 permanente de Força bruta. |
| **Lvl 7 (T3)** | `w_t3_war_cry` | **Grito de Guerra** | Ativa | [`NovaBurstAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/NovaBurstAttackTemplate.ts) | Pulso sonoro expansivo de 420px/s que causa dano e inflige [`SlowStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/SlowStatus.ts) e [`VulnerableStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/VulnerableStatus.ts). |
| **Lvl 8 (T3)** | `w_t4_ground_slam` | **Impacto Sísmico** | Ativa | [`NovaBurstAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/NovaBurstAttackTemplate.ts) | Onda sísmica de terra de 380px/s que esmaga o solo e atordoa ([`StunStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/StunStatus.ts)) por 1.5s. |
| **Lvl 9 (T3)** | `w_t3_colossus_vigor` | **Vigor do Colosso** | Atributo | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +10 permanente de Constituição. |
| **Lvl 10 (T4)** | `w_t5_blade_dance` | **Dança das Lâminas** | Ativa | [`SweepingArcAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/SweepingArcAttackTemplate.ts) | Corte devastador de 160 graus na direção mirada pelo mouse, varrendo hordas à frente. |
| **Lvl 11 (T4)** | `w_t4_armor_breaker` | **Quebrador de Armaduras** | Passiva | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +8 permanente de Força bruta. |
| **Lvl 12 (T4)** | `w_t5_avatar_of_war` | **Avatar da Guerra** | Ativa | Cura & Buff | Cura instantânea de 25% do HP máximo, acompanhada de explosão de sangue e partículas críticas. |

---

### 4.3. Exemplo Canônico: O Necromante (`Necromancer.ts`) e o Controle do Abismo

A classe [`Necromancer.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Player/Classes/Necromancer.ts) orquestra a foice, magias do abismo e controle necromântico de multidões com uma árvore completa de **12 habilidades canônicas**:

| Nível / Tier | ID da Habilidade | Nome | Tipo | Mecânica / Template | Efeito no Combate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lvl 1 (T1)** | `n_t1_reap` | **Colheita Sombria** | Ativa | [`SweepingArcAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/SweepingArcAttackTemplate.ts) | Corte rápido de foice em 110° que causa dano mágico e cura o jogador no impacto. |
| **Lvl 2 (T1)** | `n_t1_death_aura` | **Presença Fúnebre** | Atributo | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +5 permanente de Inteligência. |
| **Lvl 3 (T1)** | `n_t1_soul_leech` | **Dreno Vital** | Passiva | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +5 permanente de Sabedoria. |
| **Lvl 4 (T2)** | `n_t2_lifesteal` | **Sede de Sangue** | Passiva | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +6 permanente de Inteligência arcana. |
| **Lvl 5 (T2)** | `n_t2_bone_spear` | **Lança de Ossos** | Ativa | [`ChanneledBeamAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/ChanneledBeamAttackTemplate.ts) | Feixe linear perfurante canalizado de 220px que rasga fileiras de inimigos e inflige [`VulnerableStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/VulnerableStatus.ts). |
| **Lvl 6 (T2)** | `n_t3_soul` | **Ascensão do Lich** | Rara | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +6 permanente de Sabedoria sobrenatural. |
| **Lvl 7 (T3)** | `n_t3_grasp_of_dead` | **Garras do Além** | Ativa | [`SweepingArcAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/SweepingArcAttackTemplate.ts) | Corte espectral amplo de 140° que inflige [`DecayStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/DecayStatus.ts) (dano contínuo que ignora defesas). |
| **Lvl 8 (T3)** | `n_t4_corpse_explosion` | **Explosão Sombria** | Ativa | [`NovaBurstAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/NovaBurstAttackTemplate.ts) | Detonação mágica expansiva na posição do mouse que inflige envenenamento ([`PoisonStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/PoisonStatus.ts)). |
| **Lvl 9 (T3)** | `n_t3_spectral_veil` | **Manto Espectral** | Passiva | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +8 permanente de Sabedoria. |
| **Lvl 10 (T4)** | `n_t5_wail_of_banshee` | **Clamor da Banshee** | Ativa | [`NovaBurstAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/NovaBurstAttackTemplate.ts) | Pulso aterrorizante de 400px/s que espalha pavor ([`FearStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/FearStatus.ts)) e lentidão ([`SlowStatus`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/Status/SlowStatus.ts)). |
| **Lvl 11 (T4)** | `n_t4_death_warden` | **Mestre da Morte** | Atributo | [`AttributeBoostEffect`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Items/Effects/AttributeBoostEffect.ts) | +10 permanente de Inteligência. |
| **Lvl 12 (T4)** | `n_t5_dance_of_dead` | **Dança das Almas Penadas** | Ativa | [`OrbitalAttackTemplate`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/templates/attacks/OrbitalAttackTemplate.ts) | Vórtice orbital de almas em torno do mestre com rotação veloz de 4π rad/s e modo de empurrão `pull` (atrai inimigos para o centro das trevas). |

---

## 5. Diretrizes Inegociáveis de Performance (Zero-GC)



Ao criar qualquer nova classe no Domínio:
1. **Sem Alocações no Loop:** Jamais use `new Vector2D()` dentro de `update()` ou callbacks repetidos. Use operações mutáveis (`addMut`, `multiplyMut`, `normalizeMut`, `resetMut`).
2. **Sem Funções Funcionais Alocativas no Frame:** Proibido o uso de `.map()`, `.filter()`, `.reduce()` e `.slice()` durante os frames de 60 FPS. Use loops indexados (`for (let i = 0; i < len; i++)`).
3. **Reutilização de Coleções:** Use `.length = 0` para arrays e `.clear()` para Sets e Maps em vez de recriar coleções.
4. **Isolamento Hexagonal:** Nunca importe nada de apresentação, DOM, Canvas ou WebGL no Domínio. A saída de dados do domínio é sempre via DTOs (`domain-contracts.ts`) ou eventos desacoplados (`IGameEvents.ts`).
