/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        const currentHashes = ns.hacknet.numHashes();
        if (currentHashes > 5) {
            ns.print(`Using hashes: Sell for Money.`)
            ns.hacknet.spendHashes("Sell for Money")
        } else {
            await ns.sleep(1000)
        }
    }
}