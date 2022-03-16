export class PurchaseAgent {
    constructor(ns, messenger, scanner, min_server_ram = 4) {
        this.max_servers = ns.getPurchasedServerLimit();
        this.max_server_ram = ns.getPurchasedServerMaxRam();
        this.min_server_ram = min_server_ram;
        this.messenger = messenger;
        this.scanner = scanner;
    }

    run(ns) {
        if (this.current_servers(ns).length < this.max_servers) {
            console.debug(`Under max purchased server limit, attempting purchase.`)
            this.purchase_server(ns);
        }
    }

    current_servers(ns) {
        return ns.getPurchasedServers();
    }

    current_money(ns) {
        return ns.getServerMoneyAvailable("home");
    }

    purchase_server(ns) {
        const ram_amount = this.max_affordable_ram(ns);
        if (ram_amount > 0) {
            const hostname = ns.purchaseServer("hackserv-" + (this.current_servers(ns).length < 9 ? '0' : '') + (this.current_servers(ns).length + 1), ram_amount);
            const message = `${hostname} purchased with ${ram_amount}`
            this.scanner.add_server(ns, hostname);
            this.messenger.add_message('PurchaseAgent', message);
            ns.toast(message);
        }
    }

    max_affordable_ram(ns) {
        let test_ram_amount = this.min_server_ram;
        while (ns.getPurchasedServerCost(test_ram_amount) < this.current_money(ns)) {
            var affordable_ram_amount = test_ram_amount;
            test_ram_amount *= 2;
        }
        console.debug(`Affordable ram amount: ${affordable_ram_amount}`);
        return affordable_ram_amount;
    }
}