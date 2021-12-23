import * as utils from "utils.ns";

class Taskmaster {
    constructor(ns) {
        this.next_hackable_server_skill  = false;
        this.next_port_count = false;
        this.known_servers = [];
        this.rooted_servers = [];
        this.hacking_targets = [];
        this.ns = ns;
        this.bot_scripts = ["/botnet/smart_hack.ns",
                            "/botnet/grow_money.ns",
                            "/botnet/hack_server.ns",
                            "/botnet/weaken_security.ns"];
    }
    
    get num_hackable_ports() {
        var ns = this.ns;
        var num_ports = 0;
        
        var port_hacker_programs = ["BruteSSH.exe","FTPCrack.exe","relaySMTP.exe","HTTPWorm.exe","SQLInject.exe"]
        
        for (const program of port_hacker_programs) {
            if(ns.fileExists(program, "home")) {
                var num_ports = num_ports + 1;
            }
        }
        
        ns.print(`Max hackable ports: ${num_ports}`);
        
        return num_ports; 
    }

    async initialize_taskmaster() {
        this.scan_for_servers();
        await this.root_known_servers();
        // await this.reset_all_servers();   
        this.refresh_hacking_targets();
        this.sort_hacking_targets_by_growth();   
        await this.export_data()  
        this.display_status()
    }

    scan_for_servers() {
        var new_servers = this.ns.scan("home");
        this.iterative_server_scan("home", new_servers);
    }
    
    iterative_server_scan(origin_server, servers_to_scan) {
        var ns = this.ns;
        if (servers_to_scan.length == 0) {
            ns.print(`ERROR: iterative_server_scan called with empty servers_to_scan!`);
        } else {
            for (const server_name of servers_to_scan) {
                if (!this.known_servers.includes(server_name)) {
                    this.known_servers.push(server_name)
                }
                var new_servers = ns.scan(server_name);
                new_servers = new_servers.filter(e => e !== origin_server);
                if (new_servers.length > 0) {
                    this.iterative_server_scan(server_name, new_servers);
                }
            }
        }
    }

    async root_known_servers() {
        for(const server_name of this.known_servers) {
            var rooted = await this.root_server(server_name)
            if (rooted) {
                if (!this.rooted_servers.includes(server_name)) {
                    this.rooted_servers.push(server_name)
                }
            }
        }
    }

    async root_server(server_name) {
        var ns = this.ns;
        ns.print(`Checking ${server_name}...`);
        var player_hacking_skill = ns.getHackingLevel();
        var max_hackable_ports = this.num_hackable_ports;
        var required_hacking_skill = ns.getServerRequiredHackingLevel(server_name);
        var ports_required = ns.getServerNumPortsRequired(server_name)
        
        if (ns.hasRootAccess(server_name) == false) {
            if (required_hacking_skill <= player_hacking_skill) {
                if (ports_required > max_hackable_ports) {
                    if (this.next_port_count == false || this.next_port_count > ports_required) {
                        this.next_port_count = ports_required;
                    }
                    ns.print(`Can't open enough ports.`);
                    return false;
                } else {
                    var result = run_exploits(server_name);
                    if (result == true) {
                        await ns.scp(bot_scripts, server_name);
                        return true;
                    } else {
                        ns.print(`WARN: Problem rooting server.`);
                        return false;
                    }
                }
            } else {
                ns.print(`Not enough skill.`);
                if (this.next_hackable_server_skill == false || required_hacking_skill < this.next_hackable_server_skill) {
					this.next_hackable_server_skill = required_hacking_skill;
				}
                return false;
            }
        } else {
            ns.print(`Already have admin rights.`);
            return true;
        }
    }

