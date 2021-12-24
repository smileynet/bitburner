import {get_array_from_file} from "utils.js";

class ServerManager {
    constructor(ns) { 
        this.rooted_servers = get_array_from_file(ns, "/data/rooted_servers.txt");
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

    check_server_capacity() {
        if (this.idle_servers == 0) {
            var highest_current_server_ram = get_highest_current_server_ram(ns)
            var current_money = ns.getServerMoneyAvailable("home");
            var hacking_programs = [];
            hacking_programs.push({'name': 'BruteSSH.exe', 'cost': 500000, 'max_server_ram': 4 })
            hacking_programs.push({'name': 'FTPCrack.exe', 'cost': 1500000, 'max_server_ram': 8 })
            hacking_programs.push({'name': 'relaySMTP.exe', 'cost': 5000000, 'max_server_ram': 16 })
            hacking_programs.push({'name': 'HTTPWorm.exe', 'cost': 30000000, 'max_server_ram': 32 })
            hacking_programs.push({'name': 'SQLInject.exe', 'cost': 250000000, 'max_server_ram': 64 })
            for (const program of hacking_programs) {
                if(ns.fileExists(program['name'], "home") == false && highest_current_server_ram >= program['max_server_ram']) {
                    ns.print(`Waiting for ${program['name']} before purchasing more servers.`);
                    if (current_money > program['cost']) {
                        ns.tprint(`${program['name']} ready for purchase.`);
                    }
                    return;
                }
            }
            var new_max_ram = highest_current_server_ram * 2;
            ns.tprint(`Doubling max RAM target for purchased servers to ${new_max_ram}`);		
            await ns.write("max_ram_target.txt", new_max_ram, "w");
            ns.exec("purchase_servers.ns","home");	
        }
    }
}