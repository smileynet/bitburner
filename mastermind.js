import { read_file_as_number, get_readable_time, wait_for_sufficient_money, get_shortened_number } from "utils.js";
import { get_available_augs, get_preferred_faction, get_available_augs_from_faction } from "/helpers/augmentations.js";

class Mastermind {
	constructor(ns) {
		this.ns = ns;
		this.use_gangs = true; // Form a gang for progression?
		this.max_rep_wait_time = 43200 // Time to wait in seconds
		this.hacking_skill_target = 150;
		this.stat_target = 75;
		this.gang_karma_target = -54000;
		this.faction_karma_target = -18;
		this.kills = 0;
		//this.ns.atExit(this.at_exit); // TODO: Troubleshoot
	}

	get karma() {
		return this.ns.heart.break()
	}

	async main() {
		await this.red_pill();
		await this.train_hacking();
		await this.backdoor_faction_servers();
		await this.join_factions();
		await this.crime_stuff();
		//this.boost_hacking_skill();
		await this.acquire_rep_for_all_available_hacking_augs();
		await this.acquire_rep_for_all_available_augs();
		await this.train_combat_stats(200);
		await this.train_charisma(200);
		//await this.create_programs();
		this.the_end();
	}

	

	aug_reload () {
		// if augs > 1
		// if in Daedelus, wait
		// else, if everything affordable is bought, reload
	}

	the_end() {
		var ns = this.ns;
		ns.print(`Out of things to do, working for CSEC.`);
		ns.workForFaction("CyberSec", "Hacking Contracts");
	}

	boost_hacking_skill() {
		var ns = this.ns;
		var current_stats = ns.getStats() // TODO: Make this it's own script.
		if (current_stats['hacking'] < 600) {
			ns.kill("taskmaster.js","home")
			ns.exec("taskmaster.js","home",1,"true");
			ns.print(`Shifting taskmaster to max xp mode.`)
		} else {
			ns.kill("taskmaster.js","home","true")
			ns.exec("taskmaster.js","home");
			ns.print(`Returning taskmaster to normal mode.`)
		}
	}

	travel_to(city) {
		var ns = this.ns;
		var player = ns.getPlayer();
		// TODO: Check for sufficient money
		if (city != player['city']) {
			ns.travelToCity(city)
		} else {
			ns.print(`Already in ${city}.`)
		}
	}

	determine_next_aug(type = "none") {
		var ns = this.ns;
		var available_augs = get_available_augs(ns, type);
		var next_aug = available_augs[0]
		var preferred_faction = get_preferred_faction(ns, next_aug['factions'], this.use_gangs);
			
		while (available_augs.length > 0) {
			if (preferred_faction == false || ns.getFactionRep(preferred_faction) > next_aug['rep_required']) {
				available_augs.shift()
			} else {
				break;
			}			
			if (available_augs.length > 0) {
				next_aug = available_augs[0]
				preferred_faction = get_preferred_faction(ns, next_aug['factions'], this.use_gangs)
			} else {
				return false;
			}
		}
		ns.print(`Next hacking aug ${next_aug['name']} can be acquired most quickly from ${preferred_faction}.`);
		for (const stat in next_aug['stats']) {
			ns.print(`   ${stat}: ${next_aug['stats'][stat]}`)
		}
		return { 'name': next_aug['name'], 'faction': preferred_faction, 'rep_required': next_aug['rep_required'] }

	}

