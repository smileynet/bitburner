/**
* @param {NS} ns
**/

export async function main(ns) {
    var target = ns.args[0];
    var amount_stolen = await ns.hack(target);
    ns.print(`${target} hack complete! \$${ns.nFormat(amount_stolen / 1000,'0,0')}k stolen!`)
    //ns.tprint(`${target} hack complete! \$${ns.nFormat(amount_stolen / 1000,'0,0')}k stolen!`)
    //ns.toast(`${target} hack complete! \$${ns.nFormat(amount_stolen / 1000,'0,0')}k stolen!`)
}