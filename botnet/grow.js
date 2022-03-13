/**
* @param {NS} ns
**/

export async function main(ns) {
    var target = ns.args[0];
    await ns.grow(target);
    ns.print(`${target} grow complete`)
}