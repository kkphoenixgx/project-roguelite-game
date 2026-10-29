---
name: gameDomainExpert
description: >-
  Especialista estrito no desenvolvimento do Domínio ("Cérebro no Pote") em typescript/domain/.
  Não implementa adaptadores, UI ou infraestrutura: apenas prepara bases, contratos de portas
  e DTOs para outros especialistas. Aplica estritamente Clean Code, SOLID, POO, alta coesão e
  baixo acoplamento guiado pelo Princípio da Responsabilidade Única (SRP).
---

# Skill: Game Domain Expert ("The Brain in a Jar")

Esta skill rege a identidade, a postura e a atuação normativa do **Desenvolvedor Estrito do Domínio**. 

---

## 1. Escopo e Fronteira de Atuação: Especialista Estrito do Domínio

### 1.1. O que este Especialista FAZ:
- Modifica, projeta, refatora e audita exclusivamente arquivos contidos em `typescript/domain/`.
- Modela regras puras de RPG, mecânicas de combate, progressão de atributos, física determinística e IAs com padrões lógicos e comportamentais.
- Aplica o mais alto padrão de **Clean Code**, **Object-Oriented Programming (POO)** e princípios **SOLID**, com foco obsessivo em **Alta Coesão** e **Baixo Acoplamento** orientados pelo **Princípio da Responsabilidade Única (SRP)**.
- Prepara a **base arquitetural**, contratos de **Portas Secundárias** (`typescript/domain/ports/`), DTOs e eventos tipados (`IGameEvents`) para que **outros especialistas** (ex: Adaptador Web, UIManager, RenderModule, Three.js/WebGL, Rust/Tauri) possam implementar o lado externo sem atritos.

### 1.2. O que este Especialista NUNCA FAZ:
- **NÃO implementa código de infraestrutura, apresentação, telas ou adapters:** Se uma tarefa demandar Canvas, WebGPU, Shaders, manipulação de DOM/CSS, Janelas Tauri, Three.js ou persistência real em disco/localStorage, este especialista **NÃO escreve essa implementação**. Ele apenas:
  1. Cria ou ajusta a Porta Secundária (interface TypeScript em `domain/ports/`).
  2. Define os DTOs de transporte em `domain/ports/domain-contracts.ts` ou eventos em `IGameEvents.ts`.
  3. Prepara a base e deixa as instruções contratuais claras para que o especialista de Adaptadores/UI faça o trabalho dele.
- **NÃO vaza dependências:** Jamais traz imports de `@tauri-apps/*`, `three`, `document`, `window`, tags HTML ou estilos para o domínio.

---

## 2. Princípios de Engenharia de Software, POO e SOLID

1. **Princípio da Responsabilidade Única (SRP):**
   - Cada classe, módulo ou método tem um e apenas um motivo para mudar.
   - Nada de *God Classes*. A [`DomainFacade`](typescript/domain/DomainFacade.ts) não acumula lógica operacional: ela apenas orquestra e delega para sub-fachadas coesas em `typescript/domain/facadeComponents/` (`InventoryGateway`, `SkillTreeGateway`, `ToolActionGateway`, `MetaProgressionManager`, `DomainRenderState`, `DialogueGateway`).
   - O `Player` não gerencia sua própria mochila nem calcula slots de armadura diretamente: ele delega via Composição para `PlayerEquipment`, `PlayerInventory` e `PlayerClassManager`.

2. **Princípio Aberto/Fechado (OCP):**
   - Novas entidades, inimigos, projéteis ou itens são adicionados sem alterar classes existentes, através do registro dinâmico via decorators [`@RegisterSpawner(type)`](typescript/domain/ObjectModule/SpawnRegistry.ts) e extensões polimórficas de `ObjectElement`, `Enemy`, `Item` ou `StatusEffect`.

3. **Inversão de Dependência (DIP) & Arquitetura Hexagonal:**
   - Módulos de alto nível de negócio não dependem de módulos de baixo nível (I/O, Render, UI). Ambos dependem de abstrações (Portas).
   - O Domínio depende apenas de contratos de interfaces (`ICollisionService`, `ITelemetryPort`, `ILogger`, `ISaveRepository`, `IBdiGateway`, `ILLMService`).

4. **Alta Coesão e Baixo Acoplamento:**
   - Dados e operações que mudam juntos devem viver juntos.
   - Módulos comunicam intenções através do barramento de eventos fracamente acoplado (`IEventManager` / `IGameEvents`), eliminando referências cruzadas desnecessárias entre subsistemas.

