import type { action } from "./actions.type";

// Mapeamento global de "Qual classe escuta qual ação" a nível de Prototype
export const ClassActionBindings = new Map<string, Map<action, string>>();

/**
 * Decorator que vincula automaticamente a execução de um método a uma ação do jogo.
 * @param actionName O nome da ação (ex: 'up', 'castSpell', 'spell_0')
 */
export function BindAction(actionName: action) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Usa o nome da classe em string para evitar perda de identidade por referência circular do Vite
        const className = target.constructor.name;
        if (!ClassActionBindings.has(className)) {
            ClassActionBindings.set(className, new Map());
        }
        const bindings = ClassActionBindings.get(className)!;
        if (bindings.has(actionName)) {
            throw new Error(`Conflito de Bind: A classe ${className} já registrou a ação '${actionName}' em outro método.`);
        }
        bindings.set(actionName, propertyKey);
    };
}