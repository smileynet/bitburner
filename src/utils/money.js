/** @param {NS} ns **/
export async function main(ns) {
    const result = await ns.write('money.txt', 'true', 'w')
    ns.tprint(`Money.txt written: ${result}`)
}