/** @file Define a Porta Secundária (Secondary Port) para o serviço de logging. */
/** Define os canais de log disponíveis na aplicação. Estando aqui, pode ser usado tanto pelo domínio quanto pelos adaptadores. */
export type LogChannel = 
  | 'init'
  | 'input'
  | 'domain'
  | 'domain-entity-move'
  | 'sync'
  | 'events'
  | 'actions'
  | 'render'
  | 'camera'
  | 'loop'
  | 'factory'
  | 'error'
  | 'hitbox'
  | 'npc'
  | 'update-cycles'
  | 'classes:pescador'
  | 'ipc'
;    


/** @interface ILogger Define o contrato que o domínio espera para um serviço de log. */
export interface ILogger {
  log( channel: LogChannel, message: string, ...data: any[]): void;
}
