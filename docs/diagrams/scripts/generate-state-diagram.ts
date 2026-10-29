/**
 * @file generate-state-diagram.ts
 * Utilitário desacoplado em docs/diagrams/scripts/ que gera diagramas de estado
 * Mermaid (@xstate/graph) de máquinas de estado formais do projeto.
 */

import { createMachine } from 'xstate';

/**
 * 1. Ciclo de Vida do Jogador (Spawn, Combate, Cooldowns, Morte, Transição)
 */
export const playerStateMachine = createMachine({
  id: 'playerState',
  initial: 'Spawning',
  states: {
    Spawning: {
      on: {
        SPAWN_COMPLETE: 'Idle'
      }
    },
    Idle: {
      on: {
        MOVE: 'Moving',
        ATTACK: 'Attacking',
        ROLL_DODGE: 'Dodging',
        INTERACT_PORTAL: 'Teleporting',
        TAKE_DAMAGE: 'Hurt'
      }
    },
    Moving: {
      on: {
        STOP: 'Idle',
        ATTACK: 'Attacking',
        ROLL_DODGE: 'Dodging',
        INTERACT_PORTAL: 'Teleporting',
        TAKE_DAMAGE: 'Hurt'
      }
    },
    Attacking: {
      on: {
        ANIMATION_FINISH: 'Idle',
        COMBO_CHAIN: 'Attacking',
        TAKE_DAMAGE: 'Hurt'
      }
    },
    Dodging: {
      on: {
        DODGE_COMPLETE: 'Idle'
      }
    },
    Hurt: {
      on: {
        HP_ZERO: 'Dead',
        RECOVER: 'Idle'
      }
    },
    Teleporting: {
      on: {
        TRANSITION_COMPLETE: 'Idle'
      }
    },
    Dead: {
      type: 'final'
    }
  }
});

/**
 * 2. Ciclo de Vida do Mutante no Stryker
 */
export const mutantLifeCycleMachine = createMachine({
  id: 'mutantLifecycle',
  initial: 'Candidate',
  states: {
    Candidate: {
      on: {
        INSTRUMENT: 'Instrumented',
        IGNORE_STATIC: 'IgnoredStatic'
      }
    },
    IgnoredStatic: {
      type: 'final'
    },
    Instrumented: {
      on: {
        SCHEDULE_WORKER: 'Testing'
      }
    },
    Testing: {
      on: {
        TEST_FAILED: 'Killed',
        TEST_PASSED: 'Survived',
        TIMEOUT_EXCEEDED: 'TimedOut'
      }
    },
    Killed: {
      type: 'final'
    },
    Survived: {
      type: 'final'
    },
    TimedOut: {
      type: 'final'
    }
  }
});

/**
 * 3. Transição de Portais & InnerMaps
 */
export const portalTransitionMachine = createMachine({
  id: 'portalTransition',
  initial: 'IdleInMap',
  states: {
    IdleInMap: {
      on: {
        COLLIDE_DIRECT_PORTAL: 'TriggeringDirectTransition',
        COLLIDE_REQUEST_PORTAL: 'AwaitingInteractionInput'
      }
    },
    AwaitingInteractionInput: {
      on: {
        LEAVE_PORTAL_AREA: 'IdleInMap',
        PRESS_E: 'TriggeringInteractiveTransition'
      }
    },
    TriggeringDirectTransition: {
      on: {
        DISPATCH_MAP_TRANSITION: 'Teleporting'
      }
    },
    TriggeringInteractiveTransition: {
      on: {
        DISPATCH_MAP_TRANSITION: 'Teleporting'
      }
    },
    Teleporting: {
      on: {
        MAP_LOADED: 'ActiveCooldown'
      }
    },
    ActiveCooldown: {
      on: {
        COOLDOWN_EXPIRED: 'IdleInMap'
      }
    }
  }
});

/**
 * 4. Máquina de Estados da Árvore de Habilidades & Bifurcação
 */
export const skillTreeStateMachine = createMachine({
  id: 'skillTreeBranching',
  initial: 'StemAvailable',
  states: {
    StemAvailable: {
      on: {
        UNLOCK_ROOT_SKILL: 'BaseUnlocked'
      }
    },
    BaseUnlocked: {
      on: {
        SELECT_BRANCH_A: 'BranchAChosen',
        SELECT_BRANCH_B: 'BranchBChosen'
      }
    },
    BranchAChosen: {
      on: {
        UNLOCK_TIER2_A: 'BranchAChosen',
        UNLOCK_CAPSTONE_A: 'BranchAChosen'
      }
    },
    BranchBChosen: {
      on: {
        UNLOCK_TIER2_B: 'BranchBChosen',
        UNLOCK_CAPSTONE_B: 'BranchBChosen'
      }
    }
  }
});

/**
 * 5. Ciclo de Vida da GUI (Modais e Menus)
 */
export const guiLifecycleMachine = createMachine({
  id: 'guiLifecycle',
  initial: 'Hidden',
  states: {
    Hidden: {
      on: {
        OPEN_TRIGGERED: 'Opening'
      }
    },
    Opening: {
      on: {
        DOM_INJECTED: 'Visible'
      }
    },
    Visible: {
      on: {
        PRESS_ESCAPE: 'Closing',
        CLICK_BACKDROP: 'Closing',
        CONFIRM_ACTION: 'Closing',
        CANCEL_ACTION: 'Closing'
      }
    },
    Closing: {
      on: {
        ANIMATION_END: 'Hidden',
        DESTROY: 'Destroyed'
      }
    },
    Destroyed: {
      type: 'final'
    }
  }
});

/**
 * Converte máquina XState em Mermaid stateDiagram-v2
 */
export function exportMachineToMermaid(machine: any): string {
  const lines: string[] = ['stateDiagram-v2'];
  const rootStates = machine.config.states || {};
  const initialState = machine.config.initial;

  if (initialState) {
    lines.push(`    [*] --> ${initialState}`);
  }

  for (const [stateName, stateConfig] of Object.entries<any>(rootStates)) {
    if (stateConfig.type === 'final') {
      lines.push(`    ${stateName} --> [*]`);
    }

    if (stateConfig.on) {
      for (const [event, target] of Object.entries<any>(stateConfig.on)) {
        const targetState = typeof target === 'string' ? target : target.target;
        lines.push(`    ${stateName} --> ${targetState}: ${event}`);
      }
    }
  }

  return lines.join('\n');
}
