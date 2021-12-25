/** @param {NS} ns **/

import {display_minutes_and_seconds, get_array_from_file, get_shortened_number} from "utils.js";

/** 
 * @param {string} target_server The server to analyze for the next hacking step.
 * @returns {dictionary} job Returns job with server name, next action, threads needed, and time required. 
 */
export function analyze_target(ns, target_server) {
	ns.tprint(`Analyzing ${target_server}...`);

	var threads = 1; // For per unit calculation
	var cores = 1; // Not worries about cores right now

	var threads_needed = 0;
	var time_needed = 0;
	var task = "";

	var percent_to_steal = 0.40;
	
	var server_security_level = ns.getServerSecurityLevel(target_server)
	var server_min_security_level = ns.getServerMinSecurityLevel(target_server)
	var target_security_level = server_min_security_level + 5
	var server_max_money = ns.getServerMaxMoney(target_server)
	var server_money_available = ns.getServerMoneyAvailable(target_server)
	var server_growth_level = ns.getServerGrowth(target_server);
    var security_increase = false;

	ns.tprint(``);
	ns.tprint(`Current security level: ${get_shortened_number(ns, server_security_level)} desired security level: ${target_security_level}`);
	ns.tprint(`Current money level: \$${get_shortened_number(ns, server_money_available)} max money level: \$${get_shortened_number(ns, server_max_money)}`);
	ns.tprint(`Server growth factor: ${server_growth_level}`);
	ns.tprint(``);
	if (server_security_level > target_security_level) {
		ns.tprint(`Server weakening recommended.`)
		task = "weaken";
	} else if ( server_money_available < server_max_money ) {
		ns.tprint(`Server money growth recommended.`)
		task = "grow";
	} else {
		ns.tprint(`Server is ready for hacking.`)
		task = "hack";
	}

	
	time_needed = ns.getWeakenTime(target_server)	;
	var security_change_needed = server_security_level - server_min_security_level;
	var security_decrease = ns.weakenAnalyze(threads, cores);
	threads_needed = Math.ceil(security_change_needed / security_decrease);

	ns.tprint(`Amount to reduce security by: ${get_shortened_number(ns, security_change_needed)}, weaken threads needed: ${threads_needed} `);
	ns.tprint(`Time to execute weaken: ${display_minutes_and_seconds(ns, time_needed)}`);

	var grow_amount = server_max_money - server_money_available;
	if (grow_amount > 0){
		threads_needed = Math.ceil(ns.growthAnalyze(target_server, grow_amount, cores));
		security_increase = ns.growthAnalyzeSecurity(threads_needed);
		

		ns.tprint(`Amount of money to grow: \$${get_shortened_number(ns, grow_amount)}, growth threads needed: ${threads_needed}`);
		ns.tprint(`Anticipated security increase from ${threads_needed} threads of growth: ${get_shortened_number(ns, security_increase)}`);
	}

	time_needed = ns.getGrowTime(target_server);
	ns.tprint(`Time to execute growth: ${display_minutes_and_seconds(ns, time_needed)}`)

	var hack_amount = server_money_available * percent_to_steal;
	var success_chance = ns.hackAnalyzeChance(target_server);
	threads_needed = Math.ceil(ns.hackAnalyzeThreads(target_server, hack_amount));
	security_increase = ns.hackAnalyzeSecurity(threads_needed);
	time_needed = ns.getHackTime(target_server);

	ns.tprint(`Amount to steal: \$${get_shortened_number(ns, hack_amount)}, threads needed: ${threads_needed}`);
	ns.tprint(`Chance of success: ${success_chance}`);
	ns.tprint(`Anticipated security increase: ${security_increase}`);
	ns.tprint(`Time to execute hack: ${display_minutes_and_seconds(ns, time_needed)}`)		

	ns.tprint(`-----------------------------------------------------------------------------`);
}

export async function main(ns) {
    if (ns.args[0]) {
        var hacking_targets = [ns.args[0]];
    } else {
        var hacking_targets = get_array_from_file(ns, "/data/hacking_targets.txt");
    }

	for (const target_server of hacking_targets) {
		await analyze_target(ns, target_server)
	}
}