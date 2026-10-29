/** @file Contém a `RenderableFactory`, responsável por criar objetos visuais (`IRenderable`) a partir do estado do domínio. */
import { logger } from "../../../shared/Logger";
import type { EntityRenderableState } from "../../../../../domain/ports/domain-contracts";
import type IRenderable from "../visuals/IRenderable";
import { RenderRegistry } from "../../../shared/RenderRegistry";
import GameObjectElement from "../visuals/GameObjectElement";

// Auto-carrega as exceções visuais (Lego do Player, Círculos) para forçar a ativação dos Decorators!
import.meta.glob('../customRenderables/**/*.ts', { eager: true });

/** @class RenderableFactory Utiliza o padrão Factory para desacoplar o `GameAdapter` da criação de objetos visuais concretos. Ele mapeia o estado do domínio (ex: `entityTypeId`, `state`) para a instância `IRenderable` apropriada (ex: `Sprite`). */
export class RenderableFactory {

  //? Cache das imagens
  private imageCache: Map<string, HTMLImageElement> = new Map();

  private creationStrategies = RenderRegistry.strategies;
  private spriteConfigs = RenderRegistry.spriteConfigs;

  /** Fase de Update (Sincronização): Cria uma nova instância de um objeto `IRenderable` com base no DTO de estado fornecido pelo domínio. @param state O DTO de estado da entidade a ser criada. @returns Uma instância de `IRenderable` (ex: `Sprite`) ou `null` se nenhuma configuração for encontrada. */
  public create(state: EntityRenderableState): IRenderable | null {
    // Entidades puramente lógicas/colisionadoras sem representação visual direta
    if (state.entityTypeId === 'environmentCollider' || state.entityTypeId === 'portalLink' || state.entityTypeId === 'portalLinkRequest') {
      return null;
    }

    let creationStrategy = this.creationStrategies.get(state.entityTypeId);

    // Se não houver Override registrado (Decorators), usa a Criação Genérica Automática (Data-Driven)!
    if (!creationStrategy) {
      creationStrategy = (params) => {
        let stateStr = params.initialState.state;
        let configKey = `${params.initialState.entityTypeId}-${stateStr}`;
        
        // Tratamento genérico para itens dropados no chão
        if (params.initialState.entityTypeId === 'droppedItem') {
          configKey = `droppedItem-${stateStr}`; // O state carrega o iconId do item dropado
        } else if (!stateStr || !this.spriteConfigs.has(configKey)) {
          // Busca a primeira chave de animação registrada como fallback se o estado atual não existir
          configKey = Array.from(this.spriteConfigs.keys()).find(k => k.startsWith(`${params.initialState.entityTypeId}-`)) || configKey;
        }

        const config = this.spriteConfigs.get(configKey);
        let image = this.imageCache.get(config?.imageSrc || '');
        if (!image && config?.imageSrc) {
          image = new Image();
          image.src = config.imageSrc;
          this.imageCache.set(config.imageSrc, image);
        }
        
        return new GameObjectElement(params.initialState, config, image);
      };
      this.creationStrategies.set(state.entityTypeId, creationStrategy); // Salva na memória para não recriar a função todo frame
    }

    try {
      
      return creationStrategy({
        initialState: state,
        configs: this.spriteConfigs,
        imageCache: this.imageCache 
      });
    } 
    catch (error) {
      logger.log('error', `(Rendable Factory) Failed to create renderable for ${state.entityTypeId}:`, error);
      return null;
    }
  }

  /** Pré-carrega todas as imagens definidas em `spriteConfigs` e as armazena no cache. */
  public async preloadAssets(): Promise<void> {
    const promises: Promise<void>[] = [];
    const uniqueImageSources = new Set(Array.from(this.spriteConfigs.values()).map(config => config.imageSrc));

    for (const src of uniqueImageSources) {
      if (!src) continue; // Ignora o carregamento caso uma Config possua uma url vazia (ex: CircleForm)
      if (this.imageCache.has(src)) continue;

      const promise = new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => {
          this.imageCache.set(src, image);
          resolve();
        };
        image.onerror = () => {
            logger.log('error', `(Rendable Factory) Failed to preload asset: ${src}`);
            resolve(); // Resolve em vez de rejeitar para não quebrar o boot do jogo! O fallback (caixa preta) será usado.
        };
        image.src = src;
      });
      promises.push(promise);
    }
    await Promise.all(promises);
  }
  
}