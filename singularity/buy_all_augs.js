import { get_available_augs, get_preferred_faction } from "/helpers/augmentations.js";
import {get_shortened_number, wait_for_sufficient_money} from "utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	if (ns.args[0] == false) {
		var wait_to_purchase = true;
 	} else {
		var wait_to_purchase = false; // Wait for enough money to buy the next aug?
	 }

	ns.tprint(`wait: ${wait_to_purchase}`)
		
	if(ns.args[1]) {
		var type = ns.args[1];
	} else {
		var type = "none"; // Types: Hacking, combat
	}

	var available_augs = get_available_augs(ns, type);		
	var augs_to_buy = [];
	for (const aug of available_augs) {
		var preferred_faction = get_preferred_faction(ns, aug['factions'])
		if (ns.getFactionRep(preferred_faction) > aug['rep_required']) {
			augs_to_buy.push(aug);
		}
	}
	augs_to_buy.sort((firstItem, secondItem) => secondItem.price - firstItem.price);

	ns.tprint(`Current augs available to purchase:`)
	for (const aug of augs_to_buy) {
		var aug_price = ns.getAugmentationPrice(aug['name'])
		ns.tprint(`   ${aug['name']} price: ${get_shortened_number(ns, aug_price)}`)
	}

	if (ns.args[0] == "list") {
		ns.exit();
	}
	
	for (const aug of augs_to_buy) {
		var money_available = ns.getServerMoneyAvailable("home");
		var aug_price = ns.getAugmentationPrice(aug['name'])
		if (money_available < aug_price && wait_to_purchase) {
			ns.print(`Waiting to purchase ${aug['name']} for \$${get_shortened_number(ns, aug_price)}`);
			ns.tprint(`Waiting to purchase ${aug['name']} for \$${get_shortened_number(ns, aug_price)}`);
			await wait_for_sufficient_money(ns, aug_price);
		}
		if (money_available > aug_price) {
			var preferred_faction = get_preferred_faction(ns, aug['factions']);
			if(ns.purchaseAugmentation(preferred_faction, aug['name'])) {
				ns.print(`${aug['name']} purchased for \$${get_shortened_number(ns, aug_price)}`);
				ns.tprint(`${aug['name']} purchased for \$${get_shortened_number(ns, aug_price)}`);
				ns.toast(`${aug['name']} purchased for \$${get_shortened_number(ns, aug_price)}`);
			}
		}
		
	}

	var money_available = ns.getServerMoneyAvailable("home");
	var aug_price = ns.getAugmentationPrice("NeuroFlux Governor")
	var player_factions = ns.getPlayer()['factions']
	var preferred_faction = get_preferred_faction(ns, player_factions)
	var rep_req = ns.getAugmentationRepReq("NeuroFlux Governor");
	while (aug_price < money_available && ns.getFactionRep(preferred_faction) > rep_req) {
		ns.tprint(`Buying NeuroFlux Governor from ${preferred_faction} for \$${get_shortened_number(ns, aug_price)}`)
		ns.purchaseAugmentation(preferred_faction, "NeuroFlux Governor")
		await ns.sleep(10)
		money_available = ns.getServerMoneyAvailable("home");
		aug_price = ns.getAugmentationPrice("NeuroFlux Governor")
		rep_req = ns.getAugmentationRepReq("NeuroFlux Governor")
	}
	
}