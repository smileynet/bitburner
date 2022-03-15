import { Target } from "/src/target.js";
import { Bot } from "/src/bot.js";

export class Scanner {
    constructor(ns) {
        this.known_servers = [];
        this.player = new Player(ns);
        this.add_server(ns, "home");
        this.refresh(ns);
        this.faction_servers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"]
    }

    refresh(ns) {
        console.debug(this.known_servers);
        let rootable_servers = this.known_servers.filter(server => server.rooted != true && this.player.can_root(ns, server));
        console.debug(rootable_servers);
        rootable_servers.forEach(server => {
            server.root(ns);
            // TODO: emit new target server
        })
    }

    add_server(ns, server_name, parent_server = "home") {
        let server = new Server(ns, server_name, parent_server);
        this.known_servers.push(server);
        server.children.forEach(child => {
            const exists = this.known_servers.find(server => server.name == child);
            if (exists === undefined) {
                this.add_server(ns, child, server_name);
            }
        })
    }

    target_servers(ns) {
        const target_servers = this.known_servers.filter(server => server.rooted && server.max_money > 0);
        let targets = []
        target_servers.forEach(server => {
            targets.push(new Target(ns, server.name));
        })
        console.debug(targets);
        return targets;
    }

    bot_servers(ns) {
        const bot_servers = this.known_servers.filter(server => server.rooted && server.max_ram > 0);
        let bots = []
        bot_servers.forEach(server => {
            bots.push(new Bot(ns, server.name));
        })
        console.debug(bots);
        return bots;
    }
}

export class Server {
    constructor(ns, server_name, parent_server = "home") {
        this.name = server_name;
        this.parent = parent_server;
        this.max_ram = ns.getServerMaxRam(server_name);
        this.max_money = ns.getServerMaxMoney(server_name);
        this.rooted = ns.hasRootAccess(server_name);
        this.required_hacking = ns.getServerRequiredHackingLevel(server_name);
        this.required_ports = ns.getServerNumPortsRequired(server_name)
        this.children = ns.scan(server_name).filter(server => server != this.parent);
    }

    root(ns) {
        const programs = [{ 'name': "BruteSSH.exe", 'function': ns.brutessh },
            { 'name': "FTPCrack.exe", 'function': ns.ftpcrack },
            { 'name': "relaySMTP.exe", 'function': ns.relaysmtp },
            { 'name': "HTTPWorm.exe", 'function': ns.httpworm },
            { 'name': "SQLInject.exe", 'function': ns.sqlinject },
            { 'name': "NUKE.exe", 'function': ns.nuke }
        ]
        for (const program of programs) {
            if (ns.fileExists(program['name'], "home")) {
                const result = program['function'](this.name);
                if (result == false) {
                    ns.tprint(`WARN: Execution of ${program['name']} failed.`)
                    console.warn(`Execution of ${program['name']} failed.`)
                } else {
                    console.log(`${this.name} rooted, result: ${result}}`)
                    this.rooted = true;
                }
            }
        }
    }
}

export class Player {
    num_hackable_ports(ns) {
        let num_ports = 0;

        const port_hacker_programs = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]

        for (const program of port_hacker_programs) {
            if (ns.fileExists(program, "home")) {
                num_ports = num_ports + 1;
            }
        }

        return num_ports;
    }

    hacking_skill(ns) {
        return ns.getHackingLevel();
    }

    can_root(ns, server) {
        console.debug(`can_root server: ${server}`)
        return (server.required_hacking <= this.hacking_skill(ns) &&
            server.required_ports <= this.num_hackable_ports(ns));
    }
}