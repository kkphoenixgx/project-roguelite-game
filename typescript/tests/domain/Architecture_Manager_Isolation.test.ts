import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Fitness Function: Arquitetura Hexagonal e Isolamento do Manager', () => {
    it('ObjectElementManager NÃO DEVE importar classes concretas de Entidades (Fan-out deve ser 0 para Entities)', () => {
        const managerPath = path.resolve(__dirname, '../../domain/ObjectModule/ObjectElementManager.ts');
        const content = fs.readFileSync(managerPath, 'utf-8');

        // Verifica se há importações diretas das pastas de inimigos ou projéteis
        const hasEnemyImport = /import.*from\s+['"]\.\/Entities\/Enemies\/.*['"]/.test(content);
        const hasProjectileImport = /import.*from\s+['"]\.\/Entities\/projectiles\/.*['"]/.test(content);
        
        // O Manager não pode instanciar as entidades soltas manualmente via 'new', ele deve usar o Factory/SpawnRegistry
        const hasConcreteInstantiations = /new\s+(Slime|ShadowMob|SimpleBullet|EnvironmentCollider)\(/.test(content);

        expect(hasEnemyImport, "VIOLAÇÃO ARQUITETURAL: O Manager está importando inimigos diretamente.").toBe(false);
        expect(hasProjectileImport, "VIOLAÇÃO ARQUITETURAL: O Manager está importando projéteis diretamente.").toBe(false);
        expect(hasConcreteInstantiations, "VIOLAÇÃO ARQUITETURAL: O Manager possui instanciação explícita (new Entidade) de objetos que deveriam ser carregados via Factory.").toBe(false);
    });
});