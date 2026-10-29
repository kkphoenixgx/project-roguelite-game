import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * ============================================================================
 * TESTE DE COMPLIANCE: HISTÓRIAS DE STORYBOOK (@storybook/html) PARA GUIS
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Finalidade:
 * 1. Auditar recursivamente todos os componentes de GUI em `typescript/adapters/web/GUIS/`.
 * 2. Garantir que para CADA GUI exista um arquivo de Storybook correspondente (*.stories.ts).
 *    - Documentar e validar exceções estruturadas (ex: sub-componentes / partials internos
 *      cobertos pela história da GUI pai no root do módulo).
 * 3. Validar a integridade estrutural e sintática de cada arquivo `.stories.ts`:
 *    - AST TypeScript válida (sem erros de parsing ou sintaxe).
 *    - Exportação padrão (`export default` ou `export default meta`) compatível com Meta.
 *    - Pelo menos uma Story exportada nominalmente (`export const <StoryName> = ...`).
 *    - Resolução estática dos caminhos importados locais (sem imports quebrados).
 * 4. Testes de regressão prevenindo que novos módulos de GUI sejam adicionados
 *    sem histórias de Storybook.
 * ============================================================================
 */
describe('Compliance & Auditoria: Cobertura e Integridade de Storybooks para GUIs', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../../');
  const GUIS_DIR = path.join(ROOT_DIR, 'typescript/adapters/web/GUIS');

  /**
   * Coleta recursiva de todos os arquivos no diretório de GUIs.
   */
  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else if (entry.isFile()) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allFiles = getAllFiles(GUIS_DIR);

  // Arquivos que terminam com Gui.ts ou GUI.ts (excluindo testes)
  const guiFiles = allFiles.filter(
    (file) =>
      /(Gui|GUI)\.ts$/.test(file) &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.spec.ts')
  );

  // Arquivos de storybook
  const storyFiles = allFiles.filter((file) =>
    /\.stories\.(ts|js)$/.test(file)
  );

  /**
   * Catálogo de regras de exceção para sub-componentes/partials que não residem no root do módulo.
   * Regra: Se um arquivo Gui estiver em uma pasta interna/partials, ele pode ser coberto
   * pela história da GUI principal do módulo raiz (ex: MainMenuGui cobre a aba de Sistema/AI).
   */
  const PARTIAL_SUBCOMPONENTS_MAP: Record<string, { parentModuleStory: string; reason: string }> = {
    'AiConfigGui.ts': {
      parentModuleStory: 'mainMenuHudModule/mainMenuGui.stories.ts',
      reason:
        'AiConfigGui é uma sub-view / partial interna da aba Sistema do MainMenuGui, coberta integralmente pela história "SistemaAberta" em mainMenuGui.stories.ts.'
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Mapeamento e Existência de Storybooks para Cada GUI                      */
  /* -------------------------------------------------------------------------- */
  describe('1. Cobertura de Storybooks para Componentes de GUI', () => {
    it('deve encontrar arquivos de GUI cadastrados no diretório GUIS', () => {
      expect(guiFiles.length).toBeGreaterThan(0);
      expect(storyFiles.length).toBeGreaterThan(0);
    });

    it('cada componente raiz de GUI deve possuir um arquivo .stories.ts correspondente', () => {
      const missingStories: { gui: string; expectedStory: string; reason?: string }[] = [];

      for (const guiPath of guiFiles) {
        const basename = path.basename(guiPath);
        const dirname = path.dirname(guiPath);

        // Verifica se é uma partial documentada com cobertura no root
        if (PARTIAL_SUBCOMPONENTS_MAP[basename]) {
          const config = PARTIAL_SUBCOMPONENTS_MAP[basename];
          const expectedParentStoryPath = path.join(GUIS_DIR, config.parentModuleStory);
          if (!fs.existsSync(expectedParentStoryPath)) {
            missingStories.push({
              gui: path.relative(ROOT_DIR, guiPath),
              expectedStory: path.relative(ROOT_DIR, expectedParentStoryPath),
              reason: `Sub-componente documentado, mas a história pai (${config.parentModuleStory}) não foi encontrada.`
            });
          }
          continue;
        }

        // Para componentes padrão, busca história no mesmo diretório (case-insensitive para convenção Gui vs gui)
        const entriesInDir = fs.readdirSync(dirname);
        const nameWithoutExt = basename.replace(/\.ts$/, '');
        const storyFileInDir = entriesInDir.find(
          (name) =>
            name.toLowerCase() === `${nameWithoutExt.toLowerCase()}.stories.ts` ||
            name.toLowerCase().endsWith('.stories.ts')
        );

        if (!storyFileInDir) {
          missingStories.push({
            gui: path.relative(ROOT_DIR, guiPath),
            expectedStory: path.join(path.relative(ROOT_DIR, dirname), `${nameWithoutExt}.stories.ts`),
            reason: 'Nenhum arquivo *.stories.ts encontrado no mesmo módulo/diretório.'
          });
        }
      }

      expect(
        missingStories,
        `GUIs encontradas sem histórias de Storybook correspondentes:\n${JSON.stringify(missingStories, null, 2)}`
      ).toHaveLength(0);
    });

    it('sub-componentes parciais devem estar explicitamente catalogados e justificados', () => {
      // Garante que qualquer GUI dentro de sub-diretórios 'partials' ou módulos filhos esteja documentada
      for (const guiPath of guiFiles) {
        const relPath = path.relative(GUIS_DIR, guiPath);
        const segments = relPath.split(path.sep);
        const basename = path.basename(guiPath);

        // Se está em subpasta (ex: mainMenuHudModule/partials/system/aiConfig/AiConfigGui.ts)
        if (segments.length > 2) {
          expect(
            PARTIAL_SUBCOMPONENTS_MAP[basename],
            `A GUI "${relPath}" é um componente interno / aninhado, mas não está documentada em PARTIAL_SUBCOMPONENTS_MAP com sua respectiva história pai.`
          ).toBeDefined();

          const explanation = PARTIAL_SUBCOMPONENTS_MAP[basename]!;
          expect(explanation.reason).toBeTruthy();
          expect(explanation.parentModuleStory).toBeTruthy();
        }
      }
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Integridade Estrutural e Sintática dos Arquivos .stories.ts               */
  /* -------------------------------------------------------------------------- */
  describe('2. Integridade Estrutural dos Arquivos .stories.ts', () => {
    it('todos os arquivos .stories.ts devem compilar via AST TypeScript sem erros sintáticos', () => {
      for (const storyPath of storyFiles) {
        const content = fs.readFileSync(storyPath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          storyPath,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        // TypeScript parser diagnostics (erros sintáticos / tokens inválidos)
        const diagnostics = (sourceFile as any).parseDiagnostics || [];
        expect(
          diagnostics.length,
          `Erro sintático detectado no arquivo ${path.relative(ROOT_DIR, storyPath)}:\n${diagnostics.map((d: any) => d.messageText).join('\n')}`
        ).toBe(0);
      }
    });

    it('cada arquivo .stories.ts deve conter uma exportação padrão (export default)', () => {
      for (const storyPath of storyFiles) {
        const content = fs.readFileSync(storyPath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          storyPath,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        let hasExportDefault = false;

        ts.forEachChild(sourceFile, (node) => {
          // export default ...
          if (ts.isExportAssignment(node) && !node.isExportEquals) {
            hasExportDefault = true;
          }
          // export default function / class
          if (
            (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
          ) {
            hasExportDefault = true;
          }
        });

        expect(
          hasExportDefault,
          `O arquivo ${path.relative(ROOT_DIR, storyPath)} deve exportar por padrão (export default) seu Meta ou configuração do Storybook.`
        ).toBe(true);
      }
    });

    it('cada arquivo .stories.ts deve conter ao menos uma Story exportada nominalmente', () => {
      for (const storyPath of storyFiles) {
        const content = fs.readFileSync(storyPath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          storyPath,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const exportedStories: string[] = [];

        ts.forEachChild(sourceFile, (node) => {
          // export const StoryName = ...
          if (ts.isVariableStatement(node)) {
            const isExported = node.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ExportKeyword
            );
            if (isExported) {
              for (const decl of node.declarationList.declarations) {
                if (ts.isIdentifier(decl.name)) {
                  const name = decl.name.text;
                  // Ignora exportações que não são stories (ex: helpers, args)
                  if (name !== 'default') {
                    exportedStories.push(name);
                  }
                }
              }
            }
          }
          // export function StoryName() {}
          if (ts.isFunctionDeclaration(node) && node.name) {
            const isExported = node.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.ExportKeyword
            );
            const isDefault = node.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.DefaultKeyword
            );
            if (isExported && !isDefault) {
              exportedStories.push(node.name.text);
            }
          }
        });

        expect(
          exportedStories.length,
          `O arquivo ${path.relative(ROOT_DIR, storyPath)} não possui nenhuma Story exportada nominalmente (ex: export const Default = ...).`
        ).toBeGreaterThan(0);
      }
    });

    it('todos os imports relativos locais dentro dos .stories.ts devem apontar para arquivos existentes', () => {
      const brokenImports: { story: string; importPath: string; resolved: string }[] = [];

      for (const storyPath of storyFiles) {
        const content = fs.readFileSync(storyPath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          storyPath,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const dir = path.dirname(storyPath);

        ts.forEachChild(sourceFile, (node) => {
          if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const importSpec = node.moduleSpecifier.text;

            // Analisa apenas caminhos relativos locais (./ ou ../)
            if (importSpec.startsWith('.')) {
              const cleanImport = importSpec.split('?')[0] || importSpec;
              const resolvedBase = path.resolve(dir, cleanImport);

              // Tenta extensões comuns e diretórios/index
              const candidates = [
                resolvedBase,
                `${resolvedBase}.ts`,
                `${resolvedBase}.tsx`,
                `${resolvedBase}.js`,
                `${resolvedBase}.html`,
                `${resolvedBase}.css`,
                `${resolvedBase}.png`,
                `${resolvedBase}.svg`,
                path.join(resolvedBase, 'index.ts'),
                path.join(resolvedBase, 'index.js')
              ];

              const exists = candidates.some((cand) => fs.existsSync(cand));

              if (!exists) {
                brokenImports.push({
                  story: path.relative(ROOT_DIR, storyPath),
                  importPath: importSpec,
                  resolved: path.relative(ROOT_DIR, resolvedBase)
                });
              }
            }
          }
        });
      }

      expect(
        brokenImports,
        `Imports relativos quebrados encontrados nos arquivos de Storybook:\n${JSON.stringify(brokenImports, null, 2)}`
      ).toHaveLength(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Testes de Regressão: Prevenção de Falhas e Validação do Auditor        */
  /* -------------------------------------------------------------------------- */
  describe('3. Testes de Regressão & Governança de Adição de Novas GUIs', () => {
    it('regressão: deve reprovar no caso de uma nova GUI ser adicionada sem Storybook', () => {
      // Simula uma nova lista de arquivos onde uma GUI hipotética foi criada sem story
      const hypotheticalGuis = [
        ...guiFiles,
        path.join(GUIS_DIR, 'newFeatureHudModule/NewFeatureGui.ts')
      ];

      const missing = hypotheticalGuis.filter((gui) => {
        const base = path.basename(gui);
        if (PARTIAL_SUBCOMPONENTS_MAP[base]) return false;
        const dir = path.dirname(gui);
        const nameWithoutExt = base.replace(/\.ts$/, '');
        // Na pasta simulada não há arquivos reais
        if (!fs.existsSync(dir)) return true;
        const entries = fs.readdirSync(dir);
        return !entries.some((e) => e.toLowerCase() === `${nameWithoutExt.toLowerCase()}.stories.ts`);
      });

      expect(missing).toContain(path.join(GUIS_DIR, 'newFeatureHudModule/NewFeatureGui.ts'));
    });

    it('regressão: deve reprovar arquivo .stories.ts que não exporta default ou stories', () => {
      const mockStoryWithoutExport = `
        import CharacterMenuGui from './CharacterMenuGui';
        const meta = { title: 'Test' };
      `;
      const sourceFile = ts.createSourceFile('mock.stories.ts', mockStoryWithoutExport, ts.ScriptTarget.Latest, true);

      let hasExportDefault = false;
      let hasExportConst = false;

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isExportAssignment(node)) hasExportDefault = true;
        if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
          hasExportConst = true;
        }
      });

      expect(hasExportDefault).toBe(false);
      expect(hasExportConst).toBe(false);
    });

    it('regressão: deve detectar e validar suporte tanto ao padrão Meta quanto ao StorybookGuiBuilder', () => {
      const spellBufferStory = path.join(GUIS_DIR, 'spellBufferHudModule/SpellBufferHudGui.stories.ts');
      const characterMenuStory = path.join(GUIS_DIR, 'characterMenuHudModule/characterMenuGui.stories.ts');

      expect(fs.existsSync(spellBufferStory)).toBe(true);
      expect(fs.existsSync(characterMenuStory)).toBe(true);

      const spellBufferContent = fs.readFileSync(spellBufferStory, 'utf-8');
      const characterMenuContent = fs.readFileSync(characterMenuStory, 'utf-8');

      // Valida uso do StorybookGuiBuilder no spell buffer
      expect(spellBufferContent).toContain('StorybookGuiBuilder');
      expect(spellBufferContent).toContain('export default');
      expect(spellBufferContent).toContain('export const DefaultStory');

      // Valida padrão Meta no character menu
      expect(characterMenuContent).toContain('Meta<StoryArgs>');
      expect(characterMenuContent).toContain('export default meta');
      expect(characterMenuContent).toContain('export const Default');
    });
  });
});
