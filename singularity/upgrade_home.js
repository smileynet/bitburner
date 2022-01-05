/** @param {NS} ns **/
export async function main(ns) {
	var current_money = ns.getServerMoneyAvailable("home");
	var cores_cost = ns.getUpgradeHomeCoresCost();
	var ram_cost = ns.getUpgradeHomeRamCost();
	if (cores_cost < ram_cost) {
		if (cores_cost < current_money) {
			ns.upgradeHomeCores();
			ns.rm("/data/next_home_upgrade_cost.txt");
			ns.tprint(`Home cores upgraded!`)
			ns.toast(`Home cores upgraded!`)
		} else {
			await ns.write("/data/next_home_upgrade_cost.txt", cores_cost, "w");
		}
	} else {
		if (ram_cost < current_money) {
			ns.upgradeHomeRam();
			ns.rm("/data/next_home_upgrade_cost.txt");
			ns.tprint(`Home RAM upgraded!`)
			ns.toast(`Home RAM upgraded!`)
		} else {
			await ns.write("/data/next_home_upgrade_cost.txt", ram_cost, "w");
		}
	}
}