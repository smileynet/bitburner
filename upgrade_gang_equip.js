function get_equipment_list(ns) {
	var equipment_list = ns.gang.getEquipmentNames();
	var stats = ["hack", "str", "def", "dex", "agi", "cha"];
	var equipment = [];
	for (const item of equipment_list) {
		var item_dict = {};
		item_dict['name'] = item;
		item_dict['cost'] = ns.gang.getEquipmentCost(item);
		item_dict['type'] = ns.gang.getEquipmentType(item);
		var item_stats = ns.gang.getEquipmentStats(item);
		
		var valid_stats = [];
		for (const stat of stats) {
			if (item_stats[stat] != undefined) {
				item_dict[stat] = item_stats[stat];
			}
		}
		equipment.push(item_dict);
	}
	return equipment;
}

function do_buy_equip_for_member(ns, member, item) {
	var current_money = ns.getServerMoneyAvailable("home");
	var item_cost = ns.gang.getEquipmentCost(item)
	if (item_cost < current_money) {
		var result = ns.gang.purchaseEquipment(member, item);
		if (result) {
			ns.print(`${item} purchased for ${member}.`)
			return true;
		} else {
			ns.print(`WARN: Could not purchase ${item} for ${member}.`)
			return false;
		}
	} else {
		//ns.print(`Not enough money to purchase ${item} for ${member}. Cost: ${item_cost} Current money: ${current_money}.`)
		return false;
	}
}

function do_buy_best_equip_for_member(ns, member) {
	var member_info = ns.gang.getMemberInformation(member)
	var equipment = ["AWM Sniper Rifle","Liquid Body Armor","White Ferrari","Jack the Ripper"]
	var equipment_to_purchase = []
	var all_equip_purchased = true;
	for (const item of equipment) {
		if (member_info['upgrades'].includes(item)) {
			//ns.print(`${item} already owned!`)
		} else {
			equipment_to_purchase.push(item)
		}
	}

	for (const item of equipment_to_purchase) {
		var result = do_buy_equip_for_member(ns, member, item)
		if (result == false) {
			all_equip_purchased = false;
		}
	}
	return all_equip_purchased;
}

function do_buy_best_equip_for_members(ns) {
	var members = ns.gang.getMemberNames()
	var all_equip_purchased = true;
	for (const member of members) {
		var result = do_buy_best_equip_for_member(ns, member);
		if (result == false) {
			all_equip_purchased = false;
		}
	}
	return all_equip_purchased;
}

function do_buy_augs_for_members(ns) {
	var augs =["Bionic Arms","Synfibril Muscle","BitWire","Nanofiber Weave","Bionic Legs","DataJack","Neuralstimulator","Bionic Spine","BrachiBlades","Synthetic Heart","Graphene Bone Lacings"]
	var members = ns.gang.getMemberNames()
	for (const aug of augs) {		
		for (const member of members) {
			var member_info = ns.gang.getMemberInformation(member)
			if (member_info['augmentations'].includes(aug)) {
				//ns.print(`${aug} already owned!`)
			} else {
				do_buy_equip_for_member(ns, member, aug);
			}
		}
	}
}

async function write_equip_status_to_file(ns, status) {
	await ns.write("all_gang_equip_status.txt", status, "w");
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");;

	if (ns.gang.inGang() == false) {
		ns.tprint(`Not currently in a gang! Exiting.`);
		ns.exit();
	}

	var min_cash_on_hand = 10000000000

	while (true) {
		var equip_result = do_buy_best_equip_for_members(ns);
		var aug_result = do_buy_augs_for_members(ns);
		if (equip_result == false || aug_result == false || ns.getServerMoneyAvailable("home") < min_cash_on_hand) {
			var all_equip_purchased = false;
		} else {
			all_equip_purchased = true;
		}
		await write_equip_status_to_file(ns, all_equip_purchased);
		await ns.sleep(10000);
	}
}