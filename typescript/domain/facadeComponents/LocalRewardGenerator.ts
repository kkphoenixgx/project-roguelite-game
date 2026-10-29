export interface LocalRewardItem {
  id: string;
  name: string;
  desc: string;
  iconSvg?: string;
}

export const BASE_LOCAL_REWARDS: LocalRewardItem[] = [
  { id: 'stat_str', name: 'Força Titânica', desc: '+1 Força Base' },
  { id: 'stat_con', name: 'Vigor Inabalável', desc: '+1 Constituição' },
  { id: 'stat_int', name: 'Mente Brilhante', desc: '+1 Inteligência' },
  { id: 'stat_dex', name: 'Agilidade Felina', desc: '+1 Destreza' },
  { id: 'stat_cha', name: 'Presença Magnética', desc: '+1 Carisma' },
  { id: 'stat_wis', name: 'Clarividência', desc: '+1 Sabedoria' },
  { id: 'der_speed', name: 'Passos Leves', desc: '+10 Velocidade' },
  { id: 'der_crit_chance', name: 'Golpe Certeiro', desc: '+5% Chance de Crítico' },
  { id: 'der_crit_dmg', name: 'Força Bruta', desc: '+20% Dano Crítico' },
  { id: 'der_splash', name: 'Impacto Sísmico', desc: '+10% Dano em Área' },
  { id: 'der_def', name: 'Carapaça Dura', desc: '+3 Defesa' },
  { id: 'der_dodge', name: 'Reflexos', desc: '+5% Esquiva' },
  { id: 'der_luck', name: 'Sorte Grande', desc: '+2 Sorte' },
  { id: 'der_pierce', name: 'Lâmina Penetrante', desc: '+1 Perfuração' },
  { id: 'der_maxhp', name: 'Vitalidade Pura', desc: '+20 Max Vida & Cura' },
  { id: 'der_lifesteal', name: 'Sede de Sangue', desc: '+3% Roubo de Vida' },
  { id: 'der_area', name: 'Impacto Expansivo', desc: '+15% Área de Efeito' },
  { id: 'der_recharge', name: 'Fluxo Acelerado', desc: '+10% Redução de Recarga' },
  { id: 'der_tenacity', name: 'Determinação Férrea', desc: '+15% Tenacidade' },
  { id: 'der_vigor', name: 'Seiva Curativa', desc: '+20% Eficácia de Cura' },
  { id: 'der_insight', name: 'Epifania Arcana', desc: '+15% Ganho de XP' }
];

export function generateRandomLocalRewards(count: number = 3): { id: string; name: string; desc: string; iconSvg: string }[] {
  return [...BASE_LOCAL_REWARDS]
    .sort(() => 0.5 - Math.random())
    .slice(0, count)
    .map(r => ({ ...r, iconSvg: '' }));
}
