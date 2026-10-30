import Helmet from "./Helmet";

export default class IronHelmet extends Helmet {
    constructor() {
        super(
            5,
            0,
            'Capacete de Ferro',
            'Um capacete robusto. Protege o que sobrou da sua inteligência.',
            10,
            'common',
            10,
            50,
            100,
            [],
            1,
            { strength: 2 },
            false,
            true
        );
    }
}