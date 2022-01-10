import {read_file} from "utils.js";

function get_gang_wanted_gain_rate(ns) {
	var gang_info = get_gang_info(ns);
	var gang_wanted_gain_rate = gang_info['wantedLevelGainRate'];
	return gang_wanted_gain_rate;
}

function get_member_wanted_gain_rate(ns, member) {
	var member_info = get_member_info(ns, member);
	var member_wanted_gain_rate = member_info['wantedLevelGain']
	return member_wanted_gain_rate;
}

function get_gang_info(ns) {
	return ns.gang.getGangInformation();
}

function get_member_info(ns, member) {
	return ns.gang.getMemberInformation(member)
}

export function get_current_territory(ns) {
	var gang_info = get_gang_info(ns);
	var territory_held = gang_info['territory'];
	return territory_held;
}
	
function get_gang_type(ns) {
	if (is_combat_gang) {
		return "isCombat";
	} else if (is_hacking_gang) {
		return "isHacking";
	} else {
		ns.tprint(`ERROR: Could not determine gang type!`)
	}
}

function is_all_equipment_purchased (ns) {
	var filename = "all_gang_equip_status.txt"
	var is_purchased = read_file(ns, filename)
	if (is_purchased == "true") {
		return true;
	} else {
		return false;
	}
}

function is_combat_gang(ns) {
	return !(get_gang_info(ns)['isHacking']);
}

function is_hacking_gang(ns) {
	return get_gang_info(ns)['isHacking'];
}

function get_member_count(ns) {
	return ns.gang.getMemberNames().length;
}

function get_gang_members(ns) {
	return ns.gang.getMemberNames();
}

function set_default_training_task(ns, member) {
	if (is_combat_gang(ns)) {
		result = ns.gang.setMemberTask(member, "Train Combat");
	} else if (is_hacking_gang(ns)) {
		result = ns.gang.setMemberTask(member, "Train Hacking");
	} else {
		ns.tprint(`ERROR: Gang type not recognized, could not assign first task.`);
		var result = false;
	}
	return result;
}

async function do_full_recruitement(ns) {
	while (ns.gang.canRecruitMember()) {
        var names = ["Neo","Chastity","Slippy","Boozy","Trigger","Dozer","Fanny","Lex","Lizard","Portia","Skinny","Maude","Mabel","Cherry"]
		var member_names = ns.gang.getMemberNames();
        var member_count = get_member_count(ns);
		ns.print(`Current member count: ${member_count}`);
        for (const new_member_name of names) {
            if(member_names.includes(new_member_name)) {
                continue;
            }
            var result = ns.gang.recruitMember(new_member_name);
            if (result) {
                ns.print(`New member ${new_member_name} recruited!`);
                result = set_default_training_task(ns, new_member_name)
                if (result) {
                    ns.print(`New member assigned to training.`);
                } else {
                    ns.tprint(`ERROR: Could not assign new member to training task.`)
                }
            } else {
                ns.tprint(`WARN: Could not recruit new member of name ${new_member_name}.`);
                break;
            }
        }
		
		await ns.sleep(1000);
	}
	//ns.print(`Gang is full! Cannot recruit additional members.`);
}

function do_ascend_member(ns, member) {
	//var pre_ascent_multiplier = get_member_info(ns, member)['str_asc_mult'];
	var result = ns.gang.ascendMember(member);
	//var post_ascent_multiplier = get_member_info(ns, member)['str_asc_mult'];
	if (result == undefined) {
		ns.tprint(`ERROR: Could not ascend ${member}!`);
	} else {
		//ns.print(`${member} has ascended!`);
		//ns.tprint(`Pre-ascent multipler: ${ns.nFormat(pre_ascent_multiplier, '0,0.00')} Post-ascent multipler: ${ns.nFormat(post_ascent_multiplier, '0,0.00')}`)
	}
	return result;
}

function do_ascend_members(ns) {
	var members = ns.gang.getMemberNames()
	for (const member of members) {
		var ascension_result = ns.gang.getAscensionResult(member);
		//ns.tprint(ascension_result);
		var member_info = get_member_info(ns, member);
		var training_tasks = ["Train Combat", "Train Hacking", "Train Charisma"];
		var stats = ["hack", "str", "def", "dex", "agi", "cha"];
		if (training_tasks.includes(member_info['task'])) {
			var ascent_multiplier = 1.1;
		} else {
			var ascent_multiplier = 1.2;
		}

		if (ascension_result == null) {
			//ns.print(`${member} is not eligible for ascension.`);
		} else {
			for (const stat of stats) {
				if (ascension_result[stat] > ascent_multiplier) {
					do_ascend_member(ns, member);
					ns.print(`${member} has ascended for ${stat}!`);
					ns.tprint(`${member} has ascended for ${stat}!`);
					ns.toast(`${member} has ascended for ${stat}!`);
					set_default_training_task(ns, member)
					break;
				}
			}
		}
	}
}

function do_reset_all_member_tasks(ns) {
	var members = get_gang_members(ns);
	for (const member of members) {
		set_default_training_task(ns, member);
	}
}

function check_for_others_training_charisma(ns) {
	var members = get_gang_members(ns);
	for (const member of members) {
		var member_info = get_member_info(ns, member);
		if (member_info['task'] == "Train Charisma") {
			//ns.print(`Others are already training in charisma.`)
			return true;
		}
	}
	return false;
}

