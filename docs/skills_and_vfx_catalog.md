# Catálogo Oficial de Habilidades, Broches e Spritesheets VFX

Este documento registra a entrega canônica de assets visuais para **Habilidades de Classe**, **Broches Globais** e **Spritesheets In-Game**, desenvolvidos pelo Especialista em Criação de Assets em conformidade estrita com a **Paleta Normativa V2** e com as diretrizes do [AGENTS.md](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/AGENTS.md).

---

## 1. Diretrizes Morfológicas dos Ícones de Habilidades

Todos os ícones foram produzidos em duas resoluções com canal alfa limpo (RGBA 100% sem resíduos) e contornos escuros sólidos:
- **Resolução Base de Slot**: $40\text{px} \times 40\text{px}$
- **Alta Resolução / Retina**: $80\text{px} \times 80\text{px}$ (`*_x2.png`)

| Morfologia | Geometria do Nó | Significado Semântico |
| :--- | :--- | :--- |
| **Ativa** | 🟦 Quadrada | Ações manuais diretas, ataques acionados, tiros e golpes. |
| **Passiva** | 🔺 Triangular | Efeitos contínuos, auras passivas e bônus condicionais. |
| **Atributo** | ⚪ Circular | Incrementos permanentes em Força, Constituição, Inteligência, etc. |
| **Essencial** | ⭐ Estrela | Habilidades fundamentais identitárias da classe. |
| **Rara / Especialização** | 🔶 Losango | Pontos de inflexão de subclasse e nós de ápice. |

---

## 2. Catálogo de Habilidades por Classe

Diretório dos assets: `typescript/adapters/web/assets/icons/skills/`

### ⚔️ Guerreiro (12 Habilidades)

| ID | Nome | Morfologia | Arquivo 40x40 | Arquivo 80x80 | Descrição Semântica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `w_t1_strike` | Força Bruta | ⚪ Atributo | `w_t1_strike.png` | `w_t1_strike_x2.png` | Incremento permanente de atributos de combate físico e vigor. |
| `w_t1_heavy_blow` | Pancada Pesada | 🟦 Ativa | `w_t1_heavy_blow.png` | `w_t1_heavy_blow_x2.png` | Golpe frontal descendente com impacto violento no chão e atordoamento. |
| `w_t1_iron_skin` | Pele de Aço | 🔺 Passiva | `w_t1_iron_skin.png` | `w_t1_iron_skin_x2.png` | Enrijecimento corporal aumentando resistência física passiva. |
| `w_t2_cleave` | Turbilhão de Aço | 🟦 Ativa | `w_t2_cleave.png` | `w_t2_cleave_x2.png` | Corte giratório de 360° em área varrendo múltiplos inimigos. |
| `w_t2_shield_bash` | Investida com Escudo | 🟦 Ativa | `w_t2_shield_bash.png` | `w_t2_shield_bash_x2.png` | Choque de escudo frontal repelindo e quebrando posturas. |
| `w_t3_berserk` | Fúria de Batalha | 🔺 Passiva | `w_t3_berserk.png` | `w_t3_berserk_x2.png` | Velocidade e dano crescentes conforme a vida decresce. |
| `w_t3_war_cry` | Grito de Guerra | 🟦 Ativa | `w_t3_war_cry.png` | `w_t3_war_cry_x2.png` | Rugido intimidatório que afasta oponentes e reforça atributos. |
| `w_t4_ground_slam` | Impacto Sísmico | 🟦 Ativa | `w_t4_ground_slam.png` | `w_t4_ground_slam_x2.png` | Fissura geológica telúrica criando ondas de choque radiais. |
| `w_t3_colossus_vigor`| Vigor do Colosso | ⚪ Atributo | `w_t3_colossus_vigor.png`| `w_t3_colossus_vigor_x2.png`| Bônus permanente massivo de vida máxima e constituição. |
| `w_t5_blade_dance` | Dança das Lâminas | 🟦 Ativa | `w_t5_blade_dance.png` | `w_t5_blade_dance_x2.png` | Combinação veloz de múltiplos cortes e evasão coordenada. |
| `w_t4_armor_breaker` | Quebrador de Armaduras | 🔺 Passiva | `w_t4_armor_breaker.png` | `w_t4_armor_breaker_x2.png` | Golpes destroçam couraças inimigas reduzindo defesas do alvo. |
| `w_t5_avatar_of_war` | Avatar da Guerra | 🟦 Ativa | `w_t5_avatar_of_war.png` | `w_t5_avatar_of_war_x2.png` | Manifestação definitiva do deus da batalha com imunidade temporal. |