	async acquire_rep_for_aug (aug_name, faction_name, rep_required) {
		var ns = this.ns;
		var faction_rep = ns.getFactionRep(faction_name);
		var work_type = "Hacking Contracts";
		if (!ns.workForFaction(faction_name, work_type)) {
			work_type = "Security Work";
			if (!ns.workForFaction(faction_name, work_type)) {
				work_type = "Field Work";
			}
		}
		var rep_needed = rep_required - faction_rep;
		ns.print(`Need ${get_shortened_number(ns, rep_needed)} with ${faction_name} for augementation.`)
		if (work_type == "Security Work" || work_type == "Field Work") {
			if (rep_needed > 20000) {
				var stat_target = 250
				ns.print(`Training combat stats to ${stat_target} for better rep gain at ${work_type}.`);
				await this.train_combat_stats(stat_target);
			} else if (rep_needed > 10000) {
				var stat_target = 200
				ns.print(`Training combat stats to ${stat_target} for better rep gain at ${work_type}.`);
				await this.train_combat_stats(stat_target);
			} else if (rep_needed > 1000) {
				var stat_target = 150
				ns.print(`Training combat stats to ${stat_target} for better rep gain at ${work_type}.`);
				await this.train_combat_stats(stat_target);
			}
		}
		ns.print(`Earning rep with ${faction_name} by doing ${work_type}`)
		var faction_favor = ns.getFactionFavor(faction_name)
		while (faction_rep < rep_required) {
			ns.workForFaction(faction_name, work_type)
			await ns.sleep(1000)
			faction_rep = ns.getFactionRep(faction_name);
			var char_info = ns.getCharacterInformation();
			var time_needed = (rep_required - faction_rep) / char_info['workRepGain'];
			var faction_favor_gain = ns.getFactionFavorGain(faction_name)
			ns.print(`${faction_name} current rep: ${ns.nFormat(faction_rep, '0')} needed: ${rep_required} aug: ${aug_name}`)
			ns.print(`Estimated time to sufficient rep: ${get_readable_time(ns, time_needed * 1000)}`)
			ns.print(`Curren faction favor: ${faction_favor}, gain on install: ${get_shortened_number(ns, faction_favor_gain)}`)
			if (!ns.isFocused() || !ns.isBusy()) { 
				ns.print(`User aborted task. Exiting.`)
				ns.exit();
			}
			if(time_needed > this.max_rep_wait_time) {
				ns.print(`Time needed for ${aug_name} greater than ${get_readable_time(this.max_rep_wait_time)}, skipping!`);
				return false;
			}
		}
		return true;
	}	

	async acquire_next_aug(type = "none") {
		var ns = this.ns;
		var next_aug = this.determine_next_aug(type);
		if (next_aug == false) {
			ns.print(`No more augs available for type: ${type}!`);
			return false;
		}
		await this.acquire_rep_for_aug (next_aug['name'], next_aug['faction'], next_aug['rep_required'])
		if (next_aug['name'] == this.determine_next_aug(type)['name']) {
			ns.print(`No more augs within rep grind time parameters for type ${type},`);
			return false;
		} else {
			return true;
		}
	}

	async acquire_rep_for_all_available_hacking_augs() {
		var ns = this.ns;
		while (await this.acquire_next_aug("hacking")) {
			await ns.sleep(1000);
		}
	}

	async acquire_rep_for_all_available_augs() {
		var ns = this.ns;
		while (await this.acquire_next_aug()) {
			await ns.sleep(1000);
		}
	}

	at_exit() {
		var ns = this.ns;
		ns.stopAction();
	}

	async backdoor_faction_servers() {
		var ns = this.ns;
		ns.run("singularity/backdoor_factions.js", 1);
		ns.print(`Waiting for backdoor script to complete.`)
		while(ns.scriptRunning("singularity/backdoor_factions.js", "home")){
			await ns.sleep(1000);
		}
	}

	async red_pill() {
		var ns = this.ns;
		var player = ns.getPlayer();
		if (player.factions.includes("Daedalus")) {
			var owned_augs = ns.getOwnedAugmentations(true);
			if (!owned_augs.includes("The Red Pill")) {
				ns.print(`Acquiring rep to purchase The Red Pill from Daedalus!`)
				await this.acquire_rep_for_aug ("The Red Pill", "Daedalus", 2500000);
			} 
			var installed_augs = ns.getOwnedAugmentations(false);
			if (!installed_augs.includes("The Red Pill")) {
				ns.print(`The Red Pill is owned. Let's install it!`);
			} else {
				ns.print(`The Red Pill is installed! Let's end this!`);
			}
			
		}
		// if in faction
		// gain rep
		// if favor > 1.25 current reload
		// get red pill
		// reload
		// backdoor final server
	}

	determine_next_city_faction() {
		var ns = this.ns;
		var city_factions = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
		var next_faction = "Sector-12"
		for (const faction of city_factions) {
			var faction_augs = get_available_augs_from_faction(ns, faction)
			if (faction_augs.length > 1) {
				next_faction = faction;
				break;
			}
		}
		return next_faction;
	}

