import Utils from "/src/utils.js";
import Messenger from "/src/messenger";
import Scanner from "/src/scanner";

async function kill_all(ns) {
    ns.tprint(`Killing all processes!`)
    const scanner = new Scanner(ns, new Messenger(false));
    scanner.refresh(ns)
    const bots = scanner.bot_servers(ns);
    for (const bot of bots) {
        if (bot.name == 'home') continue
        ns.killall(bot.name)
    }
}



/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    await kill_all(ns)
}