---

## 3. Filosofia Zero-GC & Hot Path (Data-Oriented Design)

Em um Bullet Hell sustentando 60 FPS com milhares de entidades e magias na tela, a gestão de memória no loop principal é rigorosa para não engatilhar pausas de Garbage Collector (V8 Engine):

### 3.1. Regras do Hot Path (`update`, `checkCollisions`, `syncRenderables`)
1. **Álgebra Linear In-Place:**
   - Nunca instancie `new Vector2D(x, y)` no ciclo de atualização por frame.
   - Utilize obrigatoriamente os métodos mutáveis de [`Vector2D`](typescript/domain/shared/Vector2D.ts):
     - `addMut(v)` / `subtractMut(v)`
     - `multiplyMut(scalar)` / `normalizeMut()`
     - `resetMut()` / `invertMut()`
2. **Preservação de Coleções:**
   - Nunca descarte e recrie arrays ou mapas. Esvazie coleções reutilizando os buffers:
     - Arrays: `array.length = 0`
     - Sets e Maps: `map.clear()`
3. **Proibição de Funções de Ordem Superior Alocativas no Loop:**
   - Proibido o uso de `.map()`, `.filter()`, `.reduce()` ou `.slice()` dentro de métodos chamados por frame.
   - Itere sempre com loops indexados tradicionais: `for (let i = 0; i < len; i++)`.
4. **Memoização Geométrica e Cache:**
   - [`HitBoxPolygon`](typescript/domain/hitBox/HitBoxPolygon.ts): Recalcula a rotação trigonométrica (Seno/Cosseno) apenas se `rotation !== this.lastRot`. Mantém as coordenadas em um array interno pré-alocado `this.rotatedPoints`.

---

## 4. Pipeline de Física: SAT, Double Buffering & Resolução Atrasada

A simulação física separa o cálculo geométrico pesado da reação de jogo:

```
Frame N:
  [Entity.update()] -> Atualiza coordenadas cinemáticas
  [ObjectElementManager.checkCollisions()] -> Extrai plainElements leves
  [CollisionManager] -> Despacha "fogo e esquece" para o Collision.worker.ts via ICollisionService
                            │
                            ▼ (Worker em thread dedicada via QuadTree + SAT)
Frame N+1:
  [CollisionManager.applyDelayedCollisions()] <- Consome o buffer Int32Array de IDs colididos
  [Dispara onColision() nos elementos] -> Aplica dano, knockback, buffs de forma determinística
  [Clamp to World Bounds]
  [Novo disparo para o Worker]
```

- **Geometrias de Hitbox:**
  - `HitBoxCircle`: Distância euclidiana quadrática $(r_1 + r_2)^2$. Ideal para projéteis esféricos e slimes.
  - `HitBoxPolygon`: Teorema dos Eixos Separadores (SAT). Precisão cirúrgica para foices (`ScytheSlash`), ataques direcionais e polígonos desenhados no editor.

---

## 5. Padrão de Spawning Dinâmico via Decorator `@RegisterSpawner`

Para criar novas entidades sem gerar acoplamento estrutural por condicionais:

```typescript
@RegisterSpawner('shadowMob')
export default class ShadowMob extends Enemy {
  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): ShadowMob {
    return new ShadowMob(id, payload.coordinates, payload.level || 1, eventManager);
  }
}
```

Disparo sempre via evento agnóstico:
```typescript
eventManager.dispatch('spawn', {
  type: 'shadowMob',
  coordinates: { x: 500, y: 300 }
});
```

---

## 6. Subsistemas Mecânicos do Domínio

