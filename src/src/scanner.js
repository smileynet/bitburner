export class Scanner {
    constructor(ns, messenger) {
        this.messenger = messenger;
        this.known_servers = [];
        this.player = new Player(ns);
        this.faction_servers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n"]
    }

    refresh(ns) {
        this.add_server(ns, "home");
        console.debug(this.known_servers);
        let rootable_servers = this.known_servers.filter(server => server.rooted != true && this.player.can_root(ns, server));
        console.debug(rootable_servers);
        let message = ""
        rootable_servers.forEach(server => {
            server.root(ns);
            if (this.faction_servers.includes(server.name)) {
                this.messenger.add_message(`Scanner new faction server available`, `Server: ${server.name}`)
                ns.run(`/src/scriptlauncher.js`, 1, `/utils/backdoor_factions.js`);
            }
            message += `  ${server.name}\n`

        })
        if (message != "") {
            this.messenger.add_message('Scanner new servers rooted:', message)
        }
    }

    add_server(ns, server_name, parent_server = "home") {
        let server = new Server(ns, server_name, parent_server);
        if (this.known_servers.find(known_server => known_server.name == server_name) === undefined) {
            this.known_servers.push(server);
        }
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
        let bot_servers = this.known_servers.filter(server => server.rooted && server.max_ram > 0);
        let bots = []
        bot_servers.forEach(server => {
            bots.push(new Bot(ns, server.name));
        })
        console.debug(bots);
        return bots;
    }
}
class Player {
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
        return (server.required_hacking <= this.hacking_skill(ns) &&
            server.required_ports <= this.num_hackable_ports(ns));
    }
}

class Server {
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

    update_max_ram(ns) {
        this.max_ram = ns.getServerMaxRam(this.name);
    }
}
class Bot {
    constructor(ns, server_name) {
        this.ns = ns;
        this.name = server_name;
        this.max_ram = ns.getServerMaxRam(server_name);
    }

    get reserved_ram() {
        return parseInt(this.ns.read('reserved.txt'))
    }

    get available_ram() {
        var used_ram = this.ns.getServerUsedRam(this.name);
        if (this.name == "home") { used_ram += this.reserved_ram }
        return this.max_ram - used_ram;
    }

    get available() {
        if (this.available_ram > 2) {
            return true;
        } else {
            return false;
        }
    }
}

class Target {
    constructor(ns, server_name, percent_to_steal = 0.4, security_buffer = 2) {
        this.ns = ns;
        this.name = server_name;
        this.percent_to_steal = percent_to_steal;
        this.max_money = ns.getServerMaxMoney(server_name);
        this.min_security = ns.getServerMinSecurityLevel(server_name);
        this.tgt_security = this.min_security + security_buffer;
        this.growth = ns.getServerGrowth(server_name);
        this.growth_money_mult = this.max_money * this.growth;
        if (this.name == 'n00dles') this.growth_money_mult = 1
        if (this.name == 'joesguns') {
            if (ns.fileExists('exp.txt', 'home')) {
                this.growth_money_mult = 1000000000000000000
            } else {
                this.growth_money_mult = 2
            }
        }
        // TODO: Validate target
    }

    get current_security() {
        if (this.name == 'joesguns') return 100000000 ** 10
        return this.ns.getServerSecurityLevel(this.name);
    }

    get current_money() {
        return this.ns.getServerMoneyAvailable(this.name);
    }

    get next_task() {
        if (this.name == 'joesguns') return "grind"
        if (this.current_security > this.tgt_security) return "weaken";
        if (this.current_money < this.max_money) return "grow";
        return "hack";
    }

    get weaken_amount() {
        return this.current_security - this.min_security;
    }

    get grow_amount() {
        return this.max_money - this.current_money;
    }

    get hack_amount() {
        return this.current_money * this.percent_to_steal;
    }

    get weaken_time() {
        return this.ns.getWeakenTime(this.name);
    }

    get grow_time() {
        return this.ns.getGrowTime(this.name);
    }

    get hack_time() {
        return this.ns.getHackTime(this.name);
    }

    get weaken_threads() {
        const cores = 1;
        const threads = 1;
        const security_decrease = this.ns.weakenAnalyze(threads, cores);
        return Math.ceil(this.weaken_amount / security_decrease);
    }

    get grow_threads() {
        const cores = 1;
        return Math.ceil(this.ns.growthAnalyze(this.name, this.grow_amount, cores));
    }

    get hack_threads() {
        return Math.ceil(this.ns.hackAnalyzeThreads(this.name, this.hack_amount));
    }
}

export default Scanner;