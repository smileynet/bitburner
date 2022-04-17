/**
 * @param {NS} ns
 **/

export async function main(ns) {
    if (ns.args[0]) {
        var target_server = ns.args[0];
    } else {
        var target_server = ns.read("current_target.txt");
    }
    var money_target = ns.getServerMaxMoney(target_server) * 0.75;
    var security_target = ns.getServerMinSecurityLevel(target_server) + 5;

    while (true) {
        var security_level = ns.getServerSecurityLevel(target_server)
        var money_available = ns.getServerMoneyAvailable(target_server)
        if (security_level > security_target) {
            ns.print(`${target_server} security level: ${ns.nFormat(security_level,'0,0.00')} target security threshold: ${security_target}`)
            await ns.weaken(target_server);
            ns.print(`${target_server} weaken complete`)
        } else if (money_available < money_target) {
            ns.print(`${target_server} money available: ${ns.nFormat(money_available,'0,0')} target money threshold: ${ns.nFormat(money_target,'0,0')}`)
            await ns.grow(target_server);
            ns.print(`${target_server} grow complete`)
        } else {
            var amount_stolen = await ns.hack(target_server);
            ns.print(`${target_server} hack complete! \$${ns.nFormat(amount_stolen / 1000,'0,0')}k stolen!`)
        }
    }
}