/** @param {NS} ns **/
export async function main(ns) {
    const script_name = '/utils/share.js'
    const available_ram = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
    const ram_cost = ns.getScriptRam(script_name, 'home')
    const max_threads = Math.floor(available_ram / ram_cost)
    ns.tprint(`Spawning ${script_name} with ${max_threads} threads`)
    ns.spawn(script_name, max_threads)
}