# 🏛️ Catálogo de Padrões e Builders do Adaptador Web (`typescript/adapters/web/templates/`)

Este módulo é o **kit corporativo canônico** para desenvolvimento no **Adaptador Web** (`typescript/adapters/web/`).

Assim como o Domínio possui o `typescript/domain/templates/` para entidades e regras sem efeitos colaterais, este módulo padroniza e acelera a criação de **interfaces DOM**, **efeitos de partículas**, **renderização visual**, **bindings de eventos** e **histórias do Storybook**.

---

## 🎯 Por que usar este módulo?
1. **Evita criar código do zero:** novos desenvolvedores e agentes não precisam adivinhar como estruturar GUIs, partículas ou stories.
2. **Garante Clean Code e SOLID:** isolamento estrito entre apresentação e domínio, obedecendo ao SRP.
3. **Zero Leaks de Memória:** gestão de ciclo de vida com `destroy()` e `unbindAll()` embutidos.
4. **Data-Driven & Fluente:** APIs ricas em builders (`.at(x, y).colors(...).build()`).

---

## 📚 Índice dos Gabaritos e Builders Disponíveis

| Nome | Tipo | Propósito |
| :--- | :--- | :--- |
| [`BaseGuiTemplate`](BaseGuiTemplate.ts) | Classe Base | Ciclo de vida para telas DOM / HUDs (injeção segura de CSS/HTML, `show`, `hide`, `destroy`). |
| [`GuiBuilder`](GuiBuilder.ts) | Builder Fluente | Criação rápida de janelas e modais com eventos declarativos sem escrever classes. |
| [`ParticleConfigBuilder`](ParticleConfigBuilder.ts) | Builder Fluente | Configuração de física, dispersão, cones e cores para o `ParticleOrchestrator`. |
| `ParticleVfxPresets` | Presets Prontos | Presets instantâneos de sangue, impacto crítico, centelhas mágicas e level up. |
| [`SmokeParticleRenderer`](SmokeParticleTemplate.ts) | Custom Renderer | Renderizador de fumaça volumétrica orgânica com lóbulos, torque e dissipação não-linear. |
| `SmokeVfxPresets` | Presets Prontos | Presets de fumaça de chaminé grimdark, nuvem de veneno e puff de explosão. |
| [`FloatingTextBuilder`](FloatingTextTemplate.ts) | Builder Fluente | Números de dano, críticos, evasão e cura flutuantes com arco no Canvas (Zero-DOM). |
| [`TooltipManagerTemplate`](TooltipManagerTemplate.ts) | Singleton | Hover cards flutuantes Glassmorphism com clamping automático nas bordas da tela. |
| [`ScreenShakeBuilder`](ScreenShakeTemplate.ts) | Builder Fluente | Controlador de tremores de câmera com decaimento suave e ruído harmônico. |
| [`MinimapPinTemplate`](MinimapPinTemplate.ts) | Projetor Matemático | Projeção polar de alvos no radar e bússola com rotação para alvos fora da tela. |
| [`SoundFxAdapterTemplate`](SoundFxAdapterTemplate.ts) | Adaptador Web Audio | Gerenciamento de áudio com canais de volume (SFX/Música/UI) e pitch shift orgânico. |
| [`SpriteVisualBuilder`](SpriteVisualBuilder.ts) | Builder Fluente | Configuração de animações, frames, velocidade, atlas offsets e pivôs para sprites. |
| [`VisualElementTemplate`](VisualElementTemplate.ts) | Classe Base | Gabarito para novos renderáveis no Canvas 2D / WebGPU herdando de `GameObjectElement`. |
| [`EventBindingBuilder`](EventBindingBuilder.ts) | Builder Fluente | Conexão desacoplada `IEventManager -> UI` com limpeza automática de listeners. |
| [`StorybookGuiBuilder`](StorybookGuiBuilder.ts) | Builder Fluente | Criação padronizada de arquivos `.stories.ts` para testar GUIs no Storybook com 5 linhas. |

---

## 🛠️ Exemplos Práticos de Uso

### 1. Criando uma GUI Simples com `GuiBuilder`

```typescript
import { GuiBuilder } from "./templates/GuiBuilder";

export const meuModal = GuiBuilder.create('meu-modal-alerta')
  .withTemplate(
    `<div class="modal-box">
       <h3>Aviso Importante</h3>
       <button id="btn-ok">Entendido</button>
     </div>`,
    `.modal-box { background: rgba(0,0,0,0.8); color: gold; padding: 20px; }`
  )
  .onButtonClick('#btn-ok', (e, gui) => {
    gui.hide();
  })
  .build();

meuModal.show();
```

---

### 2. Disparando Partículas com `ParticleConfigBuilder`

```typescript
import { ParticleConfigBuilder, ParticleVfxPresets } from "./templates/ParticleConfigBuilder";

// Usando um preset pronto:
ParticleVfxPresets.criticalHitSparks(targetX, targetY, angle).emitOn(sceneManager.particleOrchestrator);

// Ou construindo um efeito customizado:
ParticleConfigBuilder.at(100, 200)
  .count(30)
  .colors('#ff0055', '#ffffff')
  .speed(50, 250)
  .gravity(300)
  .asCircle()
  .emitOn(sceneManager.particleOrchestrator);
```

---

### 3. Criando uma História do Storybook com `StorybookGuiBuilder`

```typescript
import { StorybookGuiBuilder } from '../../templates/StorybookGuiBuilder';
import MeuHudGui from './MeuHudGui';

const builder = StorybookGuiBuilder.forGui('HUD/MeuHud', () => new MeuHudGui())
  .withBackground('#12131a')
  .withContainerSelector('#meu-hud-container')
  .onMount(gui => gui.show());

export default builder.buildMeta();
export const Default = builder.buildDefaultStory();
```

---

### 4. Conectando Eventos do Domínio com `EventBindingBuilder`

```typescript
import { EventBindingBuilder } from "./templates/EventBindingBuilder";

export class MeuModuloUi {
  private binder: EventBindingBuilder;

  constructor(eventManager: IEventManager) {
    this.binder = EventBindingBuilder.for(eventManager)
      .on('playerDied', () => this.mostrarGameOver())
      .on('levelUp', (payload) => this.animarLevelUp(payload.coordinates));
  }

  public destroy(): void {
    this.binder.unbindAll(); // Previne memory leaks!
  }
}
```
