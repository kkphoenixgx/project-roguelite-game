# Arquitetura de Diagnóstico e Telemetria (Telemetry Adapter)

Para elevar o nível do monitoramento do seu Roguelite além de um simples `Logger` de texto, precisamos de uma arquitetura baseada em **Sensores**, **Agregação** e **Visualização em Tempo Real**. O objetivo é ter um "Raio-X" da Engine sem impactar a premissa de Zero-GC (Garbage Collection).

## 1. O Problema do Logger Padrão
Atualmente, o `Logger` é reativo (baseado em eventos de texto). Para um diagnóstico perfeito de performance (que roda a 60 FPS), disparar logs de texto a cada colisão ou loop de física vai **estrangular a CPU** e causar *Memory Leaks* devido à concatenação de strings. 
Precisamos de um **Telemetry Adapter** (Adaptador de Telemetria).

## 2. Métricas Essenciais para o Diagnóstico Perfeito

### A. Métricas de Performance (O "Coração" do Jogo)
*   **Frame Time / Tick Time (ms):** O tempo exato que o `update()` do Domínio leva para rodar. Deve ficar estritamente abaixo de `16.6ms`.
*   **Heap Usage Delta (Zero-GC):** Rastrear a alocação de memória do V8/Tauri entre os frames para provar matematicamente que nenhuma classe está vazando memória.
*   **Render Thrashing:** Tempo gasto no Adapter desenhando as entidades na tela vs tempo gasto calculando a física.
*   **Latência IPC (Tauri):** O tempo de ida e volta (round-trip) das mensagens entre o Frontend (Webview) e o Backend (Rust).

### B. Métricas Físicas e de Espaço (Hitboxes e QuadTree)
*   **Entidades Ativas:** Contagem exata de balas, inimigos, e partículas vivos no frame.
*   **Checks de Colisão por Frame:** Quantas vezes o `HitboxParser` e a `QuadTree` tentaram cruzar posições (para validar o $O(N \log N)$).
*   **Colisões Resolvidas:** Quantos atritos reais ocorreram e precisaram do *Double Buffering* para resolução.

### C. Métricas de Eventos e Estado (O Loop e Funcionalidades)
*   **Event Bus Throughput:** Quantos eventos o `EventManager` despachou por segundo.
*   **State Desyncs:** Tentativas de executar ações inválidas (ex: atirar em *cooldown*, andar enquanto em *Stun*).
*   **Time-To-Kill (TTK) Dinâmico:** DPS real acontecendo na tela naquele segundo.

---

## 3. O "Telemetry Adapter" (Proposta de Arquitetura)

A ideia é criar um subsistema isolado, chamado `TelemetryAdapter`, que escuta o seu motor sem bloqueá-lo.

### Arquitetura Hexagonal do Profiler:
1.  **Sensores (Probes):** 
    - Injetados diretamente no *GameLoop* (`ObjectElementManager`) e na *QuadTree*. Em vez de gerar texto, eles apenas incrementam **números inteiros** ou registram *timestamps* numéricos (Zero alocação de lixo).
2.  **O Agregador (`TelemetryAdapter`):**
    - Uma classe que coleta os dados dos Sensores e, apenas uma vez por segundo (a cada 60 frames), empacota essas métricas.
    - O `Logger` existente se acopla a este Agregador apenas para registrar *Erros Críticos* de execução (`try/catch`).
3.  **A Interface de Visualização (Debug Overlay):**
    - Um painel sobreposto no Frontend (Canvas ou HTML via React/Vanilla) pressionando uma tecla como `F3`.
    - Exibe gráficos de linha para o *Frame Time*, um contador de *Entidades*, e um console deslizante contendo apenas os Logs Críticos de Funcionalidades/Erros filtrados do `Logger`.

### Diagrama de Fluxo

```mermaid
graph TD
    subgraph Motor do Jogo (Domínio)
        GL[Game Loop] --> |1. DeltaTime| S(Sensores Numéricos)
        QT[QuadTree / Física] --> |2. Collision Count| S
        EB[Event Manager] --> |3. Throughput| S
    end

    subgraph Diagnóstico (Adapter)
        S --> |Frames 1..59| TA[Telemetry Adapter / Agregador]
        L[Logger de Texto] --> |Apenas Erros/Exceptions| TA
        TA --> |Frame 60: Empacota Snapshot| DO[Debug Overlay UI]
    end

    subgraph Visualização (Tauri / Frontend)
        DO --> G[Gráfico de FPS / Memória]
        DO --> C[Console de Erros e Hitboxes]
    end
```

## 4. Como Melhorar a Ideia Atual
Para melhorar a ideia proposta do seu ecossistema, o adaptador deve seguir **3 Regras de Ouro**:
1.  **Desacoplamento Absoluto:** O jogo não deve saber que está sendo diagnosticado. Use a injeção de dependência no construtor da Facade.
2.  **Buffers Circulares para Logs:** O `Logger` só deve guardar os últimos 100 eventos de erros ou ações, apagando os antigos. Isso evita que o jogo trave por falta de memória RAM após 1 hora de testes contínuos.
3.  **Renderização Condicional de Hitboxes:** O `TelemetryAdapter` deve ter um comando (`isHitboxVisible = true`) que força a camada de Renderização do Tauri a desenhar retângulos vermelhos/verdes (usando primitivas simples, sem textura) baseados nos vértices atuais da física no Domínio, permitindo o *debug* visual das "espadadas" e projéteis.
