/** @param {NS} ns **/
export async function main(ns) {
    let reserved_ram = 100
    if (ns.args[0]) reserved_ram = ns.args[0]
    const script_name = '/utils/share.js'
    let available_ram = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
    available_ram -= reserved_ram
    const ram_cost = ns.getScriptRam(script_name, 'home')
    const max_threads = Math.floor(available_ram / ram_cost)
    ns.tprint(`Spawning ${script_name} with ${max_threads} threads`)
    ns.spawn(script_name, max_threads)
}