---

### 💀 Necromante (12 Habilidades)

| ID | Nome | Morfologia | Arquivo 40x40 | Arquivo 80x80 | Descrição Semântica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `n_t1_reap` | Colheita Sombria | ⭐ Essencial | `n_t1_reap.png` | `n_t1_reap_x2.png` | Golpe com foice espectral colhendo almas e estilhaços vitais. |
| `n_t1_death_aura` | Presença Fúnebre | ⚪ Atributo | `n_t1_death_aura.png` | `n_t1_death_aura_x2.png` | Afinidade arcana sombria e inteligência necromântica permanente. |
| `n_t1_soul_leech` | Dreno Vital | 🔺 Passiva | `n_t1_soul_leech.png` | `n_t1_soul_leech_x2.png` | Extração passiva de vida ao derrotar criaturas mortas. |
| `n_t2_lifesteal` | Sede de Sangue | 🔺 Passiva | `n_t2_lifesteal.png` | `n_t2_lifesteal_x2.png` | Percentual do dano infligido é convertido em cura instantânea. |
| `n_t2_bone_spear` | Lança de Ossos | 🟦 Ativa | `n_t2_bone_spear.png` | `n_t2_bone_spear_x2.png` | Projétil perfurante de ossos pontiagudos transpassando alvos. |
| `n_t3_soul` | Ascensão do Lich | 🔶 Rara | `n_t3_soul.png` | `n_t3_soul_x2.png` | Ponto de inflexão transcendente da alta necromancia. |
| `n_t3_grasp_of_dead` | Garras do Além | 🟦 Ativa | `n_t3_grasp_of_dead.png`| `n_t3_grasp_of_dead_x2.png`| Mãos cadavéricas brotam do solo enraizando adversários. |
| `n_t4_corpse_explosion`| Explosão Sombria | 🟦 Ativa | `n_t4_corpse_explosion.png`| `n_t4_corpse_explosion_x2.png`| Detonação violenta em área de energias mórbidas. |
| `n_t3_spectral_veil` | Manto Espectral | 🔺 Passiva | `n_t3_spectral_veil.png`| `n_t3_spectral_veil_x2.png`| Desfoque etéreo concedendo esquiva contra projéteis e feitiços. |
| `n_t5_wail_of_banshee`| Clamor da Banshee | 🟦 Ativa | `n_t5_wail_of_banshee.png`| `n_t5_wail_of_banshee_x2.png`| Onda sônica em cone provocando pavor e desorientação. |
| `n_t4_death_warden` | Mestre da Morte | ⚪ Atributo | `n_t4_death_warden.png` | `n_t4_death_warden_x2.png` | Bônus permanente de intelecto e maestria necromântica. |
| `n_t5_dance_of_dead` | Dança das Almas | 🟦 Ativa | `n_t5_dance_of_dead.png`| `n_t5_dance_of_dead_x2.png`| Turbilhão orbital de espíritos vingativos que rasgam inimigos. |

---

### 🔮 Mago / Axiomante (4 Habilidades)

| ID | Nome | Morfologia | Arquivo 40x40 | Arquivo 80x80 | Descrição Semântica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `m_t1_fireball` | Axioma Inicial | ⭐ Essencial | `m_t1_fireball.png` | `m_t1_fireball_x2.png` | Projétil elemental ígneo concentrado que detona em impacto. |
| `m_t2_burn` | Sobrecarga de Mana | 🔺 Passiva | `m_t2_burn.png` | `m_t2_burn_x2.png` | Efeitos residuais de combustão aplicados após feitiços. |
| `m_t3_knowledge` | Erudição | ⚪ Atributo | `m_t3_knowledge.png` | `m_t3_knowledge_x2.png` | Bônus passivo permanente em inteligência e fluxo de mana. |
| `m_t4_teleport` | Translocação (Blink) | 🟦 Ativa | `m_t4_teleport.png` | `m_t4_teleport_x2.png` | Salto dimensional instantâneo redirecionando a posição corporal. |

---

### 🎣 Pescador (4 Habilidades)

