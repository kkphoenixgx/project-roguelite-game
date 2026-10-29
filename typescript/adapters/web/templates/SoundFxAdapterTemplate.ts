export type AudioChannel = 'master' | 'sfx' | 'music' | 'ui';

export interface SoundFxConfig {
  channel?: AudioChannel;
  volume?: number;
  pitchVariation?: number;
  loop?: boolean;
}

/**
 * ==============================================================================
 * ADAPTADOR CANÔNICO DE ÁUDIO E SOUND FX (SoundFxAdapterTemplate)
 * ==============================================================================
 * Encapsula o Web Audio API, gerenciando canais de volume (Master, SFX, UI, Música),
 * variação sutil de pitch para evitar monotonia sonora e pooling limpo.
 * ==============================================================================
 */
export class SoundFxAdapterTemplate {
  private static instance: SoundFxAdapterTemplate | null = null;
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private channelVolumes: Record<AudioChannel, number> = {
    master: 0.8,
    sfx: 1.0,
    ui: 0.9,
    music: 0.6
  };

  private constructor() {
    this.loadPersistedVolumes();
  }

  public static getInstance(): SoundFxAdapterTemplate {
    if (!SoundFxAdapterTemplate.instance) {
      SoundFxAdapterTemplate.instance = new SoundFxAdapterTemplate();
    }
    return SoundFxAdapterTemplate.instance;
  }

  private initContext(): void {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private loadPersistedVolumes(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('rpg_audio_settings');
      if (raw) {
        this.channelVolumes = { ...this.channelVolumes, ...JSON.parse(raw) };
      }
    } catch (e) {}
  }

  public setVolume(channel: AudioChannel, value: number): void {
    this.channelVolumes[channel] = Math.max(0, Math.min(1, value));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rpg_audio_settings', JSON.stringify(this.channelVolumes));
    }
  }

  public getVolume(channel: AudioChannel): number {
    return this.channelVolumes[channel];
  }

  /**
   * Toca um efeito sonoro pré-carregado com variação orgânica de pitch (pitch shift).
   */
  public play(soundId: string, options: SoundFxConfig = {}): void {
    this.initContext();
    if (!this.audioContext) return;

    const buffer = this.audioBuffers.get(soundId);
    if (!buffer) return;

    const channel = options.channel ?? 'sfx';
    const finalVolume = this.channelVolumes.master * this.channelVolumes[channel] * (options.volume ?? 1.0);
    if (finalVolume <= 0.001) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(options.loop);

    //? Variação microtonal de pitch (semitons) para evitar monotonia acústica em disparos repetitivos
    if (options.pitchVariation) {
      const semitone = (Math.random() - 0.5) * 2 * options.pitchVariation;
      source.playbackRate.value = Math.pow(2, semitone / 12);
    }

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = finalVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  /**
   * Registra um buffer de áudio na memória para disparo instantâneo (zero lag).
   */
  public registerBuffer(soundId: string, buffer: AudioBuffer): void {
    this.audioBuffers.set(soundId, buffer);
  }
}

export default SoundFxAdapterTemplate;
