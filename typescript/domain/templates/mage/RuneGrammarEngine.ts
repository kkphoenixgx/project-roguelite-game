import type { action } from "../../eventDispacher/actions.type";


export type RuneKind = 'form' | 'force' | 'element';

export interface RuneDefinition {
  readonly action: string;
  readonly kind: RuneKind;
  readonly name: string;
}

export interface ParsedRuneGrammar {
  readonly forms: readonly string[];
  readonly forces: readonly string[];
  readonly rawElements: readonly string[];
  readonly elements: readonly string[];
  readonly runeCount: number;
  readonly sequence: string;
}

/**
 * ==============================================================================
 * MOTOR DE GRAMÁTICA RÚNICA (Rune Grammar Engine)
 * ==============================================================================
 * Responsável por:
 * 1. Mapear ações de input de feitiço (ex: spell_0..spell_9) para Formas, Forças e Elementos.
 * 2. Realizar a fusão sintática de elementos adjacentes (Deep-2 Fusion Engine).
 * 3. Gerar a estrutura de feitiço analisada (ParsedRuneGrammar) de forma determinística e desacoplada.
 * ==============================================================================
 */
export class RuneGrammarEngine {
  private readonly runes = new Map<string, RuneDefinition>();
  private readonly fusionCombos = new Map<string, string>();

  /**
   * Registra uma nova runa vinculada a uma ação de input.
   */
  public registerRune(action: string, kind: RuneKind, name: string): this {
    this.runes.set(action, { action, kind, name });
    return this;
  }

  /**
   * Registra uma fusão de dois elementos.
   * Se symmetric for true, registra el1+el2 e el2+el1.
   */
  public registerFusion(el1: string, el2: string, result: string, symmetric: boolean = false): this {
    this.fusionCombos.set(`${el1},${el2}`, result);
    if (symmetric) {
      this.fusionCombos.set(`${el2},${el1}`, result);
    }
    return this;
  }

  /**
   * Analisa um buffer de ações rúnicas e produz uma gramática estruturada.
   */
  public parse(buffer: readonly (action | string)[]): ParsedRuneGrammar {
    const forms: string[] = [];
    const forces: string[] = [];
    const rawElements: string[] = [];

    const len = buffer.length;
    for (let i = 0; i < len; i++) {
      const act = buffer[i]!;
      const rune = this.runes.get(act);
      if (!rune) continue;

      switch (rune.kind) {
        case 'form':
          forms.push(rune.name);
          break;
        case 'force':
          forces.push(rune.name);
          break;
        case 'element':
          rawElements.push(rune.name);
          break;
      }
    }

      //? Fusão adjacente canônica Deep-2 entre glifos sequenciais
    let currentElements: string[] = [...rawElements];
    let fused = true;
    while (fused && currentElements.length > 1) {
      fused = false;
      const nextRound: string[] = [];
      const lenElements = currentElements.length;
      for (let i = 0; i < lenElements; i++) {
        const curr = currentElements[i]!;
        if (i < lenElements - 1) {
          const next = currentElements[i + 1]!;
          const pair = `${curr},${next}`;
          const combo = this.fusionCombos.get(pair);
          if (combo) {
            nextRound.push(combo);
            fused = true;
            i++; //? Avança o cursor consumindo a segunda runa da fusão
            continue;
          }
        }
        nextRound.push(curr);
      }
      currentElements = nextRound;
    }
    const elements: string[] = currentElements;

    return {
      forms,
      forces,
      rawElements,
      elements,
      runeCount: len,
      sequence: buffer.join(',')
    };
  }

  /**
   * Cria o motor pré-configurado com as runas canônicas do Axiomante / Mago.
   */
  public static createDefault(): RuneGrammarEngine {
    const engine = new RuneGrammarEngine();

    engine.registerRune('spell_0', 'form', 'projectile');
    engine.registerRune('spell_1', 'form', 'self');

    engine.registerRune('spell_2', 'force', 'knockback');
    engine.registerRune('spell_3', 'force', 'pull');

    engine.registerRune('spell_4', 'element', 'fire');
    engine.registerRune('spell_5', 'element', 'water');
    engine.registerRune('spell_6', 'element', 'ground');
    engine.registerRune('spell_7', 'element', 'dark');
    engine.registerRune('spell_8', 'element', 'light');
    engine.registerRune('spell_9', 'element', 'magic');

    //? Matriz de Fusão Elemental Canônica (Deep-2) entre elementos primários
    const combos: [string, string, string][] = [
      ['magic', 'fire', 'potencia'],
      ['magic', 'water', 'ice'],
      ['magic', 'ground', 'life'],
      ['magic', 'dark', 'caos'],
      ['magic', 'light', 'ordem'],
      ['fire', 'water', 'air'],
      ['fire', 'ground', 'magma'],
      ['fire', 'dark', 'infernous'],
      ['fire', 'light', 'thunder'],
      ['water', 'ground', 'nature'],
      ['water', 'dark', 'abys'],
      ['water', 'light', 'holy'],
      ['ground', 'dark', 'decay'],
      ['ground', 'light', 'crystal'],
    //? Regra axiomática de anulação/dispel mágico via runa de negação
      ['ordem', 'caos', 'negation'],
      ['caos', 'ordem', 'negation'],
      ['ordem', 'dark', 'negation'],
      ['dark', 'ordem', 'negation']
    ];

    for (const [el1, el2, res] of combos) {
      engine.registerFusion(el1, el2, res);
    }

    return engine;
  }
}

export default RuneGrammarEngine;