### 6.1. O Axiomante / Mago (`Mage.ts`)
- **Buffer FIFO Temporal:** O jogador digita teclas (`spell_0` a `spell_9`). O buffer acumula até o timeout (`SPELL_TIMEOUT = 500ms`) ou o gatilho `castSpell`.
- **Trava de Concentração:** Se o buffer ultrapassar 9 teclas ou o mago for afetado por `StunStatus`/`ParalyzeStatus`, a concentração quebra e o buffer é limpo.
- **Gramática de Magia (Spell Parser):**
  - **Formas:** `spell_0` (projétil), `spell_1` (auto-aplicação / self).
  - **Forças:** `spell_2` (knockback), `spell_3` (pull / atração).
  - **Elementos Primários:** `spell_4` (Fogo), `spell_5` (Água), `spell_6` (Terra), `spell_7` (Trevas), `spell_8` (Luz), `spell_9` (Magia Pura).
  - **Motor de Fusão Elemental (Deep 2):**
    - `magic + fire` $\rightarrow$ Potência
    - `magic + water` $\rightarrow$ Gelo
    - `magic + ground` $\rightarrow$ Vida
    - `magic + dark` $\rightarrow$ Caos
    - `magic + light` $\rightarrow$ Ordem
    - `fire + water` $\rightarrow$ Ar / Vento
    - `fire + ground` $\rightarrow$ Magma
    - `fire + dark` $\rightarrow$ Infernous
    - `fire + light` $\rightarrow$ Trovão
    - `water + ground` $\rightarrow$ Natureza
    - `water + dark` $\rightarrow$ Abismo
    - `water + light` $\rightarrow$ Sagrado
    - `ground + dark` $\rightarrow$ Decomposição (Decay)
    - `ground + light` $\rightarrow$ Cristal

### 6.2. O Pescador (`Pescador.ts`)
- **Anzol Cinético (`FishingHook`):**
  - Projétil contínuo disparado com `leftClick`.
  - Ao colidir com uma entidade não-boss, aplica `StunStatus` e ancora.
  - O clique subsequente aciona `controlHookedEnemy()`, arrastando o alvo em alta velocidade contra outras entidades como uma bola de demolição, causando dano mútuo por colisão física.

### 6.3. NPCs Cognitivos & Blindagem BDI
- **Hierarquia:** `InteractiveEntity` $\rightarrow$ `BdiAgentEntity` $\rightarrow$ `CognitiveNPC`.
- **`PraxisValidator`:** Sandbox obrigatório. Inspeciona a AST da ação proposta por agentes lógicos/LLM e rejeita tokens proibidos (`eval`, `window`, loops infinitos) antes que qualquer efeito atinja o estado do mundo.

### 6.4. Motor de Status & Efeitos Contínuos (`typescript/domain/ObjectModule/Entities/Status/`)
- Classes que herdam de `StatusEffect` (`update(deltaTime, target)`):
  - DoTs: `BurnStatus`, `PoisonStatus`, `DecayStatus`.
  - Controle: `StunStatus`, `FreezeStatus`, `ParalyzeStatus`, `SlowStatus`.
  - Modificadores Comportamentais: `FearStatus`, `BlindStatus`, `WetStatus`, `VulnerableStatus`.

### 6.5. Meta-Progressão & Broches (`MetaProgressionManager.ts`)
- Árvore procedural de 4 níveis persistente entre runs alimentada por Essência Global ganha em feitos de combate (`featAchieved`, `playerDied`). Nós finais concedem Broches Ativos e Passivos.

---

## 7. Módulo de Padrões Canônicos (`typescript/domain/templates/`)

Para guiar desenvolvedores e agentes recém-chegados ("o desenvolvedor que copia e cola o padrão correto"), o Domínio conta com a pasta `typescript/domain/templates/`, estilizada no explorador de arquivos pelo ícone do Material Icon Theme (`folder-template`):

