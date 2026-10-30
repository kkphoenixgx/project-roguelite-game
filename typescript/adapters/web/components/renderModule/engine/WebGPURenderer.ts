import { logger } from "../../../shared/Logger";
import type { EntityRenderableState } from "../../../../../domain/ports/domain-contracts";
import type { objectTypeId } from "../../../../../domain/ObjectModule/objectType.type";
import type Canvas from "./Canvas";
import type IRenderer from "./IRenderer";
import type { SpriteConfig } from "../visuals/GameObjectElement";
import type { AnimationManager } from "../visuals/AnimationManager";
import { RenderRegistry } from "../../../shared/RenderRegistry";
import VisualComposer from "../visuals/VisualComposer";
import type Camera from "../scene/Camera";

/**
 * Orquestra o processo de desenho usando a API WebGPU.
 * Esta classe é responsável por inicializar o dispositivo WebGPU,
 * configurar o canvas e executar os comandos de renderização a cada frame.
 */
export default class WebGPURenderer implements IRenderer<EntityRenderableState> {
  public canvas: Canvas;
  private camera: Camera;

  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private presentationFormat!: GPUTextureFormat;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private renderPipeline!: GPURenderPipeline;
  private vertexBuffer!: GPUBuffer;
  private cameraMatrix!: Float32Array;
  private cameraBuffer!: GPUBuffer;

  private instanceBuffer!: GPUBuffer;
  private instanceData!: Float32Array;
  private readonly MAX_INSTANCES = 1000; //? Teto de instâncias por draw call em WebGPU

  private atlasTexture!: GPUTexture;
  private atlasBindGroup!: GPUBindGroup;
  private sampler!: GPUSampler;
  private atlasSize = { width: 0, height: 0 };

  //! Cache memoizado para abolir instâncias efêmeras no GameLoop (Zero-GC)
  private composedLayersCache = new Map<number, { hash: string, layers: { config: SpriteConfig, zIndex: number }[] }>();

  private spriteConfigs: Map<string, SpriteConfig> = RenderRegistry.spriteConfigs;

  constructor(canvas: Canvas, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
  }

  /**
   * Inicializa o ambiente WebGPU de forma assíncrona.
   * @throws {Error} Se a WebGPU não for suportada pelo navegador.
   */
  public async initialize(): Promise<void> {
    logger.log('init', 'Initializing WebGPU Renderer...');

    if (!navigator.gpu) {
      throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found.");
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas.element.getContext('webgpu') as GPUCanvasContext;
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.presentationFormat,
    });
    this.canvasWidth = this.canvas.element.width;
    this.canvasHeight = this.canvas.element.height;

    this.loadSpriteConfigs();

    await this.setupRendering();

