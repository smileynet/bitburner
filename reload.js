/** @param {NS} ns **/
export async function main(ns) {
    ns.exec("singularity/buy_all_augs.js","home");
    while(ns.scriptRunning("singularity/buy_all_augs.js", "home")){
        await ns.sleep(1000);
    }
    ns.installAugmentations("init.js");
}