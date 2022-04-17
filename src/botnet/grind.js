/**
 * @param {NS} ns
 **/

export async function main(ns) {
    for (let i = 0; i < 100; i++) {
        var target = 'joesguns';
        await ns.weaken(target);
        ns.print(`${target} weaken complete`);
    }
}