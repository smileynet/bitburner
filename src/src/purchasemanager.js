import Utils from 'src/utils'
import Messenger from "/src/messenger";
import Scanner from "/src/scanner";


export class PurchaseManager {
    constructor(ns, messenger, min_server_ram = 16) {
        this.max_servers = ns.getPurchasedServerLimit();
        this.max_server_ram = 1024 // ns.getPurchasedServerMaxRam();
        this.min_server_ram = min_server_ram;
        this.messenger = messenger;
        this.finished = false;
        this.initial_step_size = 4;
        this.initial_step_end = 1024;
    }

    async run(ns) {
        if (!ns.fileExists('money.txt') || ns.fileExists('exp.txt')) {
            this.purchase_hacking_programs(ns)
            this.purchase_home_upgrades(ns)
            this.purchase_servers(ns);
            await this.status_update(ns);
        } else {
            this.messenger.add_message(`PurchaseManager status update`,
                `  Currently skipping purchases.`)
        }
        this.finished = true;
    }


    async status_update(ns) {
        this.messenger.add_message(`PurchaseManager next purchased server`,
            `  Cost: $${Utils.pretty_num(this.next_cost)}   RAM: ${this.next_ram}`)
        await ns.write(`/data/server_ram_size.txt`, this.next_ram, 'w')
        await ns.write(`/data/server_ram_cost.txt`, this.next_cost, 'w')
    }
    funds_avail(ns, type) {
        const items = {
            purchased_server: { ratio: 0.5 },
            hacking_program: { ratio: 1 },
            home_ram: { ratio: 1 }
        }

        let ratio = Math.min(items[type].ratio, 1)

        if (type == "purchased_server") {
            if (this.current_servers(ns) < this.max_servers | ns.fileExists('exp.txt')) {
                ratio = 1
            } else {
                const current_ram = ns.getServerMaxRam(ns.getPurchasedServers()[0])
                const lots_of_ram = 1024
                if (current_ram >= lots_of_ram) {
                    ratio = 0.1
                }
            }
        }
        const current_money = ns.getServerMoneyAvailable("home");
        return current_money * ratio;
    }

    current_servers(ns) {
        return ns.getPurchasedServers();
    }

    purchase_servers(ns) {
        if (this.current_servers(ns).length < this.max_servers) {
            let ram_amount = this.max_affordable_ram(ns);
            while (this.current_cost < this.funds_avail(ns, 'purchased_server') && this.current_servers(ns).length < this.max_servers) {
                this.purchase_server(ns, ram_amount)
                ram_amount = this.max_affordable_ram(ns);
            }
        } else {
            this.current_servers(ns).forEach(server => { this.replace_server(ns, server) })
        }
    }

    purchase_server(ns, ram_amount) {
        const hostname = ns.purchaseServer("hackserv-" + (this.current_servers(ns).length < 9 ? '0' : '') + (this.current_servers(ns).length + 1), ram_amount);
        const message = `  ${hostname} purchased with ${ram_amount} RAM.\n`
        this.messenger.append_message('PurchaseManager Server Purchased:', message);
        ns.toast(message);
    }

    replace_server(ns, server_name) {
        const ram_amount = this.max_affordable_ram(ns);
        if (ram_amount > ns.getServerMaxRam(server_name)) {
            ns.killall(server_name);
            ns.deleteServer(server_name);
            const hostname = ns.purchaseServer(server_name, ram_amount);
            const message = `  ${hostname} upgraded to ${ram_amount} RAM.\n`
            this.messenger.append_message(`PurchaseManager upgraded:`, message);
            ns.toast(message);
        }
    }

    max_affordable_ram(ns) {
        let test_ram_amount = this.min_server_ram;
        let affordable_ram_amount = test_ram_amount;
        while (ns.getPurchasedServerCost(test_ram_amount) < this.funds_avail(ns, 'purchased_server')) {
            affordable_ram_amount = test_ram_amount;
            if (test_ram_amount >= this.initial_step_end) {
                test_ram_amount *= 2
            } else {
                test_ram_amount *= this.initial_step_size;
            }
        }
        if (test_ram_amount > this.max_server_ram) { test_ram_amount = this.max_server_ram; }
        const cost = ns.getPurchasedServerCost(test_ram_amount)
        this.current_cost = ns.getPurchasedServerCost(affordable_ram_amount)
        this.next_cost = cost
        this.next_ram = test_ram_amount
        return affordable_ram_amount;
    }

    purchase_hacking_programs(ns) {
        const hacking_programs = [];
        hacking_programs.push({ 'name': 'BruteSSH.exe', 'cost': 500000 })
        hacking_programs.push({ 'name': 'FTPCrack.exe', 'cost': 1500000 })
        hacking_programs.push({ 'name': 'relaySMTP.exe', 'cost': 5000000 })
        hacking_programs.push({ 'name': 'HTTPWorm.exe', 'cost': 30000000 })
        hacking_programs.push({ 'name': 'SQLInject.exe', 'cost': 250000000 })

        const player = ns.getPlayer();
        let message = ""
        if (player.tor == false) {
            const tor_cost = 200000;
            if (tor_cost < this.funds_avail(ns, 'hacking_program')) {
                ns.purchaseTor();
                let event = "  TOR purchased!\n"
                ns.toast(event)
                message += event
            }
        } else {
            for (const program of hacking_programs) {
                if (ns.fileExists(program.name, "home") == false) {
                    if (program.cost < this.funds_avail(ns, 'hacking_program')) {
                        ns.purchaseProgram(program.name);
                        let event = `  ${program.name} purchased!\n`
                        ns.toast(event)
                        message += event
                    }
                }
            }
        }

        if (message != "") {
            this.messenger.add_message('PurchaseManager program(s) purchased:', message)
        }
    }

    purchase_home_upgrades(ns) {
        const ram_cost = ns.getUpgradeHomeRamCost();
        if (ram_cost < this.funds_avail(ns, 'home_ram')) {
            ns.upgradeHomeRam();
            const event = `  Home RAM upgraded!`
            ns.toast(event)
            this.messenger.add_message('PurchaseManager home upgrade purchased:', event)
        }
    }
}


/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const verbose = false
    const messenger = new Messenger(verbose);
    messenger.init(ns);
    let purchase_agent = new PurchaseManager(ns, messenger);
    while (!purchase_agent.finished) {
        await purchase_agent.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default PurchaseManager;