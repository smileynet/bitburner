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

    update_max_ram(ns) {
        this.max_ram = ns.getServerMaxRam(this.name);
    }
}