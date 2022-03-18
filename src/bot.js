export class Bot {
    constructor(ns, server_name) {
        this.ns = ns;
        this.name = server_name;
        this.reserved_ram = 4
        this.max_ram = ns.getServerMaxRam(server_name);
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