    logger.log('init', 'WebGPU Renderer initialized successfully.');
  }

  public clear(): void {
  }

  /**
   * Desenha um único frame.
   * Por enquanto, apenas limpa a tela com uma cor sólida.
   */
  public async drawFrame(domainState: { world: any, renderables: readonly EntityRenderableState[] }, cameraTarget: EntityRenderableState | undefined, animationManagers?: Map<number, AnimationManager>): Promise<void> {
    //? Previne crash fatal do WebGPU quando a janela é minimizada (tamanho 0x0)
    if (this.canvas.element.width === 0 || this.canvas.element.height === 0) return;

    //? Reconfigura o SwapChain após redimensionamento da janela
    if (this.canvas.element.width !== this.canvasWidth || this.canvas.element.height !== this.canvasHeight) {
      this.context.configure({
        device: this.device,
        format: this.presentationFormat,
      });
      this.canvasWidth = this.canvas.element.width;
      this.canvasHeight = this.canvas.element.height;
    }

    const { renderables } = domainState;
    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    this.updateCamera(cameraTarget);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(0, this.atlasBindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);

    if (renderables.length > 0) {
      const instanceCount = this.updateInstanceBuffer(renderables, animationManagers);
      if (instanceCount > 0) passEncoder.draw(6, instanceCount, 0, 0);
    }


    this.device.queue.submit([commandEncoder.finish()]);
  }

  private updateCamera(target: EntityRenderableState | undefined): void {
    const { width, height } = this.canvas.element;
    const zoom = this.camera.zoom;

    const viewWidth = width / zoom;
    const viewHeight = height / zoom;

    const camX = target ? (target.coordinates.x + target.size.width / 2) - viewWidth / 2 : 0;
    const camY = target ? (target.coordinates.y + target.size.height / 2) - viewHeight / 2 : 0;

    const left = camX;
    const right = camX + viewWidth;
    const top = camY;
    const bottom = camY + viewHeight;

    const sx = 2.0 / (right - left);
    const sy = 2.0 / (top - bottom); //? Invertido para convenção de eixos do WebGPU
    const tx = -(right + left) / (right - left);
    const ty = -(top + bottom) / (top - bottom);

    this.cameraMatrix = new Float32Array([
      sx, 0,  0, 0,
      0,  sy, 0, 0,
      0,  0,  1, 0,
      tx, ty, 0, 1,
    ]);

    this.device.queue.writeBuffer(this.cameraBuffer, 0, this.cameraMatrix.buffer);
  }

    private loadSpriteConfigs(): void {
  }

  public getSpriteConfig(type: objectTypeId, state?: string): SpriteConfig | undefined {
    return this.spriteConfigs.get(`${type}-${state}`);
  }

  private updateInstanceBuffer(renderables: readonly EntityRenderableState[], animationManagers?: Map<number, AnimationManager>): number {
    let offset = 0;
    let instanceCount = 0;

    for (const state of renderables) {
      if (instanceCount >= this.MAX_INSTANCES) break;
      
      const currentFrame = animationManagers?.get(state.id)?.currentFrame || 0;
      const baseConfig = this.getSpriteConfig(state.entityTypeId, state.state);
      
    //? Gera hash determinístico baseado no estado visual mutável da entidade
      const equipHash = state.equipment ? Object.values(state.equipment).map((e: any) => e?.iconId).join('-') : '';
      const activeBroochHash = Array.isArray(state.globalActiveLoadout) ? state.globalActiveLoadout.join(',') : '';
      const passiveBroochHash = Array.isArray(state.passiveLoadout) ? state.passiveLoadout.join(',') : '';
      const stateHash = `${state.state || 'idle'}-${equipHash}-${state.hasBeard}-${activeBroochHash}-${passiveBroochHash}`;
      
      let cachedComposition = this.composedLayersCache.get(state.id);
      if (!cachedComposition || cachedComposition.hash !== stateHash) {
          const layers = VisualComposer.extractLayers(state);
          const composed = VisualComposer.compose(layers, this.spriteConfigs, state.state || 'idle');
          cachedComposition = { hash: stateHash, layers: composed };
          this.composedLayersCache.set(state.id, cachedComposition);
      }

      if (cachedComposition.layers.length > 0) {
        for (const layer of cachedComposition.layers) {
          if (instanceCount >= this.MAX_INSTANCES) break;
          this.writeInstanceData(offset, state, layer.config, currentFrame, baseConfig);
          offset += 16;
          instanceCount++;
        }
      } else {
        if (instanceCount >= this.MAX_INSTANCES) break;
        this.writeInstanceData(offset, state, baseConfig, currentFrame, baseConfig);
        offset += 16;
        instanceCount++;
      }
    }
    
    if (instanceCount > 0) {
      this.device.queue.writeBuffer(this.instanceBuffer, 0, this.instanceData.buffer, 0, offset * 4);
    }
    return instanceCount;
  }

  private writeInstanceData(offset: number, state: any, config: SpriteConfig | undefined, currentFrame: number, baseConfig: SpriteConfig | undefined) {
    const bFrameW = baseConfig?.frameWidth || 32;
    const bFrameH = baseConfig?.frameHeight || 32;
    
    const scaleX = state.size.width / bFrameW;
    const scaleY = state.size.height / bFrameH;

    const rawOffset = config?.renderOffset;
    const currentOffset = (Array.isArray(rawOffset) ? rawOffset[currentFrame % rawOffset.length] : rawOffset) || { x: 0, y: 0 };

    const logicalW = config?.renderSize?.width || config?.frameWidth || state.size.width;
    const logicalH = config?.renderSize?.height || config?.frameHeight || state.size.height;

    const destX = state.coordinates.x + currentOffset.x * scaleX;
    const destY = state.coordinates.y + currentOffset.y * scaleY;
    const destWidth = logicalW * scaleX;
    const destHeight = logicalH * scaleY;

    this.instanceData[offset] = destX;
    this.instanceData[offset + 1] = destY;
    this.instanceData[offset + 2] = destWidth;
    this.instanceData[offset + 3] = destHeight;
    this.instanceData[offset + 4] = state.rotation + (config?.rotationOffset ?? 0);

    let anchorX = 0.0;
    let anchorY = 0.0;
    if (config?.anchor) {
        switch(config.anchor) {
            case 'top-left': anchorX = -0.5; anchorY = -0.5; break;
            case 'top-right': anchorX = 0.5; anchorY = -0.5; break;
            case 'bottom-left': anchorX = -0.5; anchorY = 0.5; break;
            case 'bottom-right': anchorX = 0.5; anchorY = 0.5; break;
            case 'center-left': anchorX = -0.5; anchorY = 0.0; break;
            case 'center-right': anchorX = 0.5; anchorY = 0.0; break;
            case 'top-center': anchorX = 0.0; anchorY = -0.5; break;
            case 'bottom-center': anchorX = 0.0; anchorY = 0.5; break;
        }
    }
    this.instanceData[offset + 5] = anchorX;
    this.instanceData[offset + 6] = anchorY;
    
    this.instanceData[offset + 8] = currentFrame % (config?.frameCount ?? 1);
    this.instanceData[offset + 9] = config?.frameCount ?? 1;
    this.instanceData[offset + 10] = config?.atlasOffset?.x ?? 0;
    this.instanceData[offset + 11] = config?.atlasOffset?.y ?? 0;
    this.instanceData[offset + 12] = config?.spriteSize?.width ?? destWidth;
    this.instanceData[offset + 13] = config?.spriteSize?.height ?? destHeight;
  }

  private async setupRendering(): Promise<void> {
    const vertices = new Float32Array([
      /* Triângulo 1 (Posição | UV) */
      -0.5,  0.5, 0, 0,
      -0.5, -0.5, 0, 1,
       0.5, -0.5, 1, 1,
      /* Triângulo 2 (Posição | UV) */
      -0.5,  0.5, 0, 0,
       0.5, -0.5, 1, 1,
       0.5,  0.5, 1, 0,
    ]);

    this.vertexBuffer = this.device.createBuffer({
      label: 'Quad Vertex Buffer',
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);

    //! Buffer de instâncias: Inst(pos,scale,rot)(8) + Anim(idx,count,offset,size)(8) = 16 floats
    const INSTANCE_SIZE_IN_FLOATS = 8 + 8;
    this.instanceData = new Float32Array(this.MAX_INSTANCES * INSTANCE_SIZE_IN_FLOATS);
    this.instanceBuffer = this.device.createBuffer({
        label: "Instance Data Buffer",
        size: this.instanceData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.cameraBuffer = this.device.createBuffer({
      label: "Camera Uniform Buffer",
      size: 16 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = this.device.createShaderModule({
      label: 'Simple Quad Shader',
      code: `
        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) tex_coords: vec2<f32>,
        }

        struct Instance {
          pos: vec2<f32>,
          scale: vec2<f32>,
          rot: f32,
          anchor_x: f32,
          anchor_y: f32,
          pad1: f32, //? WGSL Padding Explícito para alinhamento em 32 bytes
          anim_data: vec2<f32>,
          atlas_offset: vec2<f32>,
          sprite_size: vec2<f32>,
          pad2: vec2<f32>, //? Padding explícito para manter tamanho de 64 bytes (16 floats)
        };

        @group(0) @binding(0) var mySampler: sampler;
        @group(0) @binding(1) var myTexture: texture_2d<f32>;
        @group(0) @binding(2) var<storage, read> instances: array<Instance>;

        @group(0) @binding(3) var<uniform> camera: mat4x4<f32>;
        @group(0) @binding(4) var<uniform> atlas_size: vec2<f32>;

        @vertex
        fn vs_main(
          @builtin(instance_index) instance_idx: u32,
          @location(0) pos: vec2<f32>, 
          @location(1) uv: vec2<f32>
        ) -> VertexOutput {
          var output: VertexOutput;
          let instance = instances[instance_idx];

          let cos_rot = cos(instance.rot);
          let sin_rot = sin(instance.rot);
          let rot_matrix = mat2x2<f32>(cos_rot, -sin_rot, sin_rot, cos_rot);
          
          let canvas_anchor_offset = vec2<f32>(instance.anchor_x, instance.anchor_y);
          let pivot_world = instance.pos + (instance.scale / 2.0) + (canvas_anchor_offset * instance.scale);
          
          let wgsl_anchor_offset = vec2<f32>(instance.anchor_x, -instance.anchor_y);
          let pos_relative = pos - wgsl_anchor_offset;
          let rotated_pos = rot_matrix * (pos_relative * instance.scale);

            //? Inversão do eixo Y no cálculo de pivô para compatibilizar espaço de tela com coordenadas WGSL
          var transformed_pos = pivot_world + vec2<f32>(rotated_pos.x, -rotated_pos.y);

          let frame_index = floor(instance.anim_data.x);
          let total_frames = instance.anim_data.y;
          
          let sprite_uv_size = instance.sprite_size / atlas_size;
          let frame_uv_size = vec2<f32>(sprite_uv_size.x / total_frames, sprite_uv_size.y);
          
          let uv_offset = vec2<f32>(instance.atlas_offset.x / atlas_size.x, instance.atlas_offset.y / atlas_size.y);
          output.tex_coords = (uv * frame_uv_size) + uv_offset + vec2<f32>(frame_index * frame_uv_size.x, 0.0);

          output.position = camera * vec4<f32>(transformed_pos, 0.0, 1.0);
          return output;
        }

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
          return textureSample(myTexture, mySampler, input.tex_coords);
        }
      `,
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Simple Quad Pipeline',
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 4 * 4, //? 4 floats (X, Y, U, V) com 4 bytes cada
            attributes: [{
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            }, {
              shaderLocation: 1,
              offset: 2 * 4,
              format: 'float32x2',
            }],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.presentationFormat }],
      },
    });

    this.sampler = this.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
    });

    const atlasUrl = new URL('../../assets/maps/map.jpeg', import.meta.url).href;
    const response = await fetch(atlasUrl);
    const imageBitmap = await createImageBitmap(await response.blob());

    this.atlasSize = { width: imageBitmap.width, height: imageBitmap.height };

    this.atlasTexture = this.device.createTexture({
      size: [this.atlasSize.width, this.atlasSize.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: this.atlasTexture }, [this.atlasSize.width, this.atlasSize.height]);

    const atlasSizeBuffer = this.device.createBuffer({
      size: 2 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(atlasSizeBuffer, 0, new Float32Array([this.atlasSize.width, this.atlasSize.height]));

    this.atlasBindGroup = this.device.createBindGroup({
      label: `Atlas Bind Group`,
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.atlasTexture.createView() },
        { binding: 2, resource: { buffer: this.instanceBuffer } },
        { binding: 3, resource: { buffer: this.cameraBuffer } },
        { binding: 4, resource: { buffer: atlasSizeBuffer } },
      ],
    });
  }
}