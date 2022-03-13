/** @param {NS} ns **/
export async function main(ns) {
    ns.exec("singularity/buy_all_augs.js","home");
    while(ns.scriptRunning("singularity/buy_all_augs.js", "home")){
        await ns.sleep(1000);
    }
    ns.print(`Reloading!`)
    ns.tprint(`Reloading!`)
    ns.toast(`Reloading!`)
    ns.installAugmentations("init.js");
}