function decide_which_task(ns) {
	var terrorism_ratio = 0;
	//var min_territory_level = 0.2; // percentage of total territory

	var above_min_readiness = is_above_min_chance_to_win_territory(ns);
	var gang_wanted_gain_rate = get_gang_wanted_gain_rate(ns)
	var all_equip_purchased = is_all_equipment_purchased(ns);
	var members = get_gang_members(ns);
	var terrorism_members = 0;
	var trafficking_members = 0;
	//var territory_held = get_current_territory(ns);

	for (const member of members) {
		var member_wanted_gain_rate = get_member_wanted_gain_rate(ns, member);
		var member_info = get_member_info(ns, member);
		if (gang_wanted_gain_rate - member_wanted_gain_rate <= 0) { // If we have room to add wanted level
			if (above_min_readiness == false) { // Take territory if needed
				return "Territory Warfare";
			} else if (all_equip_purchased == false ){ // First make sure all members have full equipment
				return "Human Trafficking";
			} else { // focus on rep
				if (member_info['task'] == "Terrorism") {
					terrorism_members = terrorism_members + 1;
				} else if (member_info['task'] == "Human Trafficking") {
					trafficking_members = trafficking_members + 1;
				}

				if (terrorism_members >= trafficking_members * terrorism_ratio) {
					return "Human Trafficking";
				} else {
					return "Terrorism";
				}
			}
		} else { // If we have too much wanted level
			return "Vigilante Justice";
		}		
	}
}

async function do_manage_member_tasks(ns, member) {
	var min_skill_level = 300;
	var min_asc_mult_level = 5;
	var member_info = get_member_info(ns, member);
	
	var next_task = "Train Combat";
	if (member_info['str'] > min_skill_level && member_info['str_asc_mult'] > min_asc_mult_level) {
		next_task = "Train Hacking";
	}
	if (member_info['hack'] > min_skill_level && member_info['hack_asc_mult'] > min_asc_mult_level) {
		next_task = "Train Charisma";
	}		
	if (member_info['cha'] > min_skill_level && member_info['cha_asc_mult'] > min_asc_mult_level) {	
		next_task = decide_which_task(ns);
	}
	if (member_info['task'] != next_task) {
		ns.print(`Assigning ${member} to ${next_task} from ${member_info['task']}`);
		var result = ns.gang.setMemberTask(member, next_task);
		await ns.sleep(1000);
		// TODO: handle result
	}
}

async function do_gang_task_management(ns) {
	var gang_info = get_gang_info(ns);
	var wanted_gain_rate = gang_info['wantedLevelGainRate'];
	if (wanted_gain_rate > 0) {
		//ns.toast(`Warning! Wanted level gain rate is higher than zero!`);
		// demote
	}
	var members = get_gang_members(ns);
	for (const member of members) {
		await do_manage_member_tasks(ns, member);
	}
}

function is_above_min_chance_to_win_territory(ns) {
	var min_chance_to_win = 0.55;
	var my_gang = ns.gang.getGangInformation();
	var my_gang_name = my_gang['faction']
	var my_gang_power = my_gang['power']
	var other_gangs = ns.gang.getOtherGangInformation();
	var other_gang_names = Object.keys(other_gangs);
	var strongest_gang = true;
	var highest_power_diff = 0;
	for (const gang_name of other_gang_names) {
		var gang_info = other_gangs[gang_name];
		var gang_power = gang_info['power'];
		if (gang_name != my_gang_name) {
			var chance_to_win = ns.gang.getChanceToWinClash(gang_name)
			// ns.print(`Chance to win against ${gang_name}: ${chance_to_win}!`)
			if (chance_to_win > min_chance_to_win) {
				// ns.print(`We're ready to beat ${gang_name}!`)
			} else {
				var power_diff = gang_power - my_gang_power;
				if (power_diff > highest_power_diff) {
					highest_power_diff = power_diff
				}
				strongest_gang = false;
				// ns.print(`We're not ready to fight ${gang_name}.`)
			}
		}
	}
	if (strongest_gang) {
		// ns.print(`We're the strongest gang! Let's rumble!`);
		return true;
	} else {
		// ns.print(`We're the not strongest gang! Let's bide out time!`);
		return false;
	}
}

function do_gang_warfare(ns) {
	var ready_for_engagement = is_above_min_chance_to_win_territory(ns);
	// ns.print(ready_for_engagement);
	var gang_info = get_gang_info(ns);
	if (ready_for_engagement != gang_info['territoryWarfareEngaged']) {
		ns.gang.setTerritoryWarfare(ready_for_engagement);
		ns.toast(`Gang warfare engagement changed to ${ready_for_engagement}`);
		ns.tprint(`Gang warfare engagement changed to ${ready_for_engagement}`);
	}
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	ns.exec("status/gang.ns","home");

	if (ns.gang.inGang() == false) {
		ns.tprint(`Not currently in a gang! Exiting.`);
		//TODO: ns.gangcreateGang(faction)
		ns.exit();
	}
	//do_reset_all_member_tasks(ns)

	while (true) {
		await do_full_recruitement(ns);
		do_ascend_members(ns);
		await do_gang_task_management(ns);
		do_gang_warfare(ns);
		await ns.sleep(1000);
	}
}