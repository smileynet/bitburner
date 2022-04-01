import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";
import { Server } from "/src/server.js";

export class ContractManager {
    constructor(ns) {
        this.finished = false
        this.known_servers = []
        this.servers_with_contracts = []
    }
    init(ns) {
        this.get_all_servers(ns, "home")
        this.get_all_contracts(ns)
    }

    run(ns) {
        this.display_contracts(ns)
        this.finished = true
    }

    display_contracts(ns) {
        let message = `Available contracts:\n`
        for (const server of this.servers_with_contracts) {
            message += `Server: ${server.server_name}\n`
            for (const contract of server.contracts) {
                message += `${contract}\n`
            }
            message += `\n`
        }
        ns.tprint(message)
    }

    get_all_contracts(ns) {
        for (const server of this.known_servers) {
            var contracts = ns.ls(server.name, "cct");
            if (contracts.length > 0) {
                this.servers_with_contracts.push({ 'server_name': server.name, 'contracts': contracts });
            }
        }
    }

    get_all_servers(ns, server_name, parent_server = "home") {
        let server = new Server(ns, server_name, parent_server);
        this.known_servers.push(server);
        server.children.forEach(child => {
            const exists = this.known_servers.find(server => server.name == child);
            if (exists === undefined) {
                this.get_all_servers(ns, child, server_name);
            }
        })
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    let contract_manager = new ContractManager(ns, messenger);
    contract_manager.init(ns)
    while (!contract_manager.finished) {
        contract_manager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default ContractManager;