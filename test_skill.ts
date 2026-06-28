import Skill from "./typescript/domain/Skills/Skill";
import Pescador from "./typescript/domain/ObjectModule/Entities/Player/Classes/Pescador";
import Player from "./typescript/domain/ObjectModule/Entities/Player/Player";
import DefaultXPTable from "./typescript/domain/ObjectModule/Entities/DefaultXPTable";

// Create mock event manager that satisfies IEventManager
const mockEventManager = {
    dispatch: (event: any, payload: any) => {},
    subscribe: (event: any, callback: any) => {},
    unsubscribe: (event: any, callback: any) => {},
    clear: () => {}
} as any;

const p = new Player({x:0, y:0}, {width:10, height:10}, mockEventManager);
const pesc = new Pescador(new DefaultXPTable(), p, mockEventManager);

console.log("Pescador Skills:");
console.log(JSON.stringify(pesc.allSkills, null, 2));
