# Pesquisa: Panteão (BDI MAS Globalization & Sidecar Engine)

**Caminho de Origem:** `/home/kkphoenix/Documents/Workspace/1. Pesquisa/Panteão`  
**Conexão com o Jogo:** Direta e Crítica (`src-tauri/bin/panteao-engine`, `src-tauri/src/panteao_manager.rs`, `typescript/domain/DomainFacade.ts`)

---

## 1. O que é o Panteão

O **Panteão** é um framework e motor de runtime concebido para globalizar o paradigma **Agent-Oriented Programming (AOP)** e o modelo **BDI (Belief-Desire-Intention)**. Ele desacopla a engine Java do **Jason / JaCaMo / Moise**, empacotando-a como um binário nativo autônomo via **GraalVM Native Image** (`panteao-engine`).

O desenvolvedor de aplicações externas (Node.js, TypeScript, Rust, Python, Go, C#, Swift, etc.) pode definir agentes cognitivos em arquivos `.asl` e projetos `.jcm`, sem precisar de JVM instalada, lidando apenas com o SDK nativo de sua linguagem.

---

## 2. Arquitetura e Decisões de Design

### 2.1. O Binário Nativo (GraalVM)
- Compilação AOT (*Ahead-Of-Time*) do interpretador Jason e suas dependências.
- **Footprint e Inicialização:** Tempo de boot em milissegundos e consumo de memória drasticamente menor se comparado a uma JVM tradicional.
- O interpretador do Jason preserva a mutação dinâmica em tempo de execução: continua carregando planos `.asl`, alterando a Base de Crenças (BB) e a Biblioteca de Planos (PL).

### 2.2. IPC e Protocolo de Linha (TCP + JSON)
- **`IPCAgArch`**: Intercepta as ações deliberadas pelos agentes e as serializa em JSON através do canal TCP.
- **`IPCEnvironment`**: Servidor de ultra-baixa latência que recebe percepções e eventos do cliente externo e os injeta no ciclo de raciocínio BDI dos agentes.
- **Evolução (Agente Gateway Talaria)**: Transição planejada da interceptação crua de ações para o uso semântico de performativas KQML nativas (`.send(talaria, tell, ...)`), padronizando a comunicação externa como atos de fala.

### 2.3. SDKs Multi-linguagem e Modo Wildcard (Proxy)
- Suporte a 18 linguagens com modo `on_any_action` / `onAnyAction`.
- Ideal para arquiteturas de gateway onde a aplicação hospedeira (como Tauri em Rust) atua apenas como condutor dos eventos entre o mundo visual/jogo e os agentes cognitivos.

---

## 3. Integração com o `rpg-roguelite-game`

O jogo utiliza o Panteão como o seu **motor cognitivo de NPCs**:

1. **Sidecar Desktop (`src-tauri/tauri.conf.json` & `panteao_manager.rs`):**
   - O Tauri inicia o processo executável `src-tauri/bin/panteao-engine-x86_64-unknown-linux-gnu` em background apontando para a pasta de agentes do jogo.
   - O cliente Rust `panteao-client` conecta via socket local e estabelece a ponte bidirecional.
2. **Eventos IPC Domínio (`typescript/domain/DomainFacade.ts`):**
   - O Domínio escuta eventos `panteao-event` e `panteao-error` emitidos pelo Tauri.
   - Percepções do mundo do jogo (posições, HP, alertas) são despachadas via IPC para o Panteão, e intenções deliberadas dos NPCs são convertidas em comportamentos e diálogos em tempo real.
