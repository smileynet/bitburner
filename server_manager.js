import {get_array_from_file, get_shortened_number} from "utils.js";

class ServerManager {
    constructor(ns) { 
        this.ns = ns;
        this.minimum_server_ram = 2; // Minimum server size to purchase
        this.current_ram_target = 2;
        this.reminder_interval = 60; // How many seconds before purchase reminders.
        this.current_servers = ns.getPurchasedServers();
        this.max_servers = ns.getPurchasedServerLimit();
        this.status = "idle";
        this.bot_scripts = ["/botnet/smart_hack.ns",
        "/botnet/grow_money.ns",
        "/botnet/hack_server.ns",
        "/botnet/weaken_security.ns"];
    }

    async main () {
        var ns = this.ns;
        var current_interval = 0;
        while(true) {
            this.update_ram_target();
            await this.manage_server_capacity();
            if (current_interval >= this.update_interval) {
                this.display_updates();
                current_interval = 0;
            } else {
                current_interval = current_interval + 1;
            } 
            await ns.sleep(1000);
        }
    }

    get rooted_servers() {
        return get_array_from_file(this.ns, "/data/rooted_servers.txt");
    }

    get idle_servers() {
        var ns = this.ns;
        var idle_servers = 0;
        for (const server_name of this.rooted_servers) {
            var used_ram = ns.getServerUsedRam(server_name);
            if (used_ram == 0) {
                var max_ram = ns.getServerMaxRam(server_name);
                if (max_ram > 0) {
                    idle_servers = idle_servers + 1;
                }
            }
        }
        return idle_servers;
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

    update_ram_target() {
        var ns = this.ns;
        var highest_current_server_ram = this.highest_current_server_ram;
        var lowest_current_server_ram = this.lowest_current_server_ram;
        if (highest_current_server_ram > this.current_ram_target){
			this.current_ram_target = highest_current_server_ram;
            ns.print(`Setting target to highest current server RAM level: ${highest_current_server_ram}.`)	
		} else if (highest_current_server_ram == lowest_current_server_ram) {
			this.current_ram_target = this.current_ram_target * 2;
			ns.print(`All servers at current RAM level, doubling RAM target to ${this.current_ram_target}.`)
		} 
    }

    async purchase_server() {
        var ns = this.ns;
        if (this.current_servers.length < this.max_servers) {
            ns.print(`Current number of servers: ${this.current_servers.length}, purchasing new server with ${this.current_ram_target} gb of RAM.`)
            var cost = ns.getPurchasedServerCost(this.current_ram_target);
            var current_money = ns.getServerMoneyAvailable("home");
            if (current_money > cost) {
                var hostname = ns.purchaseServer("hackserv-" + (this.current_servers.length + 1), this.current_ram_target);
                await ns.scp(this.bot_scripts, hostname);
                this.current_servers = ns.getPurchasedServers();
                ns.tprint(`Server purchased: ${hostname}, RAM: ${this.current_ram_target}. Cost \$${get_shortened_number(ns, cost)}`);
                ns.toast(`Server purchased: ${hostname}, RAM: ${this.current_ram_target}.`);
                var rooted_servers = get_array_from_file(ns, "/data/rooted_servers.txt");
                rooted_servers.push(hostname);
                await ns.write("/data/rooted_servers.txt", rooted_servers, "w");
            } else {
                this.status = `Waiting for amount \$${get_shortened_number(ns, amount)} to purchase ${hostname} with RAM: ${this.current_ram_target}.`;
                ns.print(this.status); 
            }
        } else {
            for(const server_name of this.current_servers) {
                var current_server_ram = ns.getServerMaxRam(server_name)
                if (current_server_ram < this.current_ram_target) {
                    ns.print(`Server ${server_name} needs to be upgraded to ${this.current_ram_target} gb of RAM.`)
                    var cost = ns.getPurchasedServerCost(this.current_ram_target);
	                var current_money = ns.getServerMoneyAvailable("home");
                    if (current_money > cost) {
                        ns.print(`Waiting for ${server_name} to complete currently running scripts.`)
                        while (ns.getServerUsedRam(server_name) > 0) {
                            await ns.sleep(100);
                        }
                        current_money = ns.getServerMoneyAvailable("home");
                        if (current_money > cost) {
                            ns.killall(server_name);
                            ns.deleteServer(server_name);
                            var hostname = ns.purchaseServer(server_name, this.current_ram_target);
                            ns.tprint(`Hostname ${hostname} upgraded, RAM: ${this.current_ram_target}. Cost \$${get_shortened_number(ns, cost)}`)
                            ns.toast(`Hostname ${hostname} upgraded, RAM: ${this.current_ram_target}.`)
                            await ns.scp(this.bot_scripts, hostname);
                        } else {
                            ns.print(`WARN: Money decreased while waiting for server to complete scripts.`);
                        }
                    } else {
                        this.status = `Waiting for amount \$${get_shortened_number(ns, amount)} to upgrade ${hostname} upgraded to RAM: ${this.current_ram_target}.`;
                        ns.print(this.status); 
                    }                    
                    break;
                }
            }
        }  
    }

    get hacking_programs () {
        var hacking_programs = [];
        hacking_programs.push({'name': 'BruteSSH.exe', 'cost': 500000, 'max_server_ram': 4 })
        hacking_programs.push({'name': 'FTPCrack.exe', 'cost': 1500000, 'max_server_ram': 8 })
        hacking_programs.push({'name': 'relaySMTP.exe', 'cost': 5000000, 'max_server_ram': 16 })
        hacking_programs.push({'name': 'HTTPWorm.exe', 'cost': 30000000, 'max_server_ram': 32 })
        hacking_programs.push({'name': 'SQLInject.exe', 'cost': 250000000, 'max_server_ram': 64 })
        return hacking_programs;
    }

    async manage_server_capacity() {
        var ns = this.ns;
        if (this.idle_servers == 0) {
            var highest_current_server_ram = this.highest_current_server_ram;
            var current_money = ns.getServerMoneyAvailable("home"); 
            var player = ns.getPlayer();
            if (player.tor == false && highest_current_server_ram >= 4) {
                    var prereq_to_purchase = "TOR"
                    var cost = 200000
            } else {
                for (const program of this.hacking_programs) {
                    if(ns.fileExists(program['name'], "home") == false && highest_current_server_ram >= program['max_server_ram']) {
                        var prereq_to_purchase = program['name'];
                        var cost = program['cost'];
                    }
                    break;
                }
            }
            if(prereq_to_purchase == undefined) {
                await this.purchase_server();
            } else {
                if (current_money > cost) {
                    this.status = `${prereq_to_purchase} ready for purchase for \$${get_shortened_number(ns, cost)}.`;
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
        ns.tprint(`--- ${this.status} ---`);
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    
    let server_manager = new ServerManager(ns);
    await server_manager.main();    
}