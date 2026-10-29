/**
 * Helper centralizado com templates e SVG strings padronizados
 * para todo o Adaptador Web (CharacterMenu, Loadout, HUD, etc.)
 */
import starPrimordialSvg from '../assets/svgs/star-primordial.svg?raw';
import sunBroochSvg from '../assets/svgs/sun-brooch.svg?raw';
import trianglePassiveSvg from '../assets/svgs/triangle-passive.svg?raw';
import circleOrbSvg from '../assets/svgs/circle-orb.svg?raw';

export const SlotSvgAssets = {
    starPrimordial: starPrimordialSvg,
    sunBrooch: sunBroochSvg,
    trianglePassive: trianglePassiveSvg,
    circleOrb: circleOrbSvg
};

export function createSlotSvgElement(type: 'star' | 'sun' | 'triangle' | 'circle'): SVGElement {
    const parser = new DOMParser();
    let raw = SlotSvgAssets.starPrimordial;
    if (type === 'sun') raw = SlotSvgAssets.sunBrooch;
    else if (type === 'triangle') raw = SlotSvgAssets.trianglePassive;
    else if (type === 'circle') raw = SlotSvgAssets.circleOrb;

    const doc = parser.parseFromString(raw, 'image/svg+xml');
    return document.importNode(doc.documentElement, true) as unknown as SVGElement;
}