| ID | Nome | Morfologia | Arquivo 40x40 | Arquivo 80x80 | Descrição Semântica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pesc_t1_fisgada` | Fisgada Perfeita | 🔺 Passiva | `pesc_t1_fisgada.png` | `pesc_t1_fisgada_x2.png` | Aumento de chance crítica e puxão cinético em presas leves. |
| `pesc_t2_net` | Rede Pesada | 🟦 Ativa | `pesc_t2_net.png` | `pesc_t2_net_x2.png` | Lançamento de rede com chumbo paralisando oponentes em área. |
| `pesc_t3_leviata` | Fúria do Leviatã | 🟦 Ativa | `pesc_t3_leviata.png` | `pesc_t3_leviata_x2.png` | Invocação da criatura abissal titânica esmagando alvos. |
| `pesc_t4_fishpet` | Peixinho de Combate | ⭐ Essencial | `pesc_t4_fishpet.png` | `pesc_t4_fishpet_x2.png` | Companheiro guerreiro aquático com capacete e mini-lança. |

---

### 🎯 Pistoleiro / Gunslinger (3 Habilidades)

| ID | Nome | Morfologia | Arquivo 40x40 | Arquivo 80x80 | Descrição Semântica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `gs_t1_quickdraw` | Saque Rápido | ⭐ Essencial | `gs_t1_quickdraw.png` | `gs_t1_quickdraw_x2.png` | Disparo reflexo imediato ao entrar em alcance de combate. |
| `gs_t2_fanhammer` | Fan the Hammer | 🟦 Ativa | `gs_t2_fanhammer.png` | `gs_t2_fanhammer_x2.png` | Rajada ultrarrápida descarregando todo o tambor do revólver. |
| `gs_t3_deadeye` | Caminho do Franco-Atirador | 🔶 Rara | `gs_t3_deadeye.png` | `gs_t3_deadeye_x2.png` | Especialização de tiro de precisão cirúrgica de longo alcance. |

---

## 3. Catálogo de Broches Ativos Globais

Diretório dos assets: `typescript/adapters/web/assets/icons/brooches/`

| ID | Nome | Arquivo 40x40 | Arquivo 80x80 | Efeito / Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `brooch_active_heal` | Cálice da Vida | `brooch_active_heal.png` | `brooch_active_heal_x2.png` | Restaura instantaneamente 30% da vida máxima do herói. |
| `brooch_active_meteor` | Chamado do Meteoro | `brooch_active_meteor.png` | `brooch_active_meteor_x2.png` | Impacto de fogo estelar que aniquila adversários em raio amplo. |
| `brooch_active_luck` | Dados da Fortuna | `brooch_active_luck.png` | `brooch_active_luck_x2.png` | Dobra temporariamente sorte e taxa de esquiva. |
| `brooch_active_dash` | Botas Aladas | `brooch_active_dash.png` | `brooch_active_dash_x2.png` | Reseta cargas de esquiva e garante impulso cinético veloz. |

---

## 4. Spritesheets In-Game Entregues

Diretórios: `typescript/adapters/web/assets/entities/` e `typescript/adapters/web/assets/entities/vfx/`

| Key / VFX | Arquivo | Dimensões | Frames / Tamanho | Descrição da Substituição |
| :--- | :--- | :--- | :--- | :--- |
| `scythe-slash` | `scythe-atack-spritesheet.png` | $384\text{px} \times 64\text{px}$ | 6 frames ($64\text{px} \times 64\text{px}$) | Arco curvo de meia-lua verde-morte com ectoplasma da foice espectral. |
| `fishPet` | `pet-fish.png` | $96\text{px} \times 32\text{px}$ | 3 frames ($32\text{px} \times 32\text{px}$) | Peixe guerreiro laranja com capacete de concha e mini-lança. |
| `heavy-blow` | `heavy-blow-spritesheet.png` | $480\text{px} \times 96\text{px}$ | 5 frames ($96\text{px} \times 96\text{px}$) | Corte vertical frontal pesado de aço no solo com impacto sísmico. |
| `cleave` | `cleave-spritesheet.png` | $768\text{px} \times 128\text{px}$ | 6 frames ($128\text{px} \times 128\text{px}$) | Vórtice circular contínuo de 360° em anel cortante ao redor do guerreiro. |
