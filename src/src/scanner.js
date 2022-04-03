import { Target } from "/src/target.js";
import { Bot } from "/src/bot.js";
import { Server } from "/src/server.js";
import { Player } from "/src/player.js";


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

export default Scanner;