	get_city_faction_required_cash(next_city_faction) {
		if (next_city_faction == "Sector-12") {
			return 15000000;
		} else if (next_city_faction == "Aevum") {
			return 40000000;
		}  else if (next_city_faction == "Volhaven") {
			return 50000000;
		}  else if (next_city_faction == "Chongqing") {
			return 20000000;
		}  else if (next_city_faction == "New Tokyo") {
			return 20000000;
		}  else if (next_city_faction == "Ishima") {
			return 30000000;
		} else {
			ns.print(`ERROR: Unknown city faction!`);
			return false;
		}
	}

	async join_city_faction() {
		var ns = this.ns;
		var city_factions = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
		var player = ns.getPlayer();
		for (const faction of city_factions) {
			//If the player is already in a city faction
			if (player.factions.includes(faction)) { 
				ns.print(`Already in city faction ${faction}`);
				return true;
			}
		}		
		var next_city_faction = this.determine_next_city_faction()
		var required_cash = this.get_city_faction_required_cash(next_city_faction);
		var current_money = ns.getServerMoneyAvailable("home");
		if (current_money > required_cash) {
			this.travel_to(next_city_faction);
			var faction_invites = ns.checkFactionInvitations();
			while(!faction_invites.includes(next_city_faction)) {
				ns.print(`Waiting for faction invite from ${next_city_faction}`)
				await ns.sleep(5000)
				faction_invites = ns.checkFactionInvitations();
			}
			ns.joinFaction(next_city_faction);
			ns.print(`Faction ${next_city_faction} joined.`);
		} else {
			ns.print(`Insufficient money to join ${next_city_faction}, \$${get_shortened_number(ns,required_cash)} required.`)
		}
		
	}

	async join_factions() {
		var ns = this.ns;
		var city_factions = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
		var faction_invites = ns.checkFactionInvitations();
		await this.join_city_faction();		
		for (const faction of faction_invites) {
			ns.tprint(`Faction invite from ${faction}.`);
			if (!city_factions.includes(faction)) {
				ns.joinFaction(faction);
				ns.print(`Faction ${faction} joined.`);
			}
		}
	}

	async update_kills() {
		var ns = this.ns;
		var kills_filename = "/data/kills.txt"
		if (this.kills == 0) {
			this.kills = read_file_as_number(ns, kills_filename)
		} else {
			await ns.write(kills_filename, this.kills, "w");
		}
	}

	async train_hacking(stat_target = 0) {
		var ns = this.ns;
		var current_stats = ns.getStats()
		if (stat_target == 0) {
			stat_target = this.hacking_skill_target;
		}
		if (current_stats["hacking"] < stat_target) {
			ns.print(`Training hacking to ${stat_target}`);
			var current_money = ns.getServerMoneyAvailable("home");
			if (current_money > 200000) {
				this.travel_to("Volhaven");
				ns.universityCourse("ZB Institute of Technology", "Algorithms");
			} else {
				this.travel_to("Sector-12");
				ns.universityCourse("rothman university", "Algorithms");
			}
			while (current_stats["hacking"] < stat_target) {
				await ns.sleep(1000);
				var current_stats = ns.getStats()
				if (!ns.isBusy()) {
					ns.print(`User aborted task. Exiting.`)
					ns.exit();
				}
			}
			ns.stopAction();
		}
	}

	async train_charisma(stat_target = 0) {
		var ns = this.ns;
		var current_stats = ns.getStats()
		if (stat_target == 0) {
			stat_target = this.stat_target;
		}
		if (current_stats["charisma"] < stat_target) {
			ns.print(`Training charisma to ${stat_target}`);
			var current_money = ns.getServerMoneyAvailable("home");
			if (current_money > 200000) {
				this.travel_to("Volhaven");
				ns.universityCourse("ZB Institute of Technology", "Leadership");
			} else {
				this.travel_to("Sector-12");
				ns.universityCourse("rothman university", "Leadership");
			}
			while (current_stats["charisma"] < stat_target) {
				await ns.sleep(1000);
				var current_stats = ns.getStats()
				if (!ns.isBusy()) {
					ns.print(`User aborted task. Exiting.`)
					ns.exit();
				}
			}
			ns.stopAction();
		}
	}

