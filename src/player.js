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
        return (server.required_hacking <= this.hacking_skill(ns) &&
            server.required_ports <= this.num_hackable_ports(ns));
    }
}