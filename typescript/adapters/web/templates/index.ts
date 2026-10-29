import { BaseGuiTemplate } from "./BaseGuiTemplate";
import { GuiBuilder } from "./GuiBuilder";
import { ParticleConfigBuilder, ParticleVfxPresets } from "./ParticleConfigBuilder";
import { SmokeParticleRenderer, SmokeVfxPresets } from "./SmokeParticleTemplate";
import { FloatingTextBuilder, FloatingTextEntity } from "./FloatingTextTemplate";
import { TooltipManagerTemplate } from "./TooltipManagerTemplate";
import { ScreenShakeBuilder, ScreenShakeController } from "./ScreenShakeTemplate";
import { MinimapPinTemplate } from "./MinimapPinTemplate";
import { SoundFxAdapterTemplate } from "./SoundFxAdapterTemplate";
import { SpriteVisualBuilder } from "./SpriteVisualBuilder";
import { EventBindingBuilder } from "./EventBindingBuilder";
import { VisualElementTemplate } from "./VisualElementTemplate";
import { StorybookGuiBuilder } from "./StorybookGuiBuilder";

/**
 * ==============================================================================
 * CATÁLOGO DE PADRÕES E BUILDERS DO ADAPTADOR WEB (WebAdapterTemplates)
 * ==============================================================================
 * Ponto de entrada corporativo e canônico para a criação de novos componentes
 * no Adaptador Web (`typescript/adapters/web/`).
 * 
 * 1. BaseGuiTemplate: Gabarito e ciclo de vida para telas DOM / Glassmorphism.
 * 2. GuiBuilder: Criação fluente de modais e janelas sem boilerplate.
 * 3. ParticleConfigBuilder: Criação declarativa de física de partículas.
 * 4. SmokeParticleRenderer: Renderização de fumaça volumétrica e puffs.
 * 5. FloatingTextBuilder: Números de dano, status e curas com arco no Canvas.
 * 6. TooltipManagerTemplate: Hover cards com clamping automático na tela.
 * 7. ScreenShakeBuilder: Tremores de impacto para a câmera do jogo.
 * 8. MinimapPinTemplate: Projeção de alvos no radar e bússola com rotação.
 * 9. SoundFxAdapterTemplate: Gerenciamento Web Audio com canais e pitch shift.
 * 10. SpriteVisualBuilder: Configuração de animações e atlas WebGPU.
 * 11. EventBindingBuilder: Conexão segura Domínio -> UI com unbindAll automático.
 * 12. VisualElementTemplate: Gabarito para novos renderáveis no Canvas/WebGPU.
 * 13. StorybookGuiBuilder: Padronização total para criação de arquivos .stories.ts.
 * ==============================================================================
 */
export const WebAdapterTemplates = {
  BaseGui: BaseGuiTemplate,
  GuiBuilder: GuiBuilder,
  ParticleBuilder: ParticleConfigBuilder,
  ParticlePresets: ParticleVfxPresets,
  SmokeRenderer: SmokeParticleRenderer,
  SmokePresets: SmokeVfxPresets,
  FloatingText: FloatingTextBuilder,
  FloatingTextEntity: FloatingTextEntity,
  TooltipManager: TooltipManagerTemplate,
  ScreenShake: ScreenShakeBuilder,
  MinimapPin: MinimapPinTemplate,
  SoundFx: SoundFxAdapterTemplate,
  SpriteBuilder: SpriteVisualBuilder,
  EventBinder: EventBindingBuilder,
  VisualElement: VisualElementTemplate,
  StorybookBuilder: StorybookGuiBuilder
} as const;

export {
  BaseGuiTemplate,
  GuiBuilder,
  ParticleConfigBuilder,
  ParticleVfxPresets,
  SmokeParticleRenderer,
  SmokeVfxPresets,
  FloatingTextBuilder,
  FloatingTextEntity,
  TooltipManagerTemplate,
  ScreenShakeBuilder,
  ScreenShakeController,
  MinimapPinTemplate,
  SoundFxAdapterTemplate,
  SpriteVisualBuilder,
  EventBindingBuilder,
  VisualElementTemplate,
  StorybookGuiBuilder
};

export default WebAdapterTemplates;
