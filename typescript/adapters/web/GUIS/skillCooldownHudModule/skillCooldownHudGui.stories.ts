import type { Meta, StoryObj } from '@storybook/html';
import SkillCooldownHudGui from './SkillCooldownHudGui';
import type { EntityRenderableState } from '../../../../domain/ports/domain-contracts';

const mockState: EntityRenderableState = {
    id: 1,
    coordinates: { x: 0, y: 0 },
    size: { width: 32, height: 32 },
    rotation: 0,
    entityTypeId: 'player',
    activeClass: 'Mago',
    activeLoadout: ['m_t1_fireball', 'm_t4_teleport', 'w_t2_cleave', 'pesc_t2_net'],
    globalActiveLoadout: ['brooch_meteor', 'brooch_blink', 'brooch_active_heal', null],
    skillTree: [
        { id: 'm_t1_fireball', name: 'Axioma Inicial', description: 'Disparo arcano.', type: 'essential', tier: 1, unlocked: true, canUnlock: false },
        { id: 'm_t4_teleport', name: 'Translocação (Blink)', description: 'Teleporte rápido.', type: 'active', tier: 4, unlocked: true, canUnlock: false },
        { id: 'w_t2_cleave', name: 'Corte Giratório', description: 'Ataque em área 360.', type: 'active', tier: 2, unlocked: true, canUnlock: false },
        { id: 'pesc_t2_net', name: 'Rede Pesada', description: 'Enraíza inimigos.', type: 'active', tier: 2, unlocked: true, canUnlock: false },
        { id: 'pesc_t4_fishpet', name: 'Peixinho Místico', description: 'Companheiro peixe.', type: 'essential', tier: 1, unlocked: true, canUnlock: false }
    ],
    skillCooldowns: {}
};

const mockDomain: any = {
    globalMetaSummary: {
        brooches: [
            { id: 'brooch_meteor', name: 'Meteoro Ígneo', description: 'Evoca uma chuva de meteoros.' },
            { id: 'brooch_blink', name: 'Salto Dimensional', description: 'Teleporte relâmpago.' },
            { id: 'brooch_active_heal', name: 'Cálice da Vida', description: 'Cura 30% da vida.' }
        ]
    }
};

interface StoryArgs {}

const meta: Meta<StoryArgs> = {
    title: 'HUD/SkillCooldownHudGui',
    render: () => {
        const existing = document.getElementById('skill-cooldown-hud-container');
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';
        wrapper.style.backgroundColor = '#100e14';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';

        const controls = document.createElement('div');
        controls.style.position = 'absolute';
        controls.style.top = '30px';
        controls.style.left = '30px';
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.gap = '12px';
        controls.style.color = '#fff';
        controls.style.fontFamily = 'sans-serif';
        controls.style.zIndex = '50';
        controls.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; color: #00e5ff;">Controle Interativo de Cooldowns (Canto Esquerdo Inferior)</div>
            <div style="font-size: 13px; color: #aaa; max-width: 500px; line-height: 1.5;">
                O HUD permanece <strong>100% invisível</strong> quando nenhuma habilidade está em cooldown.<br>
                Ao usar uma habilidade, um quadradinho aparece dinamicamente no canto esquerdo com o <strong>relógio radial (sweep)</strong> e o contador em segundos.<br>
                Ao zerar, ele dá um flash e <strong>desaparece sozinho</strong>.
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
                <button id="btn-fireball" style="padding: 8px 14px; background: #008ba3; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Usar Slot 1 [Axioma] (2.5s)</button>
                <button id="btn-blink" style="padding: 8px 14px; background: #008ba3; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Usar Slot 2 [Blink] (4s)</button>
                <button id="btn-cleave" style="padding: 8px 14px; background: #008ba3; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Usar Slot 3 [Corte] (6s)</button>
                <button id="btn-pet" style="padding: 8px 14px; background: #c2185b; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Usar Primordial [★ / F] (10s)</button>
                <button id="btn-meteor" style="padding: 8px 14px; background: #b28900; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Usar Broche [✦ / 5] (15s)</button>
            </div>
        `;
        wrapper.appendChild(controls);

        const gui = new SkillCooldownHudGui(mockDomain);

        // Loop simulando o game loop da engine chamando update() a 60 FPS
        let animId: number;
        const tick = () => {
            gui.update(mockState);
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);

        setTimeout(() => {
            controls.querySelector('#btn-fireball')?.addEventListener('click', () => {
                gui.triggerCooldown('m_t1_fireball', 2500, 'Axioma Inicial', '1', 'class');
            });
            controls.querySelector('#btn-blink')?.addEventListener('click', () => {
                gui.triggerCooldown('m_t4_teleport', 4000, 'Translocação', '2', 'class');
            });
            controls.querySelector('#btn-cleave')?.addEventListener('click', () => {
                gui.triggerCooldown('w_t2_cleave', 6000, 'Corte Giratório', '3', 'class');
            });
            controls.querySelector('#btn-pet')?.addEventListener('click', () => {
                gui.triggerCooldown('pesc_t4_fishpet', 10000, 'Peixinho Místico', 'F', 'primordial');
            });
            controls.querySelector('#btn-meteor')?.addEventListener('click', () => {
                gui.triggerCooldown('brooch_meteor', 15000, 'Meteoro Ígneo', '5', 'brooch');
            });
        }, 50);

        return wrapper;
    }
};

export default meta;

export const Interativo: StoryObj<StoryArgs> = {};

export const ComMultiplosCooldownsAtivos: StoryObj<StoryArgs> = {
    render: () => {
        const existing = document.getElementById('skill-cooldown-hud-container');
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';
        wrapper.style.backgroundColor = '#100e14';
        wrapper.style.position = 'relative';

        const stateWithCooldowns: EntityRenderableState = {
            ...mockState,
            skillCooldowns: {
                'm_t1_fireball': { totalMs: 3000, remainingMs: 2200 },
                'm_t4_teleport': { totalMs: 5000, remainingMs: 4100 },
                'pesc_t4_fishpet': { totalMs: 10000, remainingMs: 8500 },
                'brooch_meteor': { totalMs: 20000, remainingMs: 16000 }
            }
        };

        const gui = new SkillCooldownHudGui(mockDomain);

        const tick = () => {
            gui.update(stateWithCooldowns);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        return wrapper;
    }
};
