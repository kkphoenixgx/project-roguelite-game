# Notas para fazer quando volto a programar o jogo

- [x] Correção de Unhandled Promise Rejection para mapas sem configuração visual (`cemii` e `alun`):
  - Criar e registrar entradas com chunks válidos em `VisualConfigMap.ts` para os mapas de biomas secundários (`cemii` e `alun`) ou usar fallback seguro com chunks repetidos para evitar quebra no `GameMap`.

- [Requisito]
