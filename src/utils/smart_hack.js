import Utils from "/src/utils.js";
import Messenger from "/src/messenger";
import Scanner from "/src/scanner";

async function run_smart_hack(ns) {
    ns.tprint(`Commanding bot army to run independently!`)
    const scanner = new Scanner(ns, new Messenger(false));
    scanner.refresh(ns)
    let targets = scanner.target_servers(ns)
    targets.sort((a, b) => b.growth_money_mult - a.growth_money_mult);
    const best_target = targets[0].name
    const bots = scanner.bot_servers(ns);
    const script_name = '/botnet/smart_hack.js'
    for (const bot of bots) {
        if (bot.name == 'home') continue
        ns.killall(bot.name)
        const script_cost = ns.getScriptRam(script_name, bot.name);
        let max_threads = Math.floor(bot.available_ram / script_cost)
        if (!ns.fileExists(script_name, bot.name)) {
            await ns.scp(script_name, bot.name)
        }
        ns.exec(script_name, bot.name, max_threads, best_target);
        ns.tprint(`${bot.name} running ${max_threads} threads against ${best_target}`)
    }
}



/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    await run_smart_hack(ns)
}