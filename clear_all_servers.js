import {get_array_from_file} from "utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	var rooted_servers = get_array_from_file(ns, "/data/rooted_servers.txt");

	for (const server_name of rooted_servers) {
		if (server_name != "home") {
			ns.killall(server_name);
		}
	}
	ns.killall("home");
}