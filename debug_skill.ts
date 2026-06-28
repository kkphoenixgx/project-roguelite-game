import Skill from "./typescript/domain/Skills/Skill";
import Pescador from "./typescript/domain/ObjectModule/Entities/Player/Classes/Pescador";
import Player from "./typescript/domain/ObjectModule/Entities/Player/Player";
import DefaultXPTable from "./typescript/domain/ObjectModule/Entities/DefaultXPTable";
import GameEvents from "./typescript/domain/eventDispacher/GameEvents";

const eventManager = new GameEvents();
const p = new Player({x:0, y:0}, {width:10, height:10}, eventManager);
const pesc = new Pescador(new DefaultXPTable(), p, eventManager);

console.log(JSON.stringify(pesc.allSkills, null, 2));
