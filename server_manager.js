import { read_file_as_number, get_array_from_file, get_shortened_number, get_idle_servers } from "utils.js";

export class ServerManager {
    constructor(ns, pause_to_buy_programs) {
        this.ns = ns;
        this.minimum_server_ram = 2; // Minimum server size to purchase
        this.wait_for_idle = true; // Set this to true to wait for purchased servers to finish running scripts before upgrading.
        this.pause_to_buy_programs = pause_to_buy_programs; // Hold on buying additional servers until exploit programs are bought based on RAM level.
        this.buy_max_server_size = true // Buy the biggest server you can afford.
        this.singularity = true // TODO: Detect singularity automatically
        this.priority_buy = true // Always buy hacking programs if we can afford them.
        this.current_ram_target = this.minimum_server_ram;
        this.update_interval = 120; // How many seconds before purchase reminders.
        this.current_servers = ns.getPurchasedServers();
        this.max_servers = ns.getPurchasedServerLimit();
        this.status = "idle";
        this.bot_scripts = ["/botnet/smart_hack.ns",
            "/botnet/grow_money.ns",
            "/botnet/hack_server.ns",
            "/botnet/weaken_security.ns"];
    }

    async main() {
        var ns = this.ns;
        var current_interval = 0;
        while (true) {
            this.update_ram_target();
            await this.manage_server_capacity();
            if (current_interval >= this.update_interval) {
                this.display_updates();
                current_interval = 0;
            } else {
                current_interval = current_interval + 1;
            }
            this.check_for_completion();
            await ns.sleep(1000);
        }
    }

    get rooted_servers() {
        return get_array_from_file(this.ns, "/data/rooted_servers.txt");
    }

    get idle_servers() {
        return get_idle_servers(this.ns);
    }

    get highest_current_server_ram() {
        var ns = this.ns;
        var current_servers = ns.getPurchasedServers();
        var highest_current_server_ram = 0;
        for (const server_name of current_servers) {
            var current_server_ram = ns.getServerMaxRam(server_name)
            if (highest_current_server_ram < current_server_ram) {
                highest_current_server_ram = current_server_ram
            }
        }
        return highest_current_server_ram;
    }

    get lowest_current_server_ram() {
        var ns = this.ns;
        var current_servers = ns.getPurchasedServers();
        var lowest_current_server_ram = false;
        for (const server_name of current_servers) {
            var current_server_ram = ns.getServerMaxRam(server_name)
            if (lowest_current_server_ram == false || lowest_current_server_ram > current_server_ram) {
                lowest_current_server_ram = current_server_ram
            }
        }
        return lowest_current_server_ram;
    }

    check_for_completion() {
        var ns = this.ns;
        var max_ram = ns.getPurchasedServerMaxRam();
        if (this.current_ram_target > max_ram) {
            ns.tprint(`Maximum server size purchased!`);
            ns.toast(`Maximum server size purchased!`);
            ns.exit();
        }
    }

    update_ram_target() {
        var ns = this.ns;
        if (this.minimum_server_ram <= this.lowest_current_server_ram) {
            this.current_ram_target = this.lowest_current_server_ram * 2;
            ns.print(`Setting target to lowest current server RAM level times two: ${this.current_ram_target}.`)
        } {
            ns.print(`Current RAM target: ${this.current_ram_target}`);
        }
    }

    get max_affordabable_server_ram() {
        var ns = this.ns;
        var affordable_ram_amount = this.current_ram_target;
        var test_ram_amount = affordable_ram_amount;
        var cost = ns.getPurchasedServerCost(test_ram_amount);
        var current_money = ns.getServerMoneyAvailable("home");
        while (cost < current_money) {
            test_ram_amount = test_ram_amount * 2;
            cost = ns.getPurchasedServerCost(test_ram_amount);
            if (cost < current_money) {
                affordable_ram_amount = test_ram_amount;
            }
        }
        ns.print(`Highset affordable RAM amount: ${affordable_ram_amount}`)
        return affordable_ram_amount;
    }

