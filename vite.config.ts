import { defineConfig, Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { ChunkBoundaryHelper } from './typescript/domain/ObjectModule/Maps/ChunkBoundaryHelper';

/**
 * Plugin de sincronização bidirecional do Assets Adapter.
 * Permite ler e gravar diretamente no arquivo VilgemWorld.ts (e futuros mundos)
 * entre os delimitadores <!-- ASSETS_ADAPTER_SCENERY_START --> e <!-- ASSETS_ADAPTER_SCENERY_END -->.
 */
function assetsAdapterSyncPlugin(): Plugin {
  return {
    name: 'assets-adapter-sync-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Redireciona /assets/... para /typescript/adapters/web/assets/... para carregar texturas relativas
        if (req.url?.startsWith('/assets/')) {
          req.url = '/typescript/adapters/web' + req.url;
        }

        if (!req.url?.startsWith('/api/assets-adapter')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const target = url.searchParams.get('target') || 'scenery';
        const mapId = url.searchParams.get('mapId') || 'vilgem';

        // -------------------------------------------------------------
        // SINCRONIZAÇÃO DO VISUAL CONFIG MAP (VisualConfigMap.ts)
        // -------------------------------------------------------------
        if (target === 'visualConfig') {
          const visualConfigFile = path.resolve(__dirname, 'typescript/adapters/web/shared/VisualConfigMap.ts');

          if (req.method === 'GET') {
            try {
              if (!fs.existsSync(visualConfigFile)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'VisualConfigMap.ts não encontrado.' }));
                return;
              }
              const content = fs.readFileSync(visualConfigFile, 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, content }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (!fs.existsSync(visualConfigFile)) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'VisualConfigMap.ts não encontrado.' }));
                    return;
                  }

                  let fileContent = fs.readFileSync(visualConfigFile, 'utf-8');

                  // 1. Atualiza imports se fornecido
                  if (data.importsCode !== undefined) {
                    const impStart = '// <!-- ASSETS_ADAPTER_IMPORTS_START -->';
                    const impEnd = '// <!-- ASSETS_ADAPTER_IMPORTS_END -->';
                    const sIdx = fileContent.indexOf(impStart);
                    const eIdx = fileContent.indexOf(impEnd);
                    if (sIdx !== -1 && eIdx !== -1) {
                      fileContent = fileContent.substring(0, sIdx + impStart.length) +
                        '\n' + data.importsCode.trim() + '\n' +
                        fileContent.substring(eIdx);
                    }
                  }

                  // 2. Atualiza consts se fornecido
                  if (data.constsCode !== undefined) {
                    const constStart = '// <!-- ASSETS_ADAPTER_CONSTS_START -->';
                    const constEnd = '// <!-- ASSETS_ADAPTER_CONSTS_END -->';
                    const sIdx = fileContent.indexOf(constStart);
                    const eIdx = fileContent.indexOf(constEnd);
                    if (sIdx !== -1 && eIdx !== -1) {
                      fileContent = fileContent.substring(0, sIdx + constStart.length) +
                        '\n' + data.constsCode.trim() + '\n' +
                        fileContent.substring(eIdx);
                    }
                  }

                  // 3. Atualiza sprites dentro do VisualConfigMap
                  if (data.spritesCode !== undefined) {
                    const spStart = '// <!-- ASSETS_ADAPTER_SPRITES_START -->';
                    const spEnd = '// <!-- ASSETS_ADAPTER_SPRITES_END -->';
                    const sIdx = fileContent.indexOf(spStart);
                    const eIdx = fileContent.indexOf(spEnd);
                    if (sIdx !== -1 && eIdx !== -1) {
                      const before = fileContent.substring(0, sIdx + spStart.length);
                      const after = fileContent.substring(eIdx);
                      fileContent = `${before}\n${data.spritesCode}\n    ${after}`;
                    }
                  }

                  const currentDisk = fs.readFileSync(visualConfigFile, 'utf-8');
                  if (fileContent.trim() === currentDisk.trim()) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, unchanged: true }));
                    return;
                  }

                  fs.writeFileSync(visualConfigFile, fileContent, 'utf-8');
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                } catch (parseErr: any) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: parseErr.message }));
                }
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        // -------------------------------------------------------------
        // SINCRONIZAÇÃO DE HITBOXES (collision-layers/ e asset_hitboxes.json)
        // -------------------------------------------------------------
        if (target === 'hitboxes') {
          const assetId = url.searchParams.get('assetId') || '';
          const cleanAssetId = assetId.replace(/_clean$|_anim$/, '');
          const collisionDir = path.resolve(__dirname, 'typescript/adapters/web/assets/scenery/collision-layers');
          const layerFile = path.resolve(collisionDir, `${cleanAssetId}_hitboxes.json`);
          const domainHitboxesFile = path.resolve(__dirname, 'typescript/domain/ObjectModule/Scenery/asset_hitboxes.json');

          if (req.method === 'GET') {
            try {
              if (!assetId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'assetId é obrigatório.' }));
                return;
              }

              // 1. Busca no asset_hitboxes.json canônico do Domínio (Fonte de verdade 1x World Scale)
              if (fs.existsSync(domainHitboxesFile)) {
                const catalog = JSON.parse(fs.readFileSync(domainHitboxesFile, 'utf-8'));
                const entry = catalog[cleanAssetId] || catalog[assetId];
                if (entry) {
                  const convertedHitboxes = (entry.shapes || []).map((s: any, idx: number) => {
                    if (s.type === 'circle') {
                      return {
                        id: `${cleanAssetId}_circle_${idx + 1}`,
                        type: 'circle',
                        coordinates: { x: s.center?.x || 0, y: s.center?.y || 0 },
                        rotation: 0,
                        radius: s.radius || 10
                      };
                    }
                    return {
                      id: `${cleanAssetId}_poly_${idx + 1}`,
                      type: 'polygon',
                      coordinates: { x: 0, y: 0 },
                      rotation: 0,
                      points: s.points || []
                    };
                  });

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: true,
                    assetId: cleanAssetId,
                    hitboxes: convertedHitboxes,
                    baseWidth: entry.baseWidth,
                    baseHeight: entry.baseHeight
                  }));
                  return;
                }
              }

              // 2. Se não estiver no catálogo do domínio, busca no arquivo individual de camada
              if (fs.existsSync(layerFile)) {
                const raw = fs.readFileSync(layerFile, 'utf-8');
                const parsed = JSON.parse(raw);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, assetId: cleanAssetId, hitboxes: parsed.hitboxes || [] }));
                return;
              }

              // Se não encontrou nenhuma hitbox definida, retorna array vazio com sucesso
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, assetId: cleanAssetId, hitboxes: [] }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const targetAssetId = (data.assetId || cleanAssetId).replace(/_clean$|_anim$/, '');
                  if (!targetAssetId) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'assetId é obrigatório para salvar hitboxes.' }));
                    return;
                  }

                  const targetLayerFile = path.resolve(collisionDir, `${targetAssetId}_hitboxes.json`);
                  const hitboxes = Array.isArray(data.hitboxes) ? data.hitboxes : [];

                  // 1. Grava no arquivo individual de camada de colisão
                  if (!fs.existsSync(collisionDir)) {
                    fs.mkdirSync(collisionDir, { recursive: true });
                  }
                  fs.writeFileSync(targetLayerFile, JSON.stringify({ hitboxes }, null, 2), 'utf-8');

                  // 2. Converte para o formato do asset_hitboxes.json do Domínio
                  if (fs.existsSync(domainHitboxesFile)) {
                    const catalog = JSON.parse(fs.readFileSync(domainHitboxesFile, 'utf-8'));
                    const baseWidth = data.baseWidth || catalog[targetAssetId]?.baseWidth || 64;
                    const baseHeight = data.baseHeight || catalog[targetAssetId]?.baseHeight || 64;

                    const shapes = hitboxes.map((hb: any) => {
                      if (hb.type === 'circle') {
                        return {
                          type: 'circle',
                          center: {
                            x: Math.round(hb.coordinates?.x ?? 0),
                            y: Math.round(hb.coordinates?.y ?? 0)
                          },
                          radius: Math.round(hb.radius ?? 10)
                        };
                      }
                      return {
                        type: 'polygon',
                        points: (hb.points || []).map((p: any) => ({
                          x: Math.round(p.x),
                          y: Math.round(p.y)
                        }))
                      };
                    });

                    catalog[targetAssetId] = {
                      baseWidth,
                      baseHeight,
                      shapes
                    };

                    fs.writeFileSync(domainHitboxesFile, JSON.stringify(catalog, null, 2), 'utf-8');
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, timestamp: Date.now(), assetId: targetAssetId, count: hitboxes.length }));
                } catch (parseErr: any) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: parseErr.message }));
                }
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        // -------------------------------------------------------------
        // SALVAMENTO DE IMAGEM DE CHUNK BAKED (PNG a partir de DataURL)
        // -------------------------------------------------------------
        if (target === 'save-chunk-image') {
          if (req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const { mapId, row, col, dataUrl, fileName } = data;
                  if (!dataUrl) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'dataUrl é obrigatório' }));
                    return;
                  }

                  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');

                  const mapDir = path.resolve(__dirname, `typescript/adapters/web/assets/maps/${mapId}`);
                  if (!fs.existsSync(mapDir)) {
                    fs.mkdirSync(mapDir, { recursive: true });
                  }

                  const name = fileName || `chunk_r${row}_c${col}_baked_${Date.now()}.png`;
                  const filePath = path.join(mapDir, name);
                  fs.writeFileSync(filePath, buffer);

                  const relativePath = `assets/maps/${mapId}/${name}`;
                  const url = `/assets/maps/${mapId}/${name}`;

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: true,
                    filePath,
                    relativePath,
                    url
                  }));
                } catch (parseErr: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: parseErr.message }));
                }
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        // -------------------------------------------------------------
        // SINCRONIZAÇÃO DE CHUNKS DO TERRENO (VisualConfigMap.ts e World.ts)
        // -------------------------------------------------------------
        if (target === 'chunks') {
          const visualConfigFile = path.resolve(__dirname, 'typescript/adapters/web/shared/VisualConfigMap.ts');
          const mapFiles: Record<string, string> = {
            vilgem: path.resolve(__dirname, 'typescript/domain/ObjectModule/Maps/VilgemWorld.ts'),
            alun: path.resolve(__dirname, 'typescript/domain/ObjectModule/Maps/AlunWorld.ts'),
            cemii: path.resolve(__dirname, 'typescript/domain/ObjectModule/Maps/CemiiWorld.ts'),
          };
          const worldFile = mapFiles[mapId];
          const chunksJsonFile = path.resolve(__dirname, `typescript/adapters/web/assets/maps/chunks_${mapId}.json`);

          if (req.method === 'GET') {
            try {
              if (fs.existsSync(chunksJsonFile)) {
                const jsonContent = fs.readFileSync(chunksJsonFile, 'utf-8');
                const parsed = JSON.parse(jsonContent);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  mapId,
                  chunks: parsed.chunks,
                  width: parsed.width,
                  height: parsed.height,
                  originChunk: parsed.originChunk
                }));
                return;
              }

              // Fallback: extrai de VisualConfigMap.ts e VilgemWorld.ts
              if (!fs.existsSync(visualConfigFile)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'VisualConfigMap.ts não encontrado.' }));
                return;
              }

              const visualContent = fs.readFileSync(visualConfigFile, 'utf-8');
              const startChunkTag = `// <!-- ASSETS_ADAPTER_CHUNKS_START:${mapId} -->`;
              const endChunkTag = `// <!-- ASSETS_ADAPTER_CHUNKS_END:${mapId} -->`;
              const cStart = visualContent.indexOf(startChunkTag);
              const cEnd = visualContent.indexOf(endChunkTag);

              let chunks: string[][] = [];
              if (cStart !== -1 && cEnd !== -1) {
                const block = visualContent.substring(cStart + startChunkTag.length, cEnd);
                const equalsIndex = block.indexOf('=');
                const arrayStart = equalsIndex !== -1 ? block.indexOf('[', equalsIndex) : block.indexOf('[');
                const arrayEnd = block.lastIndexOf(']');
                if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                  const inner = block.substring(arrayStart + 1, arrayEnd);
                  const innerRows = inner.match(/\[\s*([\s\S]*?)\s*\]/g);
                  if (innerRows) {
                    for (const rStr of innerRows) {
                      const rawContent = rStr.replace(/^\[/, '').replace(/\]$/, '').trim();
                      const cells = rawContent.split(/,\s*\r?\n/).map(c => {
                        const trimmed = c.trim();
                        if (trimmed === "''" || trimmed === '""' || !trimmed) return '';
                        const urlMatch = /new URL\(['"]([^'"]+)['"]/.exec(trimmed);
                        if (urlMatch && urlMatch[1]) {
                          return urlMatch[1].replace(/^\.\.\/assets\//, '/assets/');
                        }
                        const strMatch = /['"]([^'"]+)['"]/.exec(trimmed);
                        return strMatch ? strMatch[1] : trimmed;
                      });
                      chunks.push(cells);
                    }
                  }
                }
              }

              let width = (chunks[0]?.length || 3) * 1024;
              let height = (chunks.length || 3) * 1024;
              let originChunk: { cx: number; cy: number } | undefined = undefined;
              if (worldFile && fs.existsSync(worldFile)) {
                const worldContent = fs.readFileSync(worldFile, 'utf-8');
                const wMatch = /public\s+readonly\s+width\s*=\s*(\d+)/.exec(worldContent);
                const hMatch = /public\s+readonly\s+height\s*=\s*(\d+)/.exec(worldContent);
                const oMatch = /originChunk\s*=\s*\{\s*cx\s*:\s*(-?\d+)\s*,\s*cy\s*:\s*(-?\d+)\s*\}/.exec(worldContent);
                if (wMatch && wMatch[1]) width = parseInt(wMatch[1], 10);
                if (hMatch && hMatch[1]) height = parseInt(hMatch[1], 10);
                if (oMatch) originChunk = { cx: parseInt(oMatch[1], 10), cy: parseInt(oMatch[2], 10) };
              }

              // Se não encontrou chunks configurados em código para este mapa, cria matriz default
              if (chunks.length === 0) {
                const cols = Math.max(1, Math.round(width / 1024));
                const rows = Math.max(1, Math.round(height / 1024));
                const defaultGround = '/assets/maps/vilgem/grass_seamless_base.png';
                chunks = Array.from({ length: rows }, () => Array.from({ length: cols }, () => defaultGround));
                if (!originChunk) {
                  originChunk = mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 };
                }
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, mapId, chunks, width, height, originChunk }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const startChunkTag = `// <!-- ASSETS_ADAPTER_CHUNKS_START:${mapId} -->`;
                  const endChunkTag = `// <!-- ASSETS_ADAPTER_CHUNKS_END:${mapId} -->`;

                  // 1. Atualiza matriz de chunks no VisualConfigMap.ts
                  if (fs.existsSync(visualConfigFile) && data.chunksCode) {
                    let visualContent = fs.readFileSync(visualConfigFile, 'utf-8');
                    const cStart = visualContent.indexOf(startChunkTag);
                    const cEnd = visualContent.indexOf(endChunkTag);
                    if (cStart !== -1 && cEnd !== -1) {
                      visualContent = visualContent.substring(0, cStart + startChunkTag.length) +
                        '\n' + data.chunksCode.trim() + '\n' +
                        visualContent.substring(cEnd);

                      if (data.originChunk) {
                        const mapEntryRegex = new RegExp(`(['"]${mapId}['"]\\s*:\\s*\\{[\\s\\S]*?originChunk\\s*:\\s*\\{)\\s*cx\\s*:\\s*\\d+\\s*,\\s*cy\\s*:\\s*\\d+\\s*(\\}[\\s\\S]*?\\})`);
                        if (mapEntryRegex.test(visualContent)) {
                          visualContent = visualContent.replace(mapEntryRegex, `$1 cx: ${data.originChunk.cx}, cy: ${data.originChunk.cy} $2`);
                        }
                      }
                    } else {
                      // Se as tags ainda não existiam para este mapa, injeta antes de VisualConfigMap
                      const exportIndex = visualContent.indexOf('export const VisualConfigMap');
                      if (exportIndex !== -1) {
                        const chunkBlockToInsert = `${startChunkTag}\n${data.chunksCode.trim()}\n${endChunkTag}\n\n`;
                        visualContent = visualContent.substring(0, exportIndex) + chunkBlockToInsert + visualContent.substring(exportIndex);

                        // E registra a entrada no VisualConfigMap se não existir
                        const mapKeyCheck = new RegExp(`['"]${mapId}['"]\\s*:`);
                        if (!mapKeyCheck.test(visualContent)) {
                          const vcmOpenIndex = visualContent.indexOf('export const VisualConfigMap: Record<string, AnyVisualConfig> = {');
                          if (vcmOpenIndex !== -1) {
                            const insertPos = vcmOpenIndex + 'export const VisualConfigMap: Record<string, AnyVisualConfig> = {'.length;
                            const newMapEntry = `\n    '${mapId}': {\n        category: 'map',\n        chunkSize: 1024,\n        chunks: ${mapId}Chunks,\n        originChunk: { cx: ${data.originChunk?.cx ?? 0}, cy: ${data.originChunk?.cy ?? 0} }\n    },`;
                            visualContent = visualContent.substring(0, insertPos) + newMapEntry + visualContent.substring(insertPos);
                          }
                        }
                      }
                    }
                    fs.writeFileSync(visualConfigFile, visualContent, 'utf-8');
                  }

                  // 2. Atualiza dimensões width / height / originChunk no arquivo do mundo (se for mapa principal com arquivo .ts)
                  if (worldFile && fs.existsSync(worldFile) && data.width !== undefined && data.height !== undefined) {
                    let worldContent = fs.readFileSync(worldFile, 'utf-8');
                    const dimsStart = '// <!-- ASSETS_ADAPTER_MAP_DIMS_START -->';
                    const dimsEnd = '// <!-- ASSETS_ADAPTER_MAP_DIMS_END -->';
                    const dStart = worldContent.indexOf(dimsStart);
                    const dEnd = worldContent.indexOf(dimsEnd);
                    if (dStart !== -1 && dEnd !== -1) {
                      const originCx = data.originChunk?.cx ?? (mapId === 'vilgem' ? 1 : 0);
                      const originCy = data.originChunk?.cy ?? (mapId === 'vilgem' ? 1 : 0);
                      const minX = -originCx * 1024;
                      const minY = -originCy * 1024;
                      const maxX = minX + data.width;
                      const maxY = minY + data.height;
                      const defaultSpawnMatch = /defaultSpawn\s*=\s*\{\s*x\s*:\s*(-?\d+)\s*,\s*y\s*:\s*(-?\d+)\s*\}/.exec(worldContent);
                      const spawnX = defaultSpawnMatch ? parseInt(defaultSpawnMatch[1], 10) : (mapId === 'vilgem' ? 512 : 500);
                      const spawnY = defaultSpawnMatch ? parseInt(defaultSpawnMatch[2], 10) : (mapId === 'vilgem' ? 591 : 500);
                      const chunksJsonString = JSON.stringify(data.chunks, null, 8);
                      const newDims = `    // Dimensões do mapa composto por chunks dinâmicos (Origem no Chunk 0,0)\n    public readonly width = ${data.width};\n    public readonly height = ${data.height};\n    public override readonly minX = ${minX};\n    public override readonly minY = ${minY};\n    public override readonly maxX = ${maxX};\n    public override readonly maxY = ${maxY};\n    public override readonly originChunk = { cx: ${originCx}, cy: ${originCy} };\n    public override readonly defaultSpawn = { x: ${spawnX}, y: ${spawnY} };\n    public override readonly chunks: string[][] = ${chunksJsonString};`;
                      worldContent = worldContent.substring(0, dStart + dimsStart.length) +
                        '\n' + newDims + '\n    ' +
                        worldContent.substring(dEnd);
                      fs.writeFileSync(worldFile, worldContent, 'utf-8');
                    }
                  } else if (!worldFile) {
                    // Se for um InnerMap, atualiza dimensões no intermapsMap.json se existir
                    const intermapsJsonFile = path.resolve(__dirname, 'typescript/adapters/web/assets/maps/intermapsMap.json');
                    if (fs.existsSync(intermapsJsonFile)) {
                      try {
                        const allIntermaps = JSON.parse(fs.readFileSync(intermapsJsonFile, 'utf-8'));
                        if (allIntermaps[mapId]) {
                          if (data.width !== undefined) allIntermaps[mapId].width = data.width;
                          if (data.height !== undefined) allIntermaps[mapId].height = data.height;
                          if (data.chunks) allIntermaps[mapId].chunks = data.chunks;
                          if (data.originChunk) allIntermaps[mapId].originChunk = data.originChunk;
                          fs.writeFileSync(intermapsJsonFile, JSON.stringify(allIntermaps, null, 2), 'utf-8');
                        }
                      } catch (_) {}
                    }
                  }

                  // 3. Salva JSON estruturado para acesso imediato no reload
                  if (data.chunks && Array.isArray(data.chunks)) {
                    const origin = data.originChunk || (mapId === 'vilgem' ? { cx: 2, cy: 1 } : { cx: 0, cy: 0 });
                    fs.writeFileSync(chunksJsonFile, JSON.stringify({
                      chunks: data.chunks,
                      width: data.width,
                      height: data.height,
                      originChunk: origin,
                      timestamp: Date.now()
                    }, null, 2), 'utf-8');

                    // 4. Auto-sincroniza hitboxes perimetrais dinâmicas para o mapa
                    const collisionHitboxesFile = path.resolve(__dirname, `typescript/adapters/web/assets/maps/collision-layers/${mapId}_hitboxes.json`);
                    if (fs.existsSync(collisionHitboxesFile)) {
                      const newBoundaries = ChunkBoundaryHelper.computeBoundaries(data.chunks, origin, 1024, 32);
                      fs.writeFileSync(collisionHitboxesFile, JSON.stringify({ hitboxes: newBoundaries }, null, 2), 'utf-8');
                    }
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                } catch (parseErr: any) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: parseErr.message }));
                }
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        // -------------------------------------------------------------
        // SINCRONIZAÇÃO DE INNERMAPS (intermapsMap.json e IntermapConfig.ts)
        // -------------------------------------------------------------
        if (target === 'intermaps') {
          const intermapsJsonFile = path.resolve(__dirname, 'typescript/adapters/web/assets/maps/intermapsMap.json');
          if (req.method === 'GET') {
            try {
              let intermaps: Record<string, any> = {};
              if (fs.existsSync(intermapsJsonFile)) {
                intermaps = JSON.parse(fs.readFileSync(intermapsJsonFile, 'utf-8'));
              }
              // Mescla com chunks_${id}.json se existir para garantir que edições de chunks persistam
              for (const id of Object.keys(intermaps)) {
                const chunksFile = path.resolve(__dirname, `typescript/adapters/web/assets/maps/chunks_${id}.json`);
                if (fs.existsSync(chunksFile)) {
                  try {
                    const cData = JSON.parse(fs.readFileSync(chunksFile, 'utf-8'));
                    if (cData.chunks && Array.isArray(cData.chunks)) {
                      intermaps[id].chunks = cData.chunks;
                      if (cData.width) intermaps[id].width = cData.width;
                      if (cData.height) intermaps[id].height = cData.height;
                    }
                  } catch (_) {}
                }
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, intermaps }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (data.intermaps) {
                    for (const [id, def] of Object.entries(data.intermaps as Record<string, any>)) {
                      if (def.chunks && Array.isArray(def.chunks)) {
                        const chunksFile = path.resolve(__dirname, `typescript/adapters/web/assets/maps/chunks_${id}.json`);
                        try {
                          fs.writeFileSync(chunksFile, JSON.stringify({
                            chunks: def.chunks,
                            width: def.width,
                            height: def.height,
                            timestamp: Date.now()
                          }, null, 2), 'utf-8');
                        } catch (_) {}
                      }
                    }
                    fs.writeFileSync(intermapsJsonFile, JSON.stringify(data.intermaps, null, 2), 'utf-8');
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                } catch (parseErr: any) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: parseErr.message }));
                }
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
        }

        // -------------------------------------------------------------
        // SINCRONIZAÇÃO DO MAPA DO MUNDO (VilgemWorld.ts ou InnerMaps)
        // -------------------------------------------------------------
        const mapFiles: Record<string, string> = {
          vilgem: path.resolve(__dirname, 'typescript/domain/ObjectModule/Maps/VilgemWorld.ts'),
          alun: path.resolve(__dirname, 'typescript/domain/ObjectModule/Maps/AlunWorld.ts'),
          cemii: path.resolve(__dirname, 'typescript/domain/ObjectModule/Maps/CemiiWorld.ts'),
        };

        const intermapsJsonFile = path.resolve(__dirname, 'typescript/adapters/web/assets/maps/intermapsMap.json');

        // Se for um InnerMap sem arquivo .ts dedicado, sincroniza via intermapsMap.json
        if (!mapFiles[mapId] && fs.existsSync(intermapsJsonFile)) {
          const rawIntermaps = fs.readFileSync(intermapsJsonFile, 'utf-8');
          const allIntermaps = JSON.parse(rawIntermaps);
          if (allIntermaps[mapId]) {
            if (req.method === 'GET') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, mapId, innerMap: allIntermaps[mapId] }));
              return;
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (data.innerMap) {
                    allIntermaps[mapId] = { ...allIntermaps[mapId], ...data.innerMap };
                    fs.writeFileSync(intermapsJsonFile, JSON.stringify(allIntermaps, null, 2), 'utf-8');
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                } catch (parseErr: any) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: parseErr.message }));
                }
              });
              return;
            }
          }
        }

        const targetFile = mapFiles[mapId];
        if (!targetFile) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Arquivo do mapa ${mapId} não encontrado.` }));
          return;
        }

        // GET: Lê o arquivo e extrai o trecho do cenário
        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(targetFile)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Arquivo do mapa ${mapId} não encontrado.` }));
              return;
            }
            const fullContent = fs.readFileSync(targetFile, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, mapId, content: fullContent }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // POST: Grava automaticamente o código de cenário entre os delimitadores no arquivo
        if (req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                if (!fs.existsSync(targetFile)) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: `Arquivo do mapa ${mapId} não encontrado.` }));
                  return;
                }

                const fileContent = fs.readFileSync(targetFile, 'utf-8');
                const startTag = '// <!-- ASSETS_ADAPTER_SCENERY_START -->';
                const endTag = '// <!-- ASSETS_ADAPTER_SCENERY_END -->';

                const startIndex = fileContent.indexOf(startTag);
                const endIndex = fileContent.indexOf(endTag);

                if (startIndex === -1 || endIndex === -1) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Delimitadores não encontrados no arquivo do mundo.' }));
                  return;
                }

                const before = fileContent.substring(0, startIndex + startTag.length);
                const after = fileContent.substring(endIndex);

                const newFileContent = `${before}\n${data.sceneryCode}\n        ${after}`;
                if (newFileContent.trim() === fileContent.trim()) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, unchanged: true }));
                  return;
                }

                fs.writeFileSync(targetFile, newFileContent, 'utf-8');

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
              } catch (parseErr: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: parseErr.message }));
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

const isNoGpu = process.argv.includes('--no-gpu') || process.argv.includes('--nogpu');

export default defineConfig({
  plugins: [assetsAdapterSyncPlugin()],
  define: {
    __CLI_NO_GPU__: JSON.stringify(isNoGpu),
  },
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/typescript/domain/ObjectModule/Maps/**',
        '**/typescript/adapters/web/assets/**',
        '**/typescript/adapters/web/shared/VisualConfigMap.ts'
      ]
    }
  }
});
