export interface ICollisionService {
    //? Array serializado linear [id, x, y, radius, ...] para colisão de projéteis e entidades
    checkCollisions(hitboxData: Float32Array, hitboxCount: number, worldBounds: { x: number, y: number, width: number, height: number }, callback: (result: Int32Array) => void): void;
}