async function get_path_to_server(ns, server_name) {
    let target = server_name;
    var originating_server = ns.getCurrentServer();
    let paths = {
        [originating_server]: ""
    }; // was "home"
    let queue = Object.keys(paths);
    let name;
    let path_to_server;
    while ((name = queue.shift())) {
        let path = paths[name];
        let scan_result = ns.scan(name);
        for (let newSv of scan_result) {
            if (paths[newSv] === undefined) {
                queue.push(newSv);
                paths[newSv] = `${path},${newSv}`;
                if (newSv == target)
                    path_to_server = paths[newSv].substr(1).split(",");
            }
        }
    }
    return path_to_server
}

async function backdoor_server(ns, server_name) {
    var server = ns.getServer(server_name);
    if (!server.backdoorInstalled) {
        ns.print(`Attempting to backdoor ${server_name}`)
        ns.tprint(`Attempting to backdoor ${server_name}`)
        var path_to_server = await get_path_to_server(ns, server_name);
        for (const server of path_to_server) {
            ns.connect(server);
            ns.print(`Connecting to ${server}`)
        }
        while (!server.backdoorInstalled) {
            await ns.installBackdoor();
            await ns.sleep(1000);
            server = ns.getServer(server_name);
        }
        ns.print(`${server_name} has been backdoored.`)
        ns.tprint(`${server_name} has been backdoored.`)
        ns.connect('home');
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.connect('home');
    var faction_servers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n"]
    for (const server_name of faction_servers) {
        if (ns.hasRootAccess(server_name)) {
            await backdoor_server(ns, server_name);
        }
    }
}