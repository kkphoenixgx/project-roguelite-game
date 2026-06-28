/** @file Define a Porta Secundária (Secondary Port) para o serviço de logging. */
/** Define os canais de log disponíveis na aplicação. Estando aqui, pode ser usado tanto pelo domínio quanto pelos adaptadores. */
export type LogChannel = 
  | 'init'      //? Para o fluxo de inicialização
  | 'input'     //? Para inputs do usuário (teclado, mouse)
  | 'domain'    //? Para eventos dentro da camada de domínio
  | 'domain-entity-move' //? Para rastrear log excessivo de movimentação de entidades
  | 'sync'      //? Para a sincronização entre domínio e renderizáveis
  | 'events'    //? eventos
  | 'actions'    //? eventos
  | 'render'    //? Para o ciclo de desenho
  | 'camera'    //? Para lógica da câmera
  | 'loop'      //? Para o game loop principal (deltaTime)
  | 'factory'   //? Para a criação de objetos na RenderableFactory
  | 'error'     //? Para erros e avisos importantes
  | 'hitbox'    //? Para eventos de hitbox
  | 'npc'       //? Para comportamento e IA de NPCs
  | 'update-cycles'//? Para update cycles (game loop)
  | 'classes:pescador'//? Para update cycles (game loop)
  | 'ipc'       //? Para Inter-Process Communication (Tauri)
;    


/** @interface ILogger Define o contrato que o domínio espera para um serviço de log. */
export interface ILogger {
  log( channel: LogChannel, message: string, ...data: any[]): void;
}
