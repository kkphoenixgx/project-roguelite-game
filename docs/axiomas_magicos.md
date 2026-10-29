# Tratado dos Axiomas Primordiais: A Gramática da Realidade
> **Classificação Acadêmica:** Compêndio Canônico da Academia de Artes Arcanas de Vilgem  
> **Destinado a:** Arquivistas, Axiomantes e Desenvolvedores de Domínio  
> **Nota do Mestre Teórico:** *O leigo chama de feitiço, o fanático chama de milagre, o pactuante chama de barganha. O Axiomante sabe que tudo não passa de sintaxe.*

---

## 1. A Filosofia Ontológica do Mundo

No universo do jogo, a magia não é uma força aleatória ou caótica: ela é a **linguagem de programação da criação**.
* Um **Guerreiro** manipula vetores de força e aceleração instintivamente com músculos.
* Um **Paladino** canaliza a sintaxe da Ordem através do dogma e da fé cega.
* Um **Necromante** explora a corrupção do Decaimento e da Entropia.
* Mas o **Axiomante (Mago)** é o único que acessa a linha de comando pura da realidade.

Ao digitar runas em tempo real (`spell_0` a `spell_9`), o Axiomante digita a própria equação que o universo é obrigado a resolver no próximo frame.

---

## 2. A Matriz dos Elementos Primários

A realidade física e etérea é sustentada por seis pilares fundamentais:

| Runa | Elemento | Propriedade Metafísica | Aplicação Prática no Combate |
| :--- | :--- | :--- | :--- |
| `spell_4` | **Fogo (Fire)** | Combustão, agitação térmica | Dano contínuo (DoT), ignição e pressão. |
| `spell_5` | **Água (Water)** | Fluidez, maleabilidade, fluxo | Adaptação, congelamento, dispersão. |
| `spell_6` | **Terra (Ground)** | Densidade, peso, solidez atômica | Massa física, concussão e **Atordoamento (Stun)**. Não é área: é impacto esmagador. |
| `spell_7` | **Trevas (Dark)** | Entropia, vácuo, consumo | Dreno, enfraquecimento, medo e corrosão. |
| `spell_8` | **Luz (Light)** | **Irradiação, projeção e expansão** | **Área de Efeito (AoE)**, aumento de alcance, amplitude do corte físico (`areaMultiplier` / `splashDamage`). |
| `spell_9` | **Magia (Magic)** | Potencial puro, éter não-polarizado | O catalisador de fusão. Converte conceitos em potência ativa. |

---

## 3. As Forças Cinemáticas e Formas

Antes do elemento, o universo precisa saber a **direção** e a **geometria** do axioma:

### 3.1. Formas (A Geometria)
* **Projétil (`spell_0`):** Projeta a equação para longe do conjurador em trajetória vetorial linear ou teleguiada.
* **Self (`spell_1`):** Colapsa a equação sobre o próprio corpo ou arma equipada do conjurador.

### 3.2. Forças (A Cinemática)
* **Knockback (`spell_2`):** Impulso cinemático centrífugo (afasta/empurra).
* **Pull (`spell_3`):** Impulso cinemático centrípeto (atrai/puxa).

---

## 4. Matriz de Fusão Elemental Canônica (Deep-2 Fusion)

Quando dois elementos adjacentes colidem no buffer de digitação sem uma forma entre eles, eles se fundem em um conceito superior:

```
[Magic] + [Fire]   -> POTÊNCIA  (Sobrecarga física/mágica de poder bruto)
[Magic] + [Water]  -> GELO      (Solidificação criogênica)
[Magic] + [Ground] -> VIDA      (Bio-regeneração)
[Magic] + [Dark]   -> CAOS      (Instabilidade entrópica)
[Magic] + [Light]  -> ORDEM     (Sacralidade, radiação divina / Paladino)

[Fire]  + [Water]  -> AR        (Gás expansivo, vento cortante, agilidade)
[Fire]  + [Ground] -> MAGMA     (Rocha fluida de alta temperatura)
[Fire]  + [Dark]   -> INFERNO   (Fogo devorador de almas)
[Fire]  + [Light]  -> TROVÃO    (Descarga plasma / raio)

[Water] + [Ground] -> NATUREZA  (Botânica, espinhos, raízes)
[Water] + [Dark]   -> ABISMO    (Pressão submarina, escuridão sufocante)
[Water] + [Light]  -> SAGRADO   (Purificação restauradora)

[Ground]+ [Dark]   -> DECAIMENTO(Erosão, apodrecimento)
[Ground]+ [Light]  -> CRISTAL   (Refração dura, prisma luminoso)
```

---

## 5. A Teoria da Infusão de Lâmina: Self + Potência

A descoberta fundamental que permite ao Mago lutar como um **Battlemage / Spellblade**:

> **Axioma Base de Infusão:** `Self (spell_1) + Potência (spell_9, spell_4)`
> 
> *Efeito:* Transforma o próximo golpe corporal em uma descarga de poder puro (+Dano Físico) por uma janela tática de **5 segundos**.

Ao combinar o Axioma de Infusão com outros elementos:

### 5.1. Infusão de Ar (Lâmina Veloz / Vento Cortante)
* **Entrada:** `Self + Potência + Air` (`spell_1, spell_9, spell_4, spell_4, spell_5`)
* **Efeito:** A espada ganha dano do tipo **`air`** e velocidade de corte aumentada.

### 5.2. Infusão de Luz (Lâmina Expandida / Área Sagrada)
* **Entrada:** `Self + Potência + Light` (`spell_1, spell_9, spell_4, spell_8`)
* **Por que funciona:** Como a Luz tem a propriedade física de **irradiação**, o corte físico se projeta muito além da lâmina de aço, ativando bônus no `areaMultiplier` e no `splashDamage`.