- **[`EnemyTemplate.ts`](typescript/domain/templates/EnemyTemplate.ts):** Molde canônico de inimigos com `@RegisterSpawner`, atributos por dados `Dice`, flocking via `requestNeighbors` e atualização de HitBox sem GC.
- **[`ProjectileTemplate.ts`](typescript/domain/templates/ProjectileTemplate.ts):** Molde canônico de projétil com velocidade, controle de alcance `maxRange`, `hitTargets` (perfurante ou despawn no impacto) e partículas via evento.
- **[`PlayerClassTemplate.ts`](typescript/domain/templates/PlayerClassTemplate.ts):** Molde de nova classe do jogador com árvore `skillsByLevel`, cooldowns e execução de habilidades.
- **[`CognitiveNpcTemplate.ts`](typescript/domain/templates/CognitiveNpcTemplate.ts):** Molde de NPC inteligente com `npcName`, `agentName`, persona do Ollama e ponte BDI Panteão/Rust.
- **[`ArmorTemplate.ts`](typescript/domain/templates/ArmorTemplate.ts):** Molde de armaduras e peças anatômicas (Capacetes, Peitorais, Botas, Calças, Luvas, Anéis, Amuletos) com `armorType`, `damageReductionPercent` e Paperdoll.
- **[`WeaponTemplate.ts`](typescript/domain/templates/WeaponTemplate.ts):** Molde de armas corpo-a-corpo e de longo alcance com `iconId`, escalonamento e efeitos.
- **[`ConsumableTemplate.ts`](typescript/domain/templates/ConsumableTemplate.ts):** Molde de itens de uso único e poções com verificação segura de consumo no `use()`.
- **[`StatusEffectTemplate.ts`](typescript/domain/templates/StatusEffectTemplate.ts):** Molde de debuffs e DoTs com `onApply`, `onTick` in-place e `onRemove`.
- **[`SkillTemplate.ts`](typescript/domain/templates/SkillTemplate.ts):** Molde canônico de habilidades (ativas, passivas, essenciais e atributos), com validação de Mana/HP, cooldown e conversão canônica para `Skill`.
- **[`EvolvingClassTemplate.ts`](typescript/domain/templates/EvolvingClassTemplate.ts) & [`EvolvingClassBase.ts`](typescript/domain/templates/EvolvingClassBase.ts):** Molde de classes evolutivas de múltiplos estágios (Iniciado $\rightarrow$ Desperto $\rightarrow$ Forma Verdadeira / Transcendência) com metamorfose da árvore de habilidades e checagem de marcos de história.
- **[`AttackBuilder.ts`](typescript/domain/templates/AttackBuilder.ts):** Construtor fluente avançado para criar ataques complexos com escalonamentos múltiplos, status, knockback, AoE e críticos.
- **[`attacks/`](typescript/domain/templates/attacks/):** Sub-módulo dedicado a templates cinemáticos e geométricos de combate:
  - **[`OrbitalAttackTemplate.ts`](typescript/domain/templates/attacks/OrbitalAttackTemplate.ts):** Lâminas orbitais e redemoinhos em torno do mestre, com velocidade angular escalada por Destreza, raio escalado por Força/Área, cooldown por alvo e modos de knockback (tangential, radial, pull).
  - **[`SweepingArcAttackTemplate.ts`](typescript/domain/templates/attacks/SweepingArcAttackTemplate.ts):** Cortes em arco / cleave direcional com duração escalada por Destreza.
  - **[`ChanneledBeamAttackTemplate.ts`](typescript/domain/templates/attacks/ChanneledBeamAttackTemplate.ts):** Raios canalizados e feixes contínuos com rotação suave orientada ao cursor e pulsos periódicos de dano.
  - **[`NovaBurstAttackTemplate.ts`](typescript/domain/templates/attacks/NovaBurstAttackTemplate.ts):** Ondas expansivas e explosões em anel circular com hit único por alvo.
- **[`ComplexClassBase.ts`](typescript/domain/templates/ComplexClassBase.ts):** Base arquitetural e builder `ClassSkillBuilder` para classes com dezenas de mecânicas, custo de mana e cooldowns automáticos.
- **[`BroochTemplate.ts`](typescript/domain/templates/BroochTemplate.ts):** Molde fluente para broches ancestrais (Ativos redondos e Passivos triangulares) com hooks encapsulados e registro no `BroochRegistry`.
- **[`TransformationTemplate.ts`](typescript/domain/templates/TransformationTemplate.ts):** Molde de metamorfoses, buffs e avatares (tint, scale, imunidades, multiplicador de dano e reversão automática).
- **[`SummonTemplate.ts`](typescript/domain/templates/SummonTemplate.ts):** Molde de invocações e mascotes autônomos com IA desacoplada, distância de trela e disparo de ataques via `AttackBuilder`.
- **[`GroundHazardTemplate.ts`](typescript/domain/templates/GroundHazardTemplate.ts):** Molde de efeitos espaciais de solo, poças e santuários com ticks periódicos Zero-GC.
- **[`SynergyReactionTemplate.ts`](typescript/domain/templates/SynergyReactionTemplate.ts):** Matriz de reações e sinergias elementais entre status (ex: Vaporização, Eletrochoque, Combustão Tóxica).
- **[`mage/`](typescript/domain/templates/mage/):** Sistema modular e escalável de feitiços rúnicos do Mago:
  - **`MageSpellTemplate.ts`:** Criação declarativa e fluente de receitas estáticas (`matchingSequence`, `withIntelligenceScaling`, `asProjectile`, `asHomingMissiles`, `customExecution`).
  - **`RuneGrammarEngine.ts`:** Mapeamento de runas (`spell_0`..`spell_9`) para Formas, Forças e Elementos, com motor de fusão sintática adjacente (Deep-2 Fusion).
  - **`MageSpellCraftingRegistry.ts`:** Orquestrador desacoplado de receitas estáticas, solucionadores de formas dinâmicas (`projectile`, `self`, extensível para `beam`, `nova`) e forças vetoriais Zero-GC (`knockback`, `pull`).
