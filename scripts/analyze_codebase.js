const fs = require('fs');
const path = require('path');

const DIRECTORY_TO_SCAN = './typescript';
const LARGE_FILE_THRESHOLD = 300;
const HIGH_COMMENT_RATIO_THRESHOLD = 0.20;

const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (IGNORE_DIRS.includes(file)) continue;

    if (fs.statSync(filePath).isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  let commentLines = 0;
  let inBlockComment = false;

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].trim();

    if (inBlockComment) {
      commentLines++;
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (line.startsWith('/*')) {
      commentLines++;
      if (!line.includes('*/')) {
        inBlockComment = true;
      }
    } else if (line.startsWith('//')) {
      commentLines++;
    }
  }

  const codeLines = totalLines - commentLines;
  const commentRatio = totalLines > 0 ? commentLines / totalLines : 0;

  return {
    filePath,
    totalLines,
    codeLines,
    commentLines,
    commentRatio
  };
}

function main() {
  console.log(`\n🔍 Iniciando Análise Estática da Base de Código em ${DIRECTORY_TO_SCAN}...\n`);
  
  const files = scanDirectory(DIRECTORY_TO_SCAN);
  const results = files.map(analyzeFile);

  // 1. Arquivos Gigantes
  const largeFiles = results
    .filter(r => r.totalLines > LARGE_FILE_THRESHOLD)
    .sort((a, b) => b.totalLines - a.totalLines);

  console.log(`⚠️  ARQUIVOS GIGANTES (> ${LARGE_FILE_THRESHOLD} linhas)`);
  console.log(`Estes arquivos podem ser alvos de refatoração para divisão de responsabilidades.`);
  if (largeFiles.length === 0) {
    console.log(`   Nenhum arquivo encontrado.`);
  } else {
    largeFiles.forEach(r => {
      console.log(`   - ${r.filePath} (${r.totalLines} linhas)`);
    });
  }

  // 2. Alta Densidade de Comentários
  const heavyCommentFiles = results
    .filter(r => r.commentRatio > HIGH_COMMENT_RATIO_THRESHOLD && r.totalLines > 50)
    .sort((a, b) => b.commentRatio - a.commentRatio);

  console.log(`\n💬 ARQUIVOS COM ALTA DENSIDADE DE COMENTÁRIOS (> ${(HIGH_COMMENT_RATIO_THRESHOLD * 100).toFixed(0)}%)`);
  console.log(`Comentários excessivos podem indicar código gerado por IA que não foi limpo, ou lógica demasiadamente complexa.`);
  if (heavyCommentFiles.length === 0) {
    console.log(`   Nenhum arquivo encontrado.`);
  } else {
    heavyCommentFiles.slice(0, 10).forEach(r => {
      console.log(`   - ${r.filePath} (Comentários: ${(r.commentRatio * 100).toFixed(1)}%, Linhas: ${r.totalLines})`);
    });
  }
  
  console.log('\n✅ Análise Concluída.\n');
}

main();