### 5.3. Infusão de Ordem (Lâmina do Julgamento / O "Paladino Hacker")
* **Entrada:** `Self + Potência + Order` (`spell_1, spell_9, spell_4, spell_9, spell_8`)
* **Efeito:** Converte o ataque em dano **Radiante Divino**, idêntico à punição de um Paladino, queimando mortos-vivos com sacralidade.

---

---

## 6. O Axioma de Negação: Ordo + Caos (O Operador Lógico "NÃO")

Quando a **Ordem Absoluta** (`ordem` = `magic + light`, estrutura rígida e lei) colide intencionalmente com o **Caos Absoluto** (`caos` / `dark`, entropia pura e dissolução), ambas as forças entram em interferência destrutiva conceitual.

O resultado não é um novo elemento e nem gera dano: é o **Vazio Lógico**, a gênese do operador **`NÃO` ($\neg$ / NOT / Dispel)**.

### 6.1. A Regra de Segurança: A Falha Axiomática (Auto-Cancelamento / Fizzle)
Tentativas amadoras de conjurar um elemento material justaposto à Negação violam a consistência da equação ontológica:
* Se o conjurador combinar a Negação com um elemento comum (ex: `Projétil + Ordem + Caos + Fogo`):
  * A Negação **apaga a própria existência do fogo** dentro da fórmula antes que ele possa se materializar.
  * **Consequência:** O feitiço sofre colapso sintático (*fizzle*), emitindo apenas um estalo de vácuo cinzento e vapor inerte. O mana é consumido pelo atrito da anulação interna. Não há projétil nem calor.
  * *Lição da Academia:* "Negar a própria substância que você colocou no molde é pagar o tributo do nada."

### 6.2. A Aplicação Correta: Negação Externa (Dispel e Anti-Magia)
A Negação só ganha estabilidade e propósito quando orientada contra forças arcanas externas:

1. **Projétil de Dispel / Anulação Arcana (`Projétil + Ordem + Caos + Magia`):**
   * Aqui o alvo do feitiço é a **Magia em si** (`magic`).
   * Projeta um orbe acromático de distorção vítrea.
   * **Interceptação:** Se colidir com um projétil arcano inimigo no ar, dissolve sua coesão mágica instantaneamente.
   * **Purga:** Ao atingir uma entidade sob efeitos mágicos (escudos arcanos, buffs de velocidade ou fúria mística), purga e dissipa tais efeitos.
2. **Encantamento de Lâmina Anti-Magia (`Self + Potência + Ordem + Caos + Magia`):**
   * Infunde a lâmina com o gume da anulação.
   * O próximo golpe físico corta através de escudos arcanos sem sofrer mitigação mágica e aplica **Silêncio Arcano** breve no conjurador ferido.
### 6.3. Hierarquia de Buffs: A Escala Numérica de Coesão (Tier 1 a 10)
Para evitar que magias arcanas triviais anulem poderes colossais, todo efeito, encantamento e buff no mundo possui um **Tier de Coesão Mágica (1 a 10)**:

| Nível / Tier | Tipo de Efeito | Exemplos Práticos | Vulnerável ao Dispel Básico? |
| :---: | :--- | :--- | :---: |
| **Tier 1** | **Efeitos Menores / Cantrips** | Buff básico de velocidade, tocha de luz arcana, faísca mágica. | **SIM** |
| **Tier 2** | **Encantamentos Táticos** | Lâmina elemental, escudo místico leve, aceleração de ataque. | **SIM** |
| **Tier 3** | **Magias de Combate Padrão** | Escudo de Mana intermediário, bênção de regeneração padrão. | **SIM (Limite Máximo)** |
| **Tier 4 - 6** | **Encantamentos Avançados** | Armadura Arcana Completa, Fúria Espiritual, Ilusão Complexa. | **NÃO** *(Exige Dispel com Potência / Deep Axiom)* |
| **Tier 7 - 9** | **Magias Míticas / Fórmulas Proibidas** | Ressurreição temporária, Manto de Invulnerabilidade Ritual. | **NÃO** *(Exige Ritual de Anulação)* |
| **Tier 10** | **Axiomas Primordiais / Inatos** | Mecânicas inatas de Chefes, Leis do Domínio, Auras Divinas. | **IMUNE** *(Invioláveis)* |

> **Regra de Combate do Dispel Simples:**
> O feitiço básico `[Projétil / Self + Ordem + Caos + Magia]` tem **Poder de Purga = 3**.
> Ele remove exatamente **1 buff de Tier $\le$ 3** por acerto (priorizando o de maior nível dentro do limite ou o mais recente). Efeitos de Tier 4 ou superior simplesmente absorvem a onda de choque sem quebrar sua coesão.

## 7. O Limite da Habilidade (Skill Ceiling)

Na Academia de Magia, é ensinado o dogma:
1. **Janela Tática de 5 Segundos:** Os buffs de infusão são efêmeros. O axiomante não pode meditar no meio do combate: ele digita, troca pra lâmina e desfere os golpes.
2. **Buff Stacking por Mérito:** Se o jogador tiver destreza manual e mana suficientes para conjurar `Potência + Air` e imediatamente conjurar `Potência + Light` em menos de 3 segundos, ele é recompensado com uma lâmina de vento de alcance gigante até o timer expirar.
3. **Limitação de Complexidade:** O Axiomante não replica mecânicas de interface de outras classes (ex: o mini-game da vara do Pescador ou o recarregamento de tambor do Gunslinger), pois isso pertence à maestria de ferramentas físicas, não à gramática pura da realidade.
