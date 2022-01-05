import { get_percentage_string, get_shortened_number, display_minutes_and_seconds } from "utils.js"

export function get_preferred_faction(ns, factions, exclude_gangs = false) {
	var faction_data = [];
	var gang_factions = ["Slum Snakes", "Tetrads", "The Syndicate", "The Dark Army",
		"Speakers for the Dead", "NiteSec", "The Black Hand"];
	for (const faction of factions) {
		var favor = ns.getFactionFavor(faction)
		var rep = ns.getFactionRep(faction)
		if (exclude_gangs && gang_factions.includes(faction)) {
			continue;
		} else {
			faction_data.push({ 'name': faction, 'favor': favor, 'rep': rep });
		}
	}

	if (faction_data.length > 0){
		faction_data.sort((firstItem, secondItem) => secondItem.rep - firstItem.rep);
		if (faction_data[0]['rep'] == 0) {
			ns.print(`Highest rep is zero, returning faction with highest favor`);
			faction_data.sort((firstItem, secondItem) => secondItem.favor - firstItem.favor);
		}
		var preferred_faction = faction_data[0]['name'];
		return preferred_faction;
	} else {
		return false;
	}
	
}

export function get_available_augs_from_faction(ns, faction) {
	var owned_augs = ns.getOwnedAugmentations(true);
	var augmentations = [];
	var faction_augs = ns.getAugmentationsFromFaction(faction)
	for (const aug of faction_augs) {
		if (!augmentations.includes(aug) && !owned_augs.includes(aug)) {
			augmentations.push(aug)
		}
	}
	return augmentations;
}

export function get_available_augs(ns, type = "none") {
	if (type == "hacking") {
		var filter = ["hacking_mult", "hacking_exp_mult", "hacking_speed_mult", "hacking_money_mult"];
	} else if (type == "combat") {
		var filter = ["strength_exp_mult", "defense_exp_mult", "dexterity_exp_mult", "agility_exp_mult",
			"strength_mult", "defense_mult", "dexterity_mult", "agility_mult"];
	}

	var augmentations = [];
	var character = ns.getPlayer();
	var current_factions = character['factions'];
	for (const faction of current_factions) {
		var faction_augs = get_available_augs_from_faction(ns, faction)
		for (const aug of faction_augs) {
			augmentations.push(aug)
		}
	}

	var aug_data = get_aug_data(ns, augmentations);
	var aug_results = [];
	if (type == "none") {
		aug_results = aug_data
	} else {
		for (const aug of aug_data) {
			for (const stat in aug['stats']) {
				if (filter.includes(stat)) {
					aug_results.push(aug);
					break;
				}
			}
		}
	}

	return aug_results
}

function get_aug_data(ns, augmentations) {
	var aug_data = [];
	var character = ns.getPlayer();
	var current_factions = character['factions'];

	for (const augmentation of augmentations) {
		var rep_req = ns.getAugmentationRepReq(augmentation);
		var price = ns.getAugmentationPrice(augmentation);
		var prereq = ns.getAugmentationPrereq(augmentation);
		var stats = ns.getAugmentationStats(augmentation);
		var factions = [];
		for (const faction of current_factions) {
			if (ns.getAugmentationsFromFaction(faction).includes(augmentation)) {
				factions.push(faction);
			}
		}
		aug_data.push({ 'name': augmentation, 'rep_required': rep_req, 'price': price, 'prerequisite': prereq, 'stats': stats, 'factions': factions });
	}

	aug_data.sort((firstItem, secondItem) => firstItem.rep_required - secondItem.rep_required);
	return aug_data;
}

function get_all_augs(ns) {
	var factions = ["CSEC"];
	var augmentations = [];
	for (const faction of factions) {
		var faction_augs = ns.getAugmentationsFromFaction(faction)
		for (const aug of faction_augs) {
			if (!augmentations.includes(aug)) {
				augmentations.push(aug)
			}
		}
	}

	return get_aug_data(ns, augmentations);
}

function display_hacking_augs(ns) {
	var hacking_augs = get_available_augs(ns, "hacking");

	for (const aug of hacking_augs) {
		ns.tprint(`${aug['name']} rep: ${get_shortened_number(ns, aug['rep_required'])} price: \$${get_shortened_number(ns, aug['price'])} prerequisite: ${aug['prerequisite']}`)
		ns.tprint(`   Factions: ${aug['factions']}`)
		//ns.tprint(`   Stats: ${aug['stats']}`)
		if (aug['name'] != "NeuroFlux Governor") {
			for (const stat in aug['stats']) {
				ns.tprint(`   ${stat}: ${aug['stats'][stat]}`)
			}
		}
	}
}

function display_aug_data(ns, aug_data) {
	for (const aug of aug_data) {
		ns.tprint(`${aug['name']} rep: ${get_shortened_number(ns, aug['rep_required'])} price: \$${get_shortened_number(ns, aug['price'])} prerequisite: ${aug['prerequisite']}`)
		ns.tprint(`   Factions: ${aug['factions']}`)
		//ns.tprint(`   Stats: ${aug['stats']}`)
		if (aug['name'] != "NeuroFlux Governor") {
			for (const stat in aug['stats']) {
				ns.tprint(`   ${stat}: ${aug['stats'][stat]}`)
			}
		}
	}
}

/** @param {NS} ns **/
export async function main(ns) {
	var available_augs = get_available_augs(ns);
	//display_aug_data(ns, available_augs);
}