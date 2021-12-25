import { get_array_from_file, get_shortened_number, get_idle_servers } from "utils.js";
// import { get_current_territory } from "gang_runner.ns";

export async function main(ns) {
	const doc = eval("document");
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');

	var in_gang = ns.gang.inGang();
	var gang_stats_filename = "/status_update_gang.txt"

	while (true) {
		try {
			const headers = []
			const values = [];
			headers.push("Inc");
			values.push('$' + get_shortened_number(ns, ns.getScriptIncome()[0]) + '/sec');
			headers.push("Exp");
			values.push(get_shortened_number(ns, ns.getScriptExpGain()) + '/sec');
			// TODO: Add more neat stuff
			headers.push("Idle Srv");
			values.push(get_idle_servers(ns));

			if (in_gang) {
				var current_territory = get_current_territory(ns);
				var gang_stats = get_array_from_file(ns, gang_stats_filename)
				var power_change = gang_stats[0];
				var territory_change = gang_stats[1];
				headers.push("Territory");
				values.push(`${ns.nFormat((current_territory * 100), '0.00')}%`);
				headers.push("Ter gain");
				values.push(`${ns.nFormat((territory_change * 100), '0.00')}%`);
				headers.push("Pow gain");
				values.push(`${get_shortened_number(ns, power_change)}`);
			}

			// Now drop it into the placeholder elements
			hook0.innerText = headers.join(" \n");
			hook1.innerText = values.join("\n");
		} catch (err) { // This might come in handy later
			ns.print("ERROR: Update Skipped: " + String(err));
		}
		await ns.sleep(1000);
	}
}