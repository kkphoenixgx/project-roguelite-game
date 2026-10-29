/**
 * @file SkillTreeBranchExclusivityRegression.test.ts
 * Suíte de Regressão Guiada por Personas para Exclusividade de Ramos de Habilidade.
 * 
 * Regra do Jogo:
 * Em uma bifurcação (fork), a escolha de um ramo exclui permanentemente o ramo oposto.
 * A Persona Veterano entende essa regra e planeja sua build linearmente.
 * A Persona Explorador tenta contornar a regra comprando habilidades do ramo oposto.
 * O teste de regressão assegura que o Domínio bloqueia a tentativa de forma determinística.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Skill from '../../domain/Skills/Skill';
import SkillBranchManager from '../../domain/Skills/SkillBranchManager';

describe('Regressão: Exclusividade Mútua de Ramos na Árvore de Habilidades', () => {

    let rootSkill: Skill;
    let branchA1: Skill;
    let branchA2: Skill;
    let branchB1: Skill;
    let branchB2: Skill;
    let allSkills: Skill[];

    beforeEach(() => {
        // Árvore com Fork em root:
        // root -> branchA1 -> branchA2
        // root -> branchB1 -> branchB2
        // Assinatura correta de Skill: (id, name, description, type, tier, requiredSkillId?, effect?, keybind?, dependencies?)
        rootSkill = new Skill('skill_root', 'Raiz', 'Habilidade Base', 'active', 1);
        branchA1 = new Skill('skill_a1', 'Ramo Fogo 1', 'Dano de Fogo', 'active', 2, 'skill_root');
        branchA2 = new Skill('skill_a2', 'Ramo Fogo 2', 'Mestre do Fogo', 'passive', 3, 'skill_a1');
        branchB1 = new Skill('skill_b1', 'Ramo Gelo 1', 'Congelamento', 'active', 2, 'skill_root');
        branchB2 = new Skill('skill_b2', 'Ramo Gelo 2', 'Nevasca', 'active', 3, 'skill_b1');

        allSkills = [rootSkill, branchA1, branchA2, branchB1, branchB2];
    });

    it('REGRESSÃO: Escolha do Ramo A (Fogo) deve bloquear imediatamente o Ramo B (Gelo)', () => {
        const unlockedSkills = new Set<string>(['skill_root', 'skill_a1']);

        // Habilidade A2 ainda pode ser desbloqueada pois pertence ao mesmo ramo
        const isA2Blocked = SkillBranchManager.isSkillBlockedByBranchSelection('skill_a2', allSkills, unlockedSkills);
        expect(isA2Blocked).toBe(false);

        // Habilidades B1 e B2 DEVEM estar bloqueadas pela seleção do Ramo A
        const isB1Blocked = SkillBranchManager.isSkillBlockedByBranchSelection('skill_b1', allSkills, unlockedSkills);
        const isB2Blocked = SkillBranchManager.isSkillBlockedByBranchSelection('skill_b2', allSkills, unlockedSkills);

        expect(isB1Blocked).toBe(true);
        expect(isB2Blocked).toBe(true);
    });

    it('REGRESSÃO: Explorador não consegue desbloquear nó profundo B2 mesmo se forçar requisição', () => {
        // Simula tentativa de exploit onde o jogador já tem o Ramo A completo
        const unlockedSkills = new Set<string>(['skill_root', 'skill_a1', 'skill_a2']);

        // Tentativa de compra direta de B2 sem pré-requisito e em ramo bloqueado
        const isB2Blocked = SkillBranchManager.isSkillBlockedByBranchSelection('skill_b2', allSkills, unlockedSkills);
        expect(isB2Blocked).toBe(true);
    });

    it('REGRESSÃO: Desbloquear apenas a Raiz (sem escolher ramos) não bloqueia nenhum ramo irmão', () => {
        const unlockedSkills = new Set<string>(['skill_root']);

        // Ambos os ramos devem estar disponíveis para escolha
        expect(SkillBranchManager.isSkillBlockedByBranchSelection('skill_a1', allSkills, unlockedSkills)).toBe(false);
        expect(SkillBranchManager.isSkillBlockedByBranchSelection('skill_b1', allSkills, unlockedSkills)).toBe(false);
    });
});
