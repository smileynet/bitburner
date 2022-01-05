import { get_array_from_file, get_shortened_number, get_idle_servers } from "utils.js";
import { get_current_territory } from "gang_runner.js";

export async function main(ns) {
	ns.disableLog("ALL");
	const doc = eval("document");
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');

	var in_gang = ns.gang.inGang();
	var gang_stats_filename = "/data/status_update_gang.txt"

	while (true) {
		try {
			const headers = []
			const values = [];
			headers.push("Hacking");
			values.push("----------");
			headers.push("Income:");
			values.push('$' + get_shortened_number(ns, ns.getScriptIncome()[0]) + '/sec');
			headers.push("Exp:");
			values.push(get_shortened_number(ns, ns.getScriptExpGain()) + '/sec');
			// TODO: Add more neat stuff
			headers.push("# Idle:");
			values.push(get_idle_servers(ns));

			if (in_gang) {
				headers.push("Gang");
				values.push("----------");
				var current_territory = get_current_territory(ns);
				var gang_stats = get_array_from_file(ns, gang_stats_filename)
				var power_change = gang_stats[0];
				var territory_change = gang_stats[1];
				var money_gain_rate = gang_stats[2];
				var respect_gain_rate = gang_stats[3];
				var current_respect = gang_stats[4];
				headers.push("Territory");
				values.push(`${ns.nFormat((current_territory * 100), '0.00')}%`);
				headers.push("Ter gain");
				values.push(`${ns.nFormat((territory_change * 100), '0.00')}%`);
				headers.push("Pow gain");
				values.push(`${get_shortened_number(ns, power_change)}`);
				headers.push("Income:");
				values.push(`\$${get_shortened_number(ns, money_gain_rate)}/sec`);
				headers.push(`Rsp rate:`);
				values.push(`${get_shortened_number(ns, respect_gain_rate)}/sec`);
				headers.push(`Respect:`);
				values.push(`${get_shortened_number(ns, current_respect)}`);
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