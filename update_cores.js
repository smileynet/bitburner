/** @param {NS} ns **/
export async function main(ns) {
    var home = ns.getServer("home");
    await ns.write("/data/home_cores.txt", home['cpuCores'], "w");
}