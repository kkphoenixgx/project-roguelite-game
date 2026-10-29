# Catálogo Canônico de Efeitos Elementais & Axiomáticos

> **Projeto:** Alvorada de Vilgem (`rpg-roguelite-game`)  
> **Padrão Estético:** Grimdark Medieval com Toques Arcanos (Paleta Normativa V2)  
> **Resoluções Entregues:** 32px × 32px (Slots de HUD, Projéteis e Buffers) e 64px × 64px (Retina / Alta Resolução)  
> **Formato:** PNG com canal alfa limpo (RGBA 100% transparente) e contorno escuro sólido para contraste em qualquer background.  
> **Diretório dos Assets:** `typescript/adapters/web/assets/icons/effects/`

---

## 1. Relação Completa dos 21 Efeitos

| # | Efeito | ID | Arquivo de Domínio | Arquivo 32x32 | Arquivo 64x64 | Descrição Visual e Semântica |
|---|:---|:---|:---|:---|:---|:---|
| 1 | **Abys** | `abys` | `AbysEffect.ts` | `effect_abys.png` | `effect_abys_x2.png` | Olho cósmico abissal envolto em tentáculos do vazio roxo-escuro e fendas dimensionais. |
| 2 | **Air** | `air` | `AirEffect.ts` | `effect_air.png` | `effect_air_x2.png` | Redemoinho centrífugo de lâminas de vento curvas e afiadas em ciano translúcido. |
| 3 | **Crystal** | `crystal` | `CrystalEffect.ts` | `effect_crystal.png` | `effect_crystal_x2.png` | Prisma octaédrico multifacetado em magenta e ciano irradiando 8 estilhaços angulares. |
| 4 | **Dark** | `dark` | `DarkEffect.ts` | `effect_dark.png` | `effect_dark_x2.png` | Eclipse de lua negra com coroa de chamas sombrias profanas e pupila espectral púrpura. |
| 5 | **Decay** | `decay` | `DecayEffect.ts` | `effect_decay.png` | `effect_decay_x2.png` | Crânio cadavérico decrépito com musgo necrótico e volutas de vapores pútridos. |
| 6 | **Fire** | `fire` | `FireEffect.ts` | `effect_fire.png` | `effect_fire_x2.png` | Fogo elemental vivo crepitante em carmesim ardente (`#dc2626`) e âmbar incandescente. |
| 7 | **Ground** | `ground` | `GroundEffect.ts` | `effect_ground.png` | `effect_ground_x2.png` | Monólitos pontiagudos de rocha granítica partindo o solo em fissuras telúricas douradas. |
| 8 | **Holy** | `holy` | `HolyEffect.ts` | `effect_holy.png` | `effect_holy_x2.png` | Cruz sagrada radiante de ouro antigo (`#FFD700`) sob auréola divina de raios solares. |
| 9 | **Ice** | `ice` | `IceEffect.ts` | `effect_ice.png` | `effect_ice_x2.png` | Floco glacial hexagonal com espinhos congelantes de gelo ártico e reflexos brancos. |
| 10 | **Infernous** | `infernous` | `InfernousEffect.ts` | `effect_infernous.png` | `effect_infernous_x2.png` | Olho demoníaco em fenda vertical envolto por labaredas de enxofre e chamas infernais. |
| 11 | **Life** | `life` | `LifeEffect.ts` | `effect_life.png` | `effect_life_x2.png` | Coração carmesim vital pulsante com brotos de folhas verdes de renovação e cura. |
| 12 | **Light** | `light` | `LightEffect.ts` | `effect_light.png` | `effect_light_x2.png` | Estrela primordial de 8 pontas em expansão explosiva irradiando feixes de luz pura. |
| 13 | **Magic** | `magic` | `MagicEffect.ts` | `effect_magic.png` | `effect_magic_x2.png` | Orbe místico com anéis astrais orbitais inclinados e runas arcanas cósmicas. |
| 14 | **Magma** | `magma` | `MagmaEffect.ts` | `effect_magma.png` | `effect_magma_x2.png` | Rocha basáltica vulcânica escura cortada por veias de lava incandescente borbulhante. |
| 15 | **Nature** | `nature` | `NatureEffect.ts` | `effect_nature.png` | `effect_nature_x2.png` | Par de folhas florestais entrelaçadas em cipó selvagem espinhoso com flor ancestral. |
| 16 | **Negation** | `negation` | `NegationEffect.ts` | `effect_negation.png` | `effect_negation_x2.png` | Selo rúnico mágico circular sendo quebrado diagonalmente por lâmina de antimagia. |
| 17 | **Ordem** | `ordem` | `OrdemEffect.ts` | `effect_ordem.png` | `effect_ordem_x2.png` | Balança celestial de equilíbrio cósmico perfeito em ouro divino e losango superior. |
| 18 | **Poison** | `poison` | `PoisonEffect.ts` | `effect_poison.png` | `effect_poison_x2.png` | Frasco alquímico de vidro verde ácido vertendo veneno peçonhento com bolhas cáusticas. |
| 19 | **Potencia** | `potencia` | `PotenciaEffect.ts` | `effect_potencia.png` | `effect_potencia_x2.png` | Punho cinético blindado com anéis concêntricos de choque e faíscas de impacto violento. |
| 20 | **Thunder** | `thunder` | `ThunderEffect.ts` | `effect_thunder.png` | `effect_thunder_x2.png` | Nuvem de tempestade escura descarregando raio duplo bifurcado em amarelo elétrico. |
| 21 | **Water** | `water` | `WaterEffect.ts` | `effect_water.png` | `effect_water_x2.png` | Onda em crista espiral de água líquida azul marinho gerando respingos e gotas fluidas. |

---

## 2. Integração e Uso

- **Catálogo de Apresentação:** Os ícones estão registrados e expostos em `typescript/adapters/web/shared/VisualConfigMap.ts` através de `ElementalEffectIcons` e chaves `effect_<id>` no `VisualConfigMap`.
- **Validação de Qualidade:** Testados através da suíte `npm run test:maps` (`MapsCompliance.test.ts`) e `ElementalEffects.test.ts`.
