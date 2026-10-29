import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import DefaultXPTable from '../../domain/ObjectModule/Entities/DefaultXPTable';
import MetaProgressionManager from '../../domain/facadeComponents/MetaProgressionManager';
import PlayerClassManager from '../../domain/ObjectModule/Entities/Player/components/PlayerClassManager';
import SkillTemplate from '../../domain/templates/SkillTemplate';
import EvolvingClassTemplate from '../../domain/templates/EvolvingClassTemplate';
import EvolvingClassBase from '../../domain/templates/EvolvingClassBase';

const mockLogger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {}
};

describe('Sistema Integral de Classes Evolutivas & Progressão Narrativa', () => {
  let eventManager: EventHandler;
  let player: Player;
  let metaManager: MetaProgressionManager;
  let xpTable: DefaultXPTable;

  beforeEach(() => {
    PlayerClassManager.clearGlobalClasses();
    eventManager = new EventHandler();
    metaManager = new MetaProgressionManager(mockLogger as any);
    xpTable = new DefaultXPTable();

    // hpDiceFaces: 6, level: 5, strength: 15, constitution: 12, dexterity: 14, intelligence: 18
    const attributes = new Attributes(6, 5, 15, 12, 14, 18, 10, 10);
    player = new Player(1, { x: 100, y: 100 }, attributes, eventManager);
  });

  describe('1. Persistência de Marcos de História (Narrative Story Milestones)', () => {
    it('deve desbloquear marcos de lore e persistir no GlobalState entre runs', () => {
      let milestoneDispatched = false;
      eventManager.on('storyMilestoneUnlocked', (ev) => {
        if (ev.milestoneId === 'story_ancient_tablet_read') {
          milestoneDispatched = true;
        }
      });

      expect(metaManager.hasStoryMilestone('story_ancient_tablet_read')).toBe(false);

      // Desbloqueia marco de lore
      const unlocked = metaManager.unlockStoryMilestone(
        'story_ancient_tablet_read',
        eventManager,
        'A Tábua dos Primordiais',
        'Inscrições antigas revelam o caminho da transcendência.'
      );

      expect(unlocked).toBe(true);
      expect(metaManager.hasStoryMilestone('story_ancient_tablet_read')).toBe(true);
      expect(milestoneDispatched).toBe(true);

      // Exporta estado global (meta-save para o disco)
      const savedState = metaManager.getGlobalState();
      expect(savedState.unlockedStoryMilestones).toContain('story_ancient_tablet_read');

      // Simula uma nova run com novo MetaProgressionManager
      const newRunMeta = new MetaProgressionManager(mockLogger as any);
      newRunMeta.loadGlobalState(savedState);

      expect(newRunMeta.hasStoryMilestone('story_ancient_tablet_read')).toBe(true);
    });

    it('deve armazenar flags narrativas genéricas com valores arbitrários', () => {
      metaManager.setStoryFlag('npc_molor_affinity', 85);
      metaManager.setStoryFlag('celestial_mirror_shards', 3);

      expect(metaManager.getStoryFlag('npc_molor_affinity')).toBe(85);
      expect(metaManager.getStoryFlag('celestial_mirror_shards')).toBe(3);
      expect(metaManager.getStoryFlag('non_existent', 0)).toBe(0);

      // Persistência
      const state = metaManager.getGlobalState();
      const nextRunMeta = new MetaProgressionManager(mockLogger as any);
      nextRunMeta.loadGlobalState(state);

      expect(nextRunMeta.getStoryFlag('celestial_mirror_shards')).toBe(3);
    });
  });

  describe('2. Registro Dinâmico de Classes no PlayerClassManager', () => {
    it('deve permitir registrar classes em tempo de execução no Player sem travar o array estático', () => {
      let classRegisteredEvent = false;
      eventManager.on('classRegistered', (ev) => {
        if (ev.className === 'Apostolo') {
          classRegisteredEvent = true;
        }
      });

      const evolvingClass = EvolvingClassTemplate.create('Apostolo')
        .withStage(1, (stage) => {
          stage.setTitle('Noviço')
            .setDescription('Iniciado nos mistérios.')
            .addSkill(1, SkillTemplate.create('smite', 'Punição', 'Golpe sagrado').asActive().toSkill());
        })
        .buildClass(xpTable, player, eventManager);

      player.registerClass(evolvingClass, true);

      expect(classRegisteredEvent).toBe(true);
      expect(player.unlockedClasses).toContain('Apostolo');
      expect(player.classes.some(c => c.name === 'Apostolo')).toBe(true);

      // Pode trocar de classe imediatamente
      player.setActiveClass('Apostolo');
      expect(player.activeClass).toBe('Apostolo');
    });

    it('deve permitir registrar classes globalmente via Factory para novos jogadores', () => {
      EvolvingClassTemplate.create('Xamã do Éter')
        .withStage(1, (stage) => {
          stage.setTitle('Andarilho dos Espíritos');
        })
        .registerGlobally();

      // Novo jogador gerado em outra sessão
      const newPlayer = new Player(2, { x: 50, y: 50 }, new Attributes(6, 1, 10, 10, 10, 10, 10, 10), eventManager);
      expect(newPlayer.classes.some(c => c.name === 'Xamã do Éter')).toBe(true);
    });
  });

  describe('3. Evolução de Estágios & Metamorfose da Árvore de Habilidades', () => {
    let voidHarbinger: EvolvingClassBase;

    beforeEach(() => {
      const skillTier1 = SkillTemplate.create('void_bolt', 'Dardo Sombrio', 'Dispara um dardo etéreo').asActive(1).toSkill();
      const skillTier2 = SkillTemplate.create('void_rift', 'Fenda Dimensional', 'Abre uma fenda no espaço').asActive(2).toSkill();
      const skillTrueForm = SkillTemplate.create('singularity', 'Supernova Dimensional', 'Colapso total do espaço').asActive(4).toSkill();

      voidHarbinger = EvolvingClassTemplate.create('Arauto do Vazio')
        .withInitialStage(1)
        .withStage(1, (stage) => {
          stage.setTitle('O Receptáculo')
            .setDescription('Um mortal tocado pelo abismo primordial.')
            .withVisualTint('#2A1635')
            .addSkill(1, skillTier1);
        })
        .withStage(2, (stage) => {
          stage.setTitle('O Despertar do Vazio')
            .setDescription('A mente se expande e canaliza a distorção.')
            .withVisualTint('#4A148C')
            .requireMilestone('story_ancient_tomb_opened')
            .requirePlayerLevel(3)
            .withAttributeBonuses({ intelligence: 5 })
            .addSkill(1, skillTier1)
            .addSkill(4, skillTier2);
        })
        .withStage(3, (stage) => {
          stage.setTitle('A Forma Verdadeira: Devorador de Éter')
            .setDescription('Transcendeu a casca mortal.')
            .withVisualTint('#00E5FF')
            .requireMilestone('story_defeat_ancient_boss')
            .withAttributeBonuses({ intelligence: 10, wisdom: 10 })
            .addSkill(1, skillTier1)
            .addSkill(4, skillTier2)
            .addSkill(8, skillTrueForm);
        })
        .buildClass(xpTable, player, eventManager);

      player.registerClass(voidHarbinger, true);
      player.setActiveClass('Arauto do Vazio');
    });

    it('deve iniciar no Estágio 1 com habilidades e visual correspondentes', () => {
      expect(voidHarbinger.currentStage).toBe(1);
      expect(voidHarbinger.maxStage).toBe(3);
      expect(voidHarbinger.stageTitle).toBe('O Receptáculo');
      expect((player as any).visualTint).toBe('#2A1635');
      expect(voidHarbinger.allSkills.length).toBe(1);
      expect(voidHarbinger.allSkills[0]?.id).toBe('void_bolt');
    });

    it('deve bloquear a ascensão se os requisitos de história não forem atendidos', () => {
      // Jogador ainda não abriu a tumba antiga
      expect(metaManager.hasStoryMilestone('story_ancient_tomb_opened')).toBe(false);
      expect(voidHarbinger.canAscend(metaManager)).toBe(false);

      const ascended = voidHarbinger.ascend(metaManager);
      expect(ascended).toBe(false);
      expect(voidHarbinger.currentStage).toBe(1);
    });

    it('deve ascender para o Estágio 2 após cumprir o requisito narrativo, atualizando skills e visual', () => {
      let ascensionEventFired = false;
      eventManager.on('classStageAscended', (ev) => {
        if (ev.className === 'Arauto do Vazio' && ev.newStage === 2) {
          ascensionEventFired = true;
          expect(ev.stageTitle).toBe('O Despertar do Vazio');
          expect(ev.visualTint).toBe('#4A148C');
        }
      });

      // Jogador descobre o segredo da tumba
      metaManager.unlockStoryMilestone('story_ancient_tomb_opened');
      expect(voidHarbinger.canAscend(metaManager)).toBe(true);

      const initialInt = player.attributes.intelligence;
      const success = voidHarbinger.ascend(metaManager);

      expect(success).toBe(true);
      expect(ascensionEventFired).toBe(true);
      expect(voidHarbinger.currentStage).toBe(2);
      expect(voidHarbinger.stageTitle).toBe('O Despertar do Vazio');
      expect((player as any).visualTint).toBe('#4A148C');
      expect(player.attributes.intelligence).toBe(initialInt + 5);

      // A árvore de habilidades agora tem 2 skills
      expect(voidHarbinger.allSkills.length).toBe(2);
      expect(voidHarbinger.allSkills.some(s => s.id === 'void_rift')).toBe(true);
    });

    it('deve permitir transcender até o estágio final (Forma Verdadeira)', () => {
      // 1. Estágio 1 -> Estágio 2
      metaManager.unlockStoryMilestone('story_ancient_tomb_opened');
      voidHarbinger.ascend(metaManager);
      expect(voidHarbinger.currentStage).toBe(2);

      // 2. Estágio 2 -> Estágio 3 (bloqueado sem boss)
      expect(voidHarbinger.canAscend(metaManager)).toBe(false);

      // 3. Derrota o boss ancestral
      metaManager.unlockStoryMilestone('story_defeat_ancient_boss');
      expect(voidHarbinger.canAscend(metaManager)).toBe(true);

      const success = voidHarbinger.ascend(metaManager);
      expect(success).toBe(true);
      expect(voidHarbinger.currentStage).toBe(3);
      expect(voidHarbinger.stageTitle).toBe('A Forma Verdadeira: Devorador de Éter');
      expect((player as any).visualTint).toBe('#00E5FF'); // Cyan cósmico de transcendência

      // Habilidade final liberada
      expect(voidHarbinger.allSkills.length).toBe(3);
      expect(voidHarbinger.allSkills.some(s => s.id === 'singularity')).toBe(true);

      // Não pode mais ascender além do estágio máximo
      expect(voidHarbinger.canAscend(metaManager)).toBe(false);
    });
  });
});