    run_exploits(server_name) {
        ns = this.ns;
        var programs = [{'name':"BruteSSH.exe",'function': ns.brutessh()},
        {'name':"FTPCrack.exe", 'function': ns.ftpcrack()},
        {'name':"relaySMTP.exe", 'function': ns.relaysmtp()},
        {'name':"HTTPWorm.exe", 'function': ns.httpworm()},
        {'name':"SQLInject.exe", 'function': ns.sqlinject()},
        {'name':"NUKE.exe", 'function': ns.nuke()}]
        for(const program of programs) {
            if(ns.fileExists(program['name'], "home")) {
                var result = program['function'](server_name);
                if (result == false) {
                    ns.print(`WARN: Execution of ${program['name']} failed.`)
                }
            }
        }
        return result;
    }

    async reset_all_servers() {
        var ns = this.ns;
        for (const server_name of this.rooted_servers) {
            ns.killall(server_name);
            await ns.scp(bot_scripts, server_name);
        }
        return true;
    }

    refresh_hacking_targets() {
        var ns = this.ns;

        var purchased_servers = [];
        for (var i = 1; i < 26; i++) { // TODO: make this dynamic based on actual names/ servers
            purchased_servers.push("hackserv-" + i);
        }

        for (const server_name of this.known_servers) {
            if (ns.hasRootAccess(server_name) && !purchased_servers.includes(server_name)) {
                var server_max_money = ns.getServerMaxMoney(server_name);
                var server_growth = ns.getServerGrowth(server_name)
                ns.print(`${server_name} - Max money: ${ns.nFormat(server_max_money, '0,0')} Growth: ${server_growth}`)
                if (server_max_money > 0) {
                    this.hacking_targets.push({'name':server_name, 'max_money': server_max_money, 'growth': server_growth});
                }
            }
        }
    }

    sort_hacking_targets_by_max_money() {
        this.hacking_targets.sort((firstItem, secondItem) => secondItem.growth - firstItem.growth);
        this.hacking_targets.sort((firstItem, secondItem) => secondItem.max_money - firstItem.max_money);
    }

    sort_hacking_targets_by_growth() {
        this.hacking_targets.sort((firstItem, secondItem) => secondItem.max_money - firstItem.max_money);
        this.hacking_targets.sort((firstItem, secondItem) => secondItem.growth - firstItem.growth);
    }

    async export_data() {
        var ns = this.ns;
        await ns.write("/data/hacking_targets.txt", this.hacking_targets, "w");
        await ns.write("/data/rooted_servers.txt", this.rooted_servers, "w");
        await ns.write("/data/known_servers.txt", this.known_servers, "w");
        await ns.write("/data/next_hackable_server_skill.txt", this.next_hackable_server_skill, "w");
        await ns.write("/data/next_port_count.txt", this.next_port_count, "w");
    }

    display_status() {
        var ns = this.ns;
        var player_hacking_skill = ns.getHackingLevel();
        ns.tprint("---------------------------------------------------------------------");
        ns.tprint(`Number of rooted servers: ${this.rooted_servers.length}. Number of known servers ${this.known_servers.length}.`);
        ns.tprint(`Next hackable port count target: ${this.next_port_count}. Current number of hackable ports: ${this.num_hackable_ports}.`);
        ns.tprint(`Next hackable server skill level: ${this.next_hackable_server_skill}. Current hacking skill level: ${player_hacking_skill}.`);
        ns.tprint("---------------------------------------------------------------------");
        ns.tprint(`Hackable server targets:`);
        for (const target_server of this.hacking_targets) {
            var name = target_server['name'];
            var name_padding = 15 - name.length;
            var growth = target_server['growth'];
            var growth_padding = 5 - growth.toString().length;
            var max_money = utils.get_shortened_number(ns, target_server['max_money']);
            ns.tprint(`   ${name} ${' '.repeat(name_padding)} Growth: ${growth}${' '.repeat(growth_padding)} Max money: \$${max_money}`)
        }
        ns.tprint("---------------------------------------------------------------------");
    }
}
    
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    
    let taskmaster = new Taskmaster(ns);
    await taskmaster.initialize_taskmaster();    
}