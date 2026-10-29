import { RegisterSpawner } from "../../../SpawnRegistry";
import ObjectElement from "../../../ObjectElement";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import AnimatedMeleeAttack from "./AnimatedMeleeAttack";

const SCYTHE_HITBOXES = [
    [ { id: "p0", type: "polygon", coordinates: {x: 7.6, y: 55.2}, rotation: 0, points: [{x: 7.6, y: 55.2}, {x: 2.9, y: 55.4}, {x: 1.1, y: 57.5}, {x: 3.5, y: 58.9}, {x: 7.1, y: 59.9}, {x: 10.7, y: 62.6}, {x: 12.3, y: 63.4}, {x: 12.4, y: 59.3}] } ],
    [ { id: "p1", type: "polygon", coordinates: {x: 70.4, y: 38.0}, rotation: 0, points: [{x: 70.4, y: 38.0}, {x: 65.3, y: 40.2}, {x: 63.3, y: 46.3}, {x: 66.8, y: 52.6}, {x: 78.9, y: 52.6}, {x: 84.0, y: 59.1}, {x: 88.3, y: 59.3}, {x: 94.2, y: 54.5}, {x: 95.0, y: 46.3}, {x: 86.5, y: 39.0}, {x: 81.7, y: 37.1}] } ],
    [ { id: "p2", type: "polygon", coordinates: {x: 145.5, y: 8.5}, rotation: 0, points: [{x: 145.5, y: 8.5}, {x: 130.4, y: 12.7}, {x: 125.4, y: 19.2}, {x: 129.2, y: 20.9}, {x: 145.7, y: 21.7}, {x: 158.5, y: 28.7}, {x: 168.0, y: 37.1}, {x: 178.7, y: 56.5}, {x: 182.2, y: 62.5}, {x: 191.2, y: 57.2}, {x: 191.8, y: 47.1}, {x: 184.3, y: 30.9}, {x: 172.8, y: 19.1}, {x: 159.9, y: 11.2}] } ],
    [ { id: "p3", type: "polygon", coordinates: {x: 208.7, y: 4.1}, rotation: 0, points: [{x: 208.7, y: 4.1}, {x: 198.9, y: 2.5}, {x: 191.9, y: 4.7}, {x: 192.2, y: 7.8}, {x: 215.1, y: 10.2}, {x: 223.7, y: 15.4}, {x: 239.9, y: 34.7}, {x: 253.5, y: 62.8}, {x: 255.2, y: 59.0}, {x: 253.8, y: 42.8}, {x: 248.4, y: 29.7}, {x: 244.1, y: 20.9}, {x: 236.7, y: 13.0}, {x: 223.7, y: 7.0}] } ],
    [ { id: "p4", type: "polygon", coordinates: {x: 257.7, y: 4.3}, rotation: 0, points: [{x: 257.7, y: 4.3}, {x: 270.1, y: 3.8}, {x: 287.3, y: 6.4}, {x: 305.4, y: 16.1}, {x: 316.9, y: 39.3}, {x: 318.3, y: 49.0}, {x: 318.3, y: 61.7}, {x: 306.9, y: 39.1}, {x: 295.1, y: 22.9}, {x: 281.5, y: 11.8}, {x: 275.1, y: 9.3}, {x: 267.2, y: 7.4}, {x: 259.4, y: 7.1}, {x: 256.3, y: 6.3}] } ],
    [ { id: "p5", type: "polygon", coordinates: {x: 321.8, y: 4.4}, rotation: 0, points: [{x: 321.8, y: 4.4}, {x: 327.8, y: 2.8}, {x: 345.9, y: 4.5}, {x: 358.9, y: 9.4}, {x: 373.3, y: 21.2}, {x: 381.6, y: 44.0}, {x: 382.8, y: 61.6}, {x: 381.6, y: 61.8}, {x: 369.6, y: 36.9}, {x: 363.5, y: 26.8}, {x: 354.4, y: 16.5}, {x: 343.3, y: 10.6}, {x: 333.1, y: 7.6}, {x: 320.0, y: 6.0}] } ]
];


@RegisterSpawner('scytheSlash')
export default class ScytheSlash extends AnimatedMeleeAttack {
    constructor(id: number, payload: any, eventManager: IEventManager) {
        super(id, payload, eventManager, {
            width: 32,
            height: 32,
            typeId: 'scythe-slash',
            totalFrames: 6,
            frameDuration: 3 / 60,
            pivot: { x: 0, y: 32 },
            scale: 0.5,
            originalFrameWidth: 64,
            rawHitboxes: SCYTHE_HITBOXES as any,
            rotationOffset: Math.PI / 4
        });
    }

    public static createSpawn(id: number, payload: any, eventManager: IEventManager): ObjectElement {
        return new ScytheSlash(id, payload, eventManager);
    }
}