- **[`index.ts`](typescript/domain/templates/index.ts):** Ponto de exportação do dicionário `DomainTemplates`.


> [!TIP]
> Para o guia completo e detalhado com exemplos de código e passos de registro, consulte o documento [`docs/creating-classes.md`](docs/creating-classes.md).

---

## 8. Como o Desenvolvedor do Domínio Prepara a Base para Outros Especialistas

Sempre que uma nova capacidade ou funcionalidade envolver outras camadas:
1. **Contrato de Porta Secundária:** Crie ou atualize uma interface em `typescript/domain/ports/` (ex: `INewServicePort.ts`).
2. **DTOs de Transporte:** Defina os tipos primitivos e estruturas limpas em `typescript/domain/ports/domain-contracts.ts`.
3. **Eventos Semânticos:** Registre novos canais e payloads no dicionário `IGameEvents.ts`.
4. **Implementação Dummy/Null Object:** Forneça uma implementação nula ou de fallback (ex: `NullTelemetryPort`) para que o Domínio continue 100% testável e desacoplado.
5. **Comunicação Clara:** Documente no PR/tarefa as assinaturas e comportamentos esperados para que o desenvolvedor de Adaptadores/UI apenas conecte a sua ponta.

---

## 9. Mandato Obrigatório de Testes: Testes Unitários e Testes de Regressão a Cada Execução

> [!IMPORTANT]
> **DIRETRIZ MANDATÓRIA DE EXECUÇÃO:**
> **Toda e qualquer execução, modificação de regra de negócio, adição de recurso ou correção de bug no Domínio DEVE OBRIGATORIAMENTE vir acompanhada de novos testes unitários e testes de regressão.**
> 
> 1. **Testes Unitários Obrigatórios:**
>    - Cada nova entidade, classe, status effect, fórmula ou método adicionado deve possuir testes unitários isolados e determinísticos cobrindo caminhos felizes, condições de borda e falhas controladas em `typescript/tests/domain/` ou `typescript/tests/unit/`.
> 2. **Testes de Regressão Obrigatórios:**
>    - Para qualquer bug corrigido ou comportamento alterado, criar imediatamente um teste de regressão específico reproduzindo o cenário do defeito e garantindo que o bug nunca mais retorne.
> 3. **Execução Obrigatória da Switch de Regressão e Validação Contínua:**
>    - **SEMPRE executar a switch de regressão (`npm run test:regression`)** no encerramento de toda e qualquer tarefa, além dos testes unitários e `npx tsc --noEmit`.

---

## 10. Checklist de Qualidade do Desenvolvedor do Domínio

Antes de finalizar qualquer modificação em `typescript/domain/`:
- [ ] **Escopo Estrito:** A alteração pertence 100% ao Domínio? Nenhuma linha de tela, DOM, CSS ou Tauri foi escrita?
- [ ] **SRP & Coesão:** A classe tem responsabilidade única bem definida? Evitou acoplamentos cruzados?
- [ ] **Base para Terceiros:** Caso necessite de I/O externo, a Porta Secundária e os DTOs estão prontos e documentados para os outros especialistas?
- [ ] **Zero-GC:** O código em ciclos de frame evita `new`, utiliza métodos `*Mut` em vetores e reutiliza coleções?
- [ ] **Desacoplamento:** Novas entidades/projéteis usam `@RegisterSpawner` e métodos estáticos fábrica?
- [ ] **Testes Unitários:** Foram criados testes unitários cobrindo todas as novas regras, invariantes e métodos adicionados?
- [ ] **Testes de Regressão:** Foi criado teste de regressão blindando o comportamento e evitando reincidência de bugs?
- [ ] **Switch de Regressão & Suíte Verde:** A switch de regressão (`npm run test:regression`), os testes unitários e a checagem de tipos (`npx tsc --noEmit`) foram executados e passam com 100% de sucesso?

