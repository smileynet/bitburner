/** @param {NS} ns **/
export async function main(ns) {
    const result = await ns.write('exp.txt', 'true', 'w')
    ns.tprint(`exp.txt written: ${result}`)
}