class Test {
    constructor() {

    }


    run(ns) {

    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.tprint(ns.bladeburner.getBlackOpNames())
    const test = new Test();
    test.run(ns);
}