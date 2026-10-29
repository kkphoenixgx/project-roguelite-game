export interface Point {
    x: number;
    y: number;
}

export interface HitboxModel {
    id: string;
    type: 'polygon' | 'circle';
    //? Ponto de ancoragem/origem (geralmente centro ou top-left do sprite)
    coordinates: Point;
    rotation: number;
    
    //? Vértices locais utilizados quando type === 'polygon'
    points?: Point[];
    //? Raio geométrico em pixels utilizado quando type === 'circle'
    radius?: number;
}