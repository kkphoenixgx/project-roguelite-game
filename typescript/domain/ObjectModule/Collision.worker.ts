/**
 * @file Web Worker dedicado exclusivamente à detecção de colisões.
 * Recebe o estado de todos os objetos, constrói uma Quadtree e retorna os pares que colidiram.
*/

import Quadtree from "../shared/QuadTree";

type BoundedElement = {
    id: number;
    type: number;
    x: number; y: number; // TopLeft bounding box for QuadTree
    width: number; height: number;
    radius?: number;
    cx?: number; cy?: number;
    points?: {x: number, y: number}[];
}

// ======================= LÓGICA SAT DE ALTA PERFORMANCE =======================
function isSeparatingAxis(axis: {x:number,y:number}, polyA: {x:number,y:number}[], polyB: {x:number,y:number}[]) {
    let minA = Infinity, maxA = -Infinity;
    for (let i = 0; i < polyA.length; i++) {
        const proj = polyA[i]!.x * axis.x + polyA[i]!.y * axis.y;
        if (proj < minA) minA = proj; if (proj > maxA) maxA = proj;
    }
    let minB = Infinity, maxB = -Infinity;
    for (let i = 0; i < polyB.length; i++) {
        const proj = polyB[i]!.x * axis.x + polyB[i]!.y * axis.y;
        if (proj < minB) minB = proj; if (proj > maxB) maxB = proj;
    }
    return maxA < minB || maxB < minA;
}

function checkPolyPoly(polyA: {x:number,y:number}[], polyB: {x:number,y:number}[]) {
    for (let i = 0; i < polyA.length; i++) {
        const p1 = polyA[i]!; const p2 = polyA[(i + 1) % polyA.length]!;
        if (isSeparatingAxis({ x: p2.y - p1.y, y: p1.x - p2.x }, polyA, polyB)) return false;
    }
    for (let i = 0; i < polyB.length; i++) {
        const p1 = polyB[i]!; const p2 = polyB[(i + 1) % polyB.length]!;
        if (isSeparatingAxis({ x: p2.y - p1.y, y: p1.x - p2.x }, polyA, polyB)) return false;
    }
    return true;
}

function isSeparatingAxisCircle(axis: {x:number,y:number}, poly: {x:number,y:number}[], cx: number, cy: number, r: number) {
    const len = Math.hypot(axis.x, axis.y);
    if (len === 0) return false;
    const nx = axis.x / len; const ny = axis.y / len;

    let minA = Infinity, maxA = -Infinity;
    for (let i = 0; i < poly.length; i++) {
        const proj = poly[i]!.x * nx + poly[i]!.y * ny;
        if (proj < minA) minA = proj; if (proj > maxA) maxA = proj;
    }
    const circleProj = cx * nx + cy * ny;
    return maxA < circleProj - r || circleProj + r < minA;
}

function checkPolyCircle(poly: {x:number,y:number}[], cx: number, cy: number, r: number) {
    let closestDistSq = Infinity;
    let closestVertex = poly[0]!;
    for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i]!; const p2 = poly[(i + 1) % poly.length]!;
        if (isSeparatingAxisCircle({ x: p2.y - p1.y, y: p1.x - p2.x }, poly, cx, cy, r)) return false;
        const distSq = (p1.x - cx) * (p1.x - cx) + (p1.y - cy) * (p1.y - cy);
        if (distSq < closestDistSq) { closestDistSq = distSq; closestVertex = p1; }
    }
    if (isSeparatingAxisCircle({ x: closestVertex.x - cx, y: closestVertex.y - cy }, poly, cx, cy, r)) return false;
    return true;
}
// ==============================================================================

// Pools em memória global do Worker para evitar alocações a cada mensagem (Zero-GC)
const collidingPairs: number[] = [];
const processedPairs: Set<number> = new Set(); // Usaremos chaves matemáticas!
const elementsPool: BoundedElement[] = [];
const elements: BoundedElement[] = [];

function getPooledElement(index: number): BoundedElement {
    if (index >= elementsPool.length) {
        const newEl = { id: 0, type: 0, x: 0, y: 0, width: 0, height: 0, points: [] };
        elementsPool.push(newEl);
        return newEl;
    }
    return elementsPool[index]!;
}

if (typeof self !== 'undefined') {
    self.addEventListener('message', (event: MessageEvent<{hitboxData: Float32Array, bufferLength: number, worldBounds: any}>) => {    
    const { hitboxData, bufferLength, worldBounds } = event.data;

    const collisionTree = new Quadtree<BoundedElement>(worldBounds);
    elements.length = 0;
    collidingPairs.length = 0;
    processedPairs.clear();

    let offset = 0;
    let elIndex = 0;
    
    while (offset < bufferLength) {
        const id = hitboxData[offset++]!;
        const type = hitboxData[offset++]!;
        
        const element = getPooledElement(elIndex++);
        element.id = id;
        element.type = type;

        if (type === 0) { // Circle
            const cx = hitboxData[offset++]!; const cy = hitboxData[offset++]!; const radius = hitboxData[offset++]!;
            element.cx = cx; element.cy = cy; element.radius = radius;
            element.x = cx - radius; element.y = cy - radius; 
            element.width = radius * 2; element.height = radius * 2;
            elements.push(element); collisionTree.insert(element);
        } else if (type === 1) { // Polygon
            const pointCount = hitboxData[offset++]!;
            if (!element.points) element.points = [];
            element.points.length = pointCount;
            
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let p = 0; p < pointCount; p++) {
                const px = hitboxData[offset++]!; const py = hitboxData[offset++]!;
                if (!element.points[p]) element.points[p] = { x: 0, y: 0 };
                element.points[p]!.x = px;
                element.points[p]!.y = py;
                if (px < minX) minX = px; if (py < minY) minY = py;
                if (px > maxX) maxX = px; if (py > maxY) maxY = py;
            }
            element.x = minX; element.y = minY; 
            element.width = maxX - minX; element.height = maxY - minY;
            elements.push(element); collisionTree.insert(element);
        }
    }

    for (let i = 0; i < elements.length; i++) {
    const elA = elements[i];
    if (!elA) continue;

    const potentialColliders = collisionTree.retrieve(elA);

    for (let j = 0; j < potentialColliders.length; j++) {
        const elB = potentialColliders[j];
        if (!elB) continue;
        if (elA.id === elB.id) continue;

        // Função de emparelhamento de Cantor para IDs únicos (Zero String Allocation)
        const k1 = elA.id < elB.id ? elA.id : elB.id;
        const k2 = elA.id < elB.id ? elB.id : elA.id;
        const pairKey = 0.5 * (k1 + k2) * (k1 + k2 + 1) + k2;
        
        if (processedPairs.has(pairKey)) continue;

        // AABB check já foi feito pela QuadTree, agora checamos com precisão SAT
        if (elA.type === 0 && elB.type === 0) {
            const dx = elA.cx! - elB.cx!; const dy = elA.cy! - elB.cy!;
            if (dx * dx + dy * dy <= (elA.radius! + elB.radius!) ** 2) { collidingPairs.push(elA.id, elB.id); processedPairs.add(pairKey); }
        } else if (elA.type === 1 && elB.type === 1) {
            if (checkPolyPoly(elA.points!, elB.points!)) { collidingPairs.push(elA.id, elB.id); processedPairs.add(pairKey); }
        } else {
            const poly = elA.type === 1 ? elA.points! : elB.points!;
            const circ = elA.type === 0 ? elA : elB;
            if (checkPolyCircle(poly, circ.cx!, circ.cy!, circ.radius!)) { collidingPairs.push(elA.id, elB.id); processedPairs.add(pairKey); }
        }
    }
}

  // Logger visual para atestar o funcionamento do Worker em alta performance
  // if (collidingPairs.length > 0 && Math.random() < 0.05) {
  //     console.log(`[Worker Física] Processando com precisão... Identificados ${collidingPairs.length / 2} toques simultâneos entre ${elements.length} corpos.`);
  // }

  self.postMessage(new Int32Array(collidingPairs));
});
}
