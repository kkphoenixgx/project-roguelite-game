import GameOverGui from './GameOverGui';

export default {
  title: 'GUI/GameOver',
};

const createGui = (mockDomain: any) => {
  const gui = new GameOverGui(() => {}, mockDomain);
  gui.show();
  return gui['container'];
};

export const Default = () => {
  return createGui({
    metaProgressionManager: {
      lastRunSummary: { totalReward: 1000, breakdown: { levelReward: 500, featsReward: 500, maxLevel: 10, feats: [ { name: "First Blood", value: 100 }, { name: "Boss Killed", value: 400 } ] } }
    }
  });
};

export const NoFeats = () => {
  return createGui({
    metaProgressionManager: {
      lastRunSummary: { totalReward: 150, breakdown: { levelReward: 150, featsReward: 0, maxLevel: 3, feats: [] } }
    }
  });
};

export const ManyFeatsScroll = () => {
  return createGui({
    metaProgressionManager: {
      lastRunSummary: { totalReward: 5000, breakdown: { levelReward: 2000, featsReward: 3000, maxLevel: 40, feats: [
        { name: "First Blood", value: 100 }, { name: "Double Kill", value: 200 }, { name: "Triple Kill", value: 300 },
        { name: "Ultra Kill", value: 400 }, { name: "Rampage", value: 500 }, { name: "Godlike", value: 1000 },
        { name: "Unstoppable", value: 500 }
      ] } }
    }
  });
};
