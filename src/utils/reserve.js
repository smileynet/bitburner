/** @param {NS} ns **/
export async function main(ns) {
    const result = await ns.write('reserved.txt', '1000000000000', 'w')
    ns.tprint(`reserved.txt written: ${result}`)
    ns.run(`/src/botmaster.js`)
}