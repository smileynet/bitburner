export class PurchaseAgent {
    constructor(ns, messenger, scanner, min_server_ram = 8) {
        this.max_servers = ns.getPurchasedServerLimit();
        this.max_server_ram = ns.getPurchasedServerMaxRam();
        this.min_server_ram = min_server_ram;
        this.messenger = messenger;
        this.scanner = scanner;
    }

    run(ns) {
        if (!ns.fileExists('money.txt')) {
            this.purchase_hacking_programs(ns)
            this.purchase_home_upgrades(ns)
            if (this.current_servers(ns).length < this.max_servers) {
                console.debug(`Under max purchased server limit, attempting purchase.`)
                this.purchase_server(ns);
            } else {
                this.current_servers(ns).forEach(server => { this.replace_server(ns, server) })
            }
        }
    }

    funds_avail(ns, type) {
        const items = {
            purchased_server: { ratio: 0.5 },
            hacking_program: { ratio: 1 },
            home_ram: { ratio: 1 }
        }

        const ratio = Math.min(items[type].ratio, 1) // Ratio should not exceed 1
        const current_money = ns.getServerMoneyAvailable("home");
        return current_money * ratio;
    }

    current_servers(ns) {
        return ns.getPurchasedServers();
    }

    purchase_server(ns) {
        const ram_amount = this.max_affordable_ram(ns);
        if (ram_amount > 0) {
            const hostname = ns.purchaseServer("hackserv-" + (this.current_servers(ns).length < 9 ? '0' : '') + (this.current_servers(ns).length + 1), ram_amount);
            const message = `${hostname} purchased with ${ram_amount} RAM.\n`
            this.scanner.add_server(ns, hostname);
            this.messenger.append_message('PurchaseAgent Server Purchased:', message);
            ns.toast(message);
        }
    }

    replace_server(ns, server_name) {
        const ram_amount = this.max_affordable_ram(ns);
        if (ram_amount > ns.getServerMaxRam(server_name)) {
            ns.killall(server_name);
            ns.deleteServer(server_name);
            const hostname = ns.purchaseServer(server_name, ram_amount);
            const message = `${hostname} upgraded to ${ram_amount} RAM.\n`
            this.scanner.add_server(ns, hostname);
            this.messenger.append_message(`PurchaseAgent upgraded:`, message);
            ns.toast(message);
        }
    }

    max_affordable_ram(ns) {
        let test_ram_amount = this.min_server_ram;
        while (ns.getPurchasedServerCost(test_ram_amount) < this.funds_avail(ns, 'purchased_server')) {
            var affordable_ram_amount = test_ram_amount;
            test_ram_amount *= 2;
        }
        if (test_ram_amount > this.max_server_ram) { test_ram_amount = this.max_server_ram; }
        console.debug(`Affordable ram amount: ${affordable_ram_amount}`);
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
            this.messenger.add_message('PurchaseAgent program(s) purchased:', message)
        }
    }

    purchase_home_upgrades(ns) {
        const ram_cost = ns.getUpgradeHomeRamCost();
        if (ram_cost < this.funds_avail(ns, 'home_ram')) {
            ns.upgradeHomeRam();
            const event = `Home RAM upgraded!`
            ns.toast(event)
            this.messenger.add_message('PurchaseAgent home upgrade purchased:', event)
        }
    }
}