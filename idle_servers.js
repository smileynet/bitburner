import {get_rooted_servers} from "utils.js";

function get_idle_servers(ns) {
    var rooted_servers =  get_rooted_servers(ns);
    for (const server_name of rooted_servers) {
        var used_ram = ns.getServerUsedRam(server_name);
        if (used_ram == 0) {
            var max_ram = ns.getServerMaxRam(server_name);
            if (max_ram > 0) {
                ns.tprint(server_name)
            }
        }
    }
}
	
/** @param {NS} ns **/
export async function main(ns) {
    get_idle_servers(ns);
}