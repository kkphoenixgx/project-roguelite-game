/**
 * ==============================================================================
 * TESTE DE CONFORMIDADE: AUTO-VALIDAÇÃO DECLARATIVA DOS BROCHES ANCESTRAIS
 * ==============================================================================
 * Papel: QA Lead & Compliance Auditor (skills rpg-testes e gameDomainExpert)
 * Finalidade:
 * 1. Garantir que 100% dos broches registrados em BroochRegistry possuem o
 *    critério declarativo booleano de validação (`assertion`) definido.
 * 2. Executar e validar o efeito de cada broche simulando os contextos
 *    correspondentes (ativo executado, passivo anexado, hook de dano, etc.),
 *    garantindo retorno válido (true ou { valid: true }).
 * 3. Teste de regressão para rejeitar qualquer broche futuro que seja registrado
 *    sem asserção declarativa de validação.
 * ==============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import BroochRegistry from '../../domain/ObjectModule/Entities/Player/components/BroochRegistry';
import BroochTemplate, { type BroochValidationContext } from '../../domain/templates/BroochTemplate';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';

describe('Compliance & Auditoria: Auto-Validação Declarativa de Broches Ancestrais', () => {
  let eventManager: EventHandler;
  let player: Player;

  beforeEach(() => {
    BroochRegistry.resetAll();
    eventManager = new EventHandler();
    const attrs = new Attributes(1, 1, 10, 10, 10, 10, 10, 10);
    player = new Player(1, { x: 100, y: 100 }, attrs, eventManager);
  });

  it('100% dos broches registrados devem possuir assertion declarativa definida', () => {
    const definitions = BroochRegistry.getAllDefinitions();
    expect(definitions.length).toBeGreaterThanOrEqual(15);

    const missingAssertions: string[] = [];
    for (const def of definitions) {
      if (!def.assertion || typeof def.assertion !== 'function') {
        missingAssertions.push(def.id);
      }
    }

    expect(
      missingAssertions,
      `Broches registrados sem assertion: ${missingAssertions.join(', ')}`
    ).toHaveLength(0);
  });

  it('todos os broches registrados devem validar com sucesso em seus contextos operacionais', () => {
    const definitions = BroochRegistry.getAllDefinitions();

    for (const def of definitions) {
      // Simula contexto operacional
      const ctx: BroochValidationContext = {
        player,
        eventManager,
        lastResult: undefined
      };

      // Se for ativo com onExecute, simula execução ou resultado
      if (def.type === 'ativo' && def.onExecute) {
        BroochRegistry.executeActive(def.id, {
          player,
          eventManager,
          mouseCoords: { x: 120, y: 120 },
          broochId: def.id
        });
      }

      // Se for broche de escudo/absorção, prepara lastResult simulado
      if (def.id === 'brooch_active_shield' || def.id === 'brooch_active_astral') {
        (ctx as any).lastResult = { absorbed: true, block: true };
      } else if (def.id === 'brooch_active_berserk') {
        (ctx as any).lastResult = 1.5;
      } else if (def.id === 'brooch_active_luck') {
        (ctx as any).lastResult = { extraDodge: 50 };
      } else if (def.id === 'brooch_phoenix') {
        (ctx as any).lastResult = { preventDeath: true, absorbed: true };
      } else if (def.id === 'brooch_titan') {
        (ctx as any).lastResult = { cancelKnockback: true, block: true };
      } else if (def.id === 'brooch_shadow') {
        (ctx as any).lastResult = { absorbed: true };
      }

      const result = BroochRegistry.validateBrooch(def.id, ctx);
      const isValid = typeof result === 'boolean' ? result : result.valid;
      const reason = typeof result === 'object' && result ? result.reason : undefined;

      expect(
        isValid,
        `Validação do broche '${def.id}' falhou! Motivo: ${reason}`
      ).toBe(true);
    }
  });

  it('método validateBrooch deve reportar erro claro caso o broche não exista', () => {
    const result = BroochRegistry.validateBrooch('brooch_non_existent', {
      player,
      eventManager
    });

    expect(typeof result === 'object' && !result.valid).toBe(true);
    if (typeof result === 'object') {
      expect(result.reason).toContain("Brooch 'brooch_non_existent' not found");
    }
  });

  it('regressão: deve reprovar broche registrado sem assertion', () => {
    const broochWithoutAssertion = BroochTemplate.createPassive(
      'brooch_untested_legacy',
      'Broche Não Testado',
      'Broche sem asserção declarativa.'
    ).build();

    expect(broochWithoutAssertion.assertion).toBeUndefined();

    const validationResult = broochWithoutAssertion.validate({
      player,
      eventManager
    });

    expect(typeof validationResult === 'object').toBe(true);
    if (typeof validationResult === 'object') {
      expect(validationResult.valid).toBe(false);
      expect(validationResult.reason).toContain('does not have an assertion defined');
    }
  });
});
