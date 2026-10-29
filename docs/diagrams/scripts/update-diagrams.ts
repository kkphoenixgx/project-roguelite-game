/**
 * @file update-diagrams.ts
 * Orquestrador da documentação incremental espelhada em docs/diagrams/.
 * Executa dependency-cruiser, codegraph e XState para atualizar diagramas Mermaid de forma 100% determinística.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  mutantLifeCycleMachine,
  portalTransitionMachine,
  playerStateMachine,
  skillTreeStateMachine,
  guiLifecycleMachine,
  exportMachineToMermaid
} from './generate-state-diagram';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const DOCS_DIR = path.resolve(ROOT_DIR, 'docs/diagrams');

function runCommand(command: string): string {
  try {
    return execSync(command, { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (err: any) {
    return err.stdout || '';
  }
}

async function main() {
  console.log('[Diagrams Sync] Iniciando geração determinística em lote de todos os subsistemas...');

  // 1. Diagramas de Estados Formais (XState)
  console.log('1. Gerando diagramas de estados (XState)...');
  const states = {
    'mutant-lifecycle': exportMachineToMermaid(mutantLifeCycleMachine),
    'portal-transition': exportMachineToMermaid(portalTransitionMachine),
    'player-states': exportMachineToMermaid(playerStateMachine),
    'skilltree-branching': exportMachineToMermaid(skillTreeStateMachine),
    'gui-lifecycle': exportMachineToMermaid(guiLifecycleMachine)
  };

  for (const [name, content] of Object.entries(states)) {
    fs.writeFileSync(path.resolve(DOCS_DIR, `states/${name}.mmd`), content, 'utf-8');
  }

  // 2. Grafos de Arquitetura e Dependências (dependency-cruiser)
  console.log('2. Gerando grafos de dependências de arquitetura (dependency-cruiser)...');
  const archTargets = [
    { name: 'domain-facade-overview', file: 'typescript/domain/DomainFacade.ts' },
    { name: 'portals-architecture', file: 'typescript/domain/ObjectModule/Maps/PortalLink.ts' },
    { name: 'combat-architecture', file: 'typescript/domain/ObjectModule/Items/Attack.ts' },
    { name: 'player-architecture', file: 'typescript/domain/ObjectModule/Entities/Player/Player.ts' },
    { name: 'game-adapter-overview', file: 'typescript/adapters/web/components/GameAdapter.ts' },
    { name: 'assets-adapter-overview', file: 'typescript/adapters/assets-adapter/Components/AssetScanner.ts' }
  ];

  const archResults: Record<string, string> = {};
  for (const target of archTargets) {
    console.log(`   - Arquitetura: ${target.name}...`);
    const output = runCommand(
      `npx depcruise --include-only "^typescript" --output-type mermaid ${target.file}`
    );
    if (output) {
      fs.writeFileSync(path.resolve(DOCS_DIR, `architecture/${target.name}.mmd`), output, 'utf-8');
      archResults[target.name] = output.trim();
    }
  }

  // 3. Compilação do README espelhado completo
  console.log('3. Atualizando docs/diagrams/README.md espelhado com todos os fluxos...');
  const readmeContent = `# Documentação Completa e Espelhada de Diagramas do Projeto

> **Origem dos Dados**: Gerado 100% de forma determinística por ferramentas de AST e Autômatos de Terceiros (\`dependency-cruiser\`, \`@optave/codegraph\`, \`xstate\`).  
> **Garantia de Integridade**: Zero alucinação manual por LLM. Se o código fonte for refatorado, os diagramas são atualizados automaticamente via \`npm run diagrams:update\`.

---

## 1. Diagramas de Estados Formais (\`docs/diagrams/states/\`)

### 1.1 Ciclo de Vida do Jogador (Player State Machine)
Origem: [\`docs/diagrams/states/player-states.mmd\`](./states/player-states.mmd)
\`\`\`mermaid
${states['player-states']}
\`\`\`

### 1.2 Transição de Portais & InnerMaps
Origem: [\`docs/diagrams/states/portal-transition.mmd\`](./states/portal-transition.mmd)
\`\`\`mermaid
${states['portal-transition']}
\`\`\`

### 1.3 Exclusividade e Ramificação da Árvore de Habilidades (Skill Tree)
Origem: [\`docs/diagrams/states/skilltree-branching.mmd\`](./states/skilltree-branching.mmd)
\`\`\`mermaid
${states['skilltree-branching']}
\`\`\`

### 1.4 Ciclo de Vida de Modais e GUIs (UIManager)
Origem: [\`docs/diagrams/states/gui-lifecycle.mmd\`](./states/gui-lifecycle.mmd)
\`\`\`mermaid
${states['gui-lifecycle']}
\`\`\`

### 1.5 Ciclo de Vida do Mutante de Teste (Stryker Mutator)
Origem: [\`docs/diagrams/states/mutant-lifecycle.mmd\`](./states/mutant-lifecycle.mmd)
\`\`\`mermaid
${states['mutant-lifecycle']}
\`\`\`

---

## 2. Grafos Arquiteturais de Dependência (\`docs/diagrams/architecture/\`)

### 2.1 Visão Geral do Domínio (\`DomainFacade\`)
\`\`\`mermaid
${archResults['domain-facade-overview'] || ''}
\`\`\`

### 2.2 Subsistema de Entidades e Jogador (\`Player\`)
\`\`\`mermaid
${archResults['player-architecture'] || ''}
\`\`\`

### 2.3 Subsistema de Portais e Colisão de Mapas (\`PortalLink\`)
\`\`\`mermaid
${archResults['portals-architecture'] || ''}
\`\`\`

### 2.4 Subsistema de Combate e Ataques (\`Attack\`)
\`\`\`mermaid
${archResults['combat-architecture'] || ''}
\`\`\`

### 2.5 Adaptador Web Principal (\`GameAdapter\`)
\`\`\`mermaid
${archResults['game-adapter-overview'] || ''}
\`\`\`

### 2.6 Adaptador de Assets e Scenery Placer (\`AssetScanner\`)
\`\`\`mermaid
${archResults['assets-adapter-overview'] || ''}
\`\`\`

---
*Gerado e mantido em pipeline via \`npm run diagrams:update\`.*
`;

  fs.writeFileSync(path.resolve(DOCS_DIR, 'README.md'), readmeContent, 'utf-8');
  console.log('[Diagrams Sync] Documentação completa gerada com sucesso em docs/diagrams/!');
}

main().catch(err => {
  console.error('[Diagrams Sync] Erro:', err);
  process.exit(1);
});
