/** @file Ponto de entrada (entrypoint) da aplicação, responsável por instanciar as camadas principais (Domínio e Adapter), injetar as dependências e iniciar o ciclo de vida do jogo. */
import "./shared/CrashHandler";
import DomainFacade from "../../domain/DomainFacade";
import GameAdapter from "./components/GameAdapter";
import { EventHandler } from "../../domain/eventDispacher/eventDispacher";
import { logger } from "./shared/Logger";
import { CollisionAdapter } from "../../domain/ports/CollisionAdapter";

//? Auto-carrega todos os arquivos de representação visual para disparar os Decorators de Registro
import.meta.glob('./components/gameObjectModule/**/*.ts', { eager: true });

/** Configuração inicial do jogo. O jogador nasce no spawn oficial da vila: a praça octogonal em frente à Fonte do Despertar (Chunk Central 0,0). */
const gameConfig = {
  //? Deixei o level assim para ele ter uma vida legal e conseguir morrer
  player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } }
};

import AdapterManager from "../AdapterManager";
import { TelemetryAdapter } from "../TelemetryAdapter/TelemetryAdapterSingleton";
import { TauriJsonSaveRepository } from "./infrastructure/TauriJsonSaveRepository";
import { NullLLMConfigPort } from "../../domain/ports/ILLMConfigPort";

/** Função principal (`main`) que orquestra a inicialização. O uso de `async` é necessário para aguardar o carregamento de assets (ex: imagens) antes que o jogo efetivamente comece a rodar. */
async function main() {
  const eventManager = new EventHandler();
  const collisionAdapter = new CollisionAdapter();
  const telemetryAdapter = TelemetryAdapter.getInstance();
  eventManager.setTelemetry(telemetryAdapter);

  const saveRepository = new TauriJsonSaveRepository();
  const domain = new DomainFacade(gameConfig, logger, eventManager, collisionAdapter, telemetryAdapter, NullLLMConfigPort, saveRepository);
  const adapterManager = new AdapterManager(domain, eventManager, telemetryAdapter);

  try {
    await adapterManager.start();
  } catch (error) {
    console.error("Falha ao inicializar o jogo:", error);
  }
}

main();