    async purchase_server() {
        var ns = this.ns;
        if (this.current_servers.length < this.max_servers) {
            ns.print(`Current number of servers: ${this.current_servers.length}, purchasing new server with ${this.current_ram_target} gb of RAM.`)
            var cost = ns.getPurchasedServerCost(this.current_ram_target);
            var current_money = ns.getServerMoneyAvailable("home");
            if (current_money > cost) {
                var max_affordabable_server_ram = this.max_affordabable_server_ram;
                var hostname = ns.purchaseServer("hackserv-" + (this.current_servers.length < 9 ? '0' : '') + (this.current_servers.length + 1), max_affordabable_server_ram);
                await ns.scp(this.bot_scripts, hostname);
                this.current_servers = ns.getPurchasedServers();
                cost = ns.getPurchasedServerCost(max_affordabable_server_ram);
                ns.tprint(`Server purchased: ${hostname}, RAM: ${get_shortened_number(ns, max_affordabable_server_ram)}. Cost \$${get_shortened_number(ns, cost)}`);
                ns.toast(`Server purchased: ${hostname}, RAM: ${get_shortened_number(ns, max_affordabable_server_ram)}.`);
                var rooted_servers = this.rooted_servers;
                rooted_servers.push(hostname);
                await ns.write("/data/rooted_servers.txt", rooted_servers, "w");
                await ns.sleep(10000);
            } else {
                this.status = `Waiting for amount \$${get_shortened_number(ns, cost)} to purchase new server with RAM: ${this.current_ram_target}.`;
                ns.print(this.status);
            }
        } else {
            this.current_servers.sort(); // TODO: Sort by ram amount, get server with lowest RAM.
            for (const server_name of this.current_servers) {
                var current_server_ram = ns.getServerMaxRam(server_name)
                if (current_server_ram == this.lowest_current_server_ram) {
                    ns.print(`Server ${server_name} needs to be upgraded to at least ${this.current_ram_target} gb of RAM.`)
                    var cost = ns.getPurchasedServerCost(this.current_ram_target);
                    var current_money = ns.getServerMoneyAvailable("home");
                    if (current_money > cost) {
                        ns.print(`Waiting for ${server_name} to complete currently running scripts.`)
                        await ns.write("/data/pending_server_upgrade.txt", server_name, "w");
                        var wait_interval = this.update_interval * 100
                        var current_interval = 0
                        while (this.wait_for_idle && ns.getServerUsedRam(server_name) > 0) {
                            if (current_interval >= wait_interval) {
                                current_interval = 0;
                            } else {
                                current_interval = current_interval + 1;
                            }
                            await ns.sleep(10);
                        }
                        current_money = ns.getServerMoneyAvailable("home");
                        if (current_money > cost) {
                            ns.killall(server_name);
                            ns.deleteServer(server_name);
                            var max_affordabable_server_ram = this.max_affordabable_server_ram;
                            cost = ns.getPurchasedServerCost(max_affordabable_server_ram);
                            var hostname = ns.purchaseServer(server_name, max_affordabable_server_ram);
                            ns.rm("/data/pending_server_upgrade.txt", "home");
                            ns.tprint(`Hostname ${hostname} upgraded, RAM: ${get_shortened_number(ns, max_affordabable_server_ram)}. Cost \$${get_shortened_number(ns, cost)}`)
                            ns.toast(`Hostname ${hostname} upgraded, RAM: ${get_shortened_number(ns, max_affordabable_server_ram)}.`)
                            await ns.scp(this.bot_scripts, hostname);
                        } else {
                            ns.print(`WARN: Money decreased while waiting for server to complete scripts.`);
                        }
                    } else {
                        this.status = `Waiting for amount \$${get_shortened_number(ns, cost)} to upgrade next server to RAM: ${this.current_ram_target}.`;
                        ns.print(this.status);
                    }
                    break;
                }
            }
        }
    }

    get hacking_programs() {
        var hacking_programs = [];
        hacking_programs.push({ 'name': 'BruteSSH.exe', 'cost': 500000, 'max_server_ram': 4 })
        hacking_programs.push({ 'name': 'FTPCrack.exe', 'cost': 1500000, 'max_server_ram': 8 })
        hacking_programs.push({ 'name': 'relaySMTP.exe', 'cost': 5000000, 'max_server_ram': 16 })
        hacking_programs.push({ 'name': 'HTTPWorm.exe', 'cost': 30000000, 'max_server_ram': 32 })
        hacking_programs.push({ 'name': 'SQLInject.exe', 'cost': 250000000, 'max_server_ram': 128 })
        return hacking_programs;
    }

    async manage_server_capacity() {
        var ns = this.ns;
        ns.rm("/data/pending_server_upgrade.txt", "home");
        if (this.priority_buy && this.singularity) {
            for (const program of this.hacking_programs) {
                var current_money = ns.getServerMoneyAvailable("home");
                if (ns.fileExists(program['name'], "home") == false && program['cost'] < current_money) {
                    ns.run("singularity/purchase_program.js", 1, program['name']);
                    ns.print(`${program['name']} purchased.`)
                    await ns.sleep(1000) // TODO: Wait for script execution to finish instead.
                }
            }
        }
        if (this.idle_servers == 0) {
            //ns.print(`Pause to buy programs: ${this.pause_to_buy_programs}`);
            if (this.pause_to_buy_programs && this.current_servers.length == this.max_servers) {
                var player = ns.getPlayer();
                if (player.tor == false && this.lowest_current_server_ram >= 4) {
                    var prereq_to_purchase = "TOR";
                    var cost = 200000;
                } else if (player.tor == true && this.lowest_current_server_ram >= 4) {
                    for (const program of this.hacking_programs) {
                        if (ns.fileExists(program['name'], "home") == false && this.lowest_current_server_ram >= program['max_server_ram']) {
                            var prereq_to_purchase = program['name'];
                            var cost = program['cost'];
                            break;
                        }
                    }
                }
            }
            if (prereq_to_purchase == undefined) {
                if (this.singularity) {
                    ns.run("singularity/upgrade_home.js", 1);
                }
                await this.purchase_server();
            } else {
                var current_money = ns.getServerMoneyAvailable("home");
                if (current_money > cost) {
                    if (this.singularity) {
                        ns.run("singularity/purchase_program.js", 1, prereq_to_purchase);
                        ns.print(`${prereq_to_purchase} purchased.`)
                    } else {
                        this.status = `${prereq_to_purchase} ready for purchase for \$${get_shortened_number(ns, cost)}.`;
                    }
                } else {
                    this.status = `Waiting for \$${get_shortened_number(ns, cost)} to buy ${prereq_to_purchase} before purchasing more servers.`;
                }
                ns.print(this.status)
            }
        } else {
            this.status = `Idle servers: ${this.idle_servers}`;
            ns.print(this.status)
        }
    }

    display_updates() {
        this.ns.tprint(`--- ${this.status} ---`);
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    if (ns.args[0]) {
        var pause_to_buy_programs = ns.args[0];
    } else {
        var pause_to_buy_programs = true;
    }
    let server_manager = new ServerManager(ns, pause_to_buy_programs);
    await server_manager.main();
}