	async train_combat_stats(stat_target = 0) {
		var ns = this.ns;
		var gym_stats = ["strength", "defense", "dexterity", "agility"];
		var university_stats = ["hacking", "charisma"];
		var gym_name = "powerhouse gym";
		if (stat_target == 0) {
			stat_target = this.stat_target;
		}
		for (const stat of gym_stats) {
			var current_stats = ns.getStats()
			if (current_stats[stat] < stat_target) {
				ns.print(`Training ${stat} to ${stat_target}`);
				this.travel_to("Sector-12");
				ns.gymWorkout(gym_name, stat);
				while (current_stats[stat] < stat_target) {
					await ns.sleep(1000);
					var current_stats = ns.getStats()
					if (!ns.isBusy()) {
						ns.print(`User aborted task. Exiting.`)
						ns.exit();
					}
				}
				ns.stopAction();
			}
		}
	}

	async commit_crime (karma_target, crime = "homicide") {
		var ns = this.ns
		var loop_forever = false;
		if (karma_target == 1) {
			loop_forever = true;
		}
		await this.update_kills();
		while (loop_forever || this.karma > karma_target) {
			if (ns.isBusy()) {
				await ns.sleep(1000);
			} else {
				ns.commitCrime(crime);
				this.kills += 1;
				ns.print(`Crime: ${crime}  Karma: ${this.karma}  Target: ${karma_target}  Kills ${this.kills}`);
				var remaining_time = (karma_target - this.karma) * -1000 // -1000 to make number positive and in milliseconds
				ns.print(`Estimated time to completion: ${get_readable_time(ns, remaining_time, false)}`)
				var current_time = new Date();
                var completion_time = new Date(current_time.getTime() + remaining_time);
                ns.print(`Estimated time of completion: ${completion_time}`)
				await this.update_kills();
				await ns.sleep(1000);
			}
		}
	}

	async do_crime(goal, crime = "homicide", min_chance = 0.75) {
		var ns = this.ns;
		if (goal == "factions") {
			ns.print(`Committing ${crime} to lower karma for faction invites.`)
			var karma_target = this.faction_karma_target;
		} else if (goal == "gang") {
			var karma_target = this.gang_karma_target;
			ns.print(`Committing ${crime} to lower karma enough to create a gang.`)
			min_chance = 0.9
		} else {
			ns.print(`No crime goal selected! Doing ${crime} forever!`)
			var karma_target = 1;
		}

		var crime_chance = ns.getCrimeChance(crime);
		
		while(crime_chance < min_chance) {
			ns.print(`${crime} chance is below ${min_chance * 100}%. Training!`);
			this.stat_target += 25;
			await this.train_combat_stats();
			crime_chance = ns.getCrimeChance("Homicide");
			await ns.sleep(1000);
		} 
	
		await this.commit_crime (karma_target, crime) 
		if (goal == "factions") {
			wait_for_sufficient_money(ns, 200000)
			this.travel_to("Chongqing");
			//this.travel_to("Sector-12");
			this.join_factions();
		}
	}

	async create_gang () {
		var ns = this.ns;
		var result = ns.gang.inGang();
		ns.print(`Gang result: ${result}`)
		if(result == false) {
			ns.print(`Working to form gang!`)
			await this.do_crime("gang");
			ns.gang.createGang("Slum Snakes")
			ns.exec("gang_runner.js","home");
			ns.exec("upgrade_gang_equip.js","home");
		} else {
			ns.print(`Gand already created!`)
		}
	}

	async crime_stuff() {
		if( this.use_gangs) {
			await this.create_gang();
		} else {
			await this.do_crime("factions");
			await this.backdoor_faction_servers();
		}
	}
		
	/** // Move to external program.
	async create_programs() {
		var ns = this.ns;
		var hacking_programs = ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe', ];
		for (const program of hacking_programs) {
			if (ns.fileExists(program, "home") == false) {
				ns.createProgram(program)
				while (ns.isBusy) {
					await ns.sleep(1000);
					if (!ns.isBusy() && ns.fileExists(program, "home") == false) {
						ns.print(`User aborted task. Exiting.`)
						ns.exit();
					}
					if (ns.fileExists(program, "home")) {
						ns.print(`${program} appears to have been purchased`);
						break;
					}
				}
			}
		}
	} */
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	ns.tail();

	let mastermind = new Mastermind(ns);
	await mastermind.main();
}