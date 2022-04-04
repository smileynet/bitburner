/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    let minutes = 10
    for (let i = 0; i < minutes; i++) {
        {
            ns.print(`Sleeper script is sleeping. ${minutes-i} minutes remaining until waker script is called...`)
            await ns.sleep(60000)
        }
    }
    ns.tprint(`Calling waker!`)
    ns.run(`/src/scriptlauncher.js`, 1, '/utils/waker.js')
}