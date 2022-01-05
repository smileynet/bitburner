/** @param {NS} ns **/
export async function main(ns) {
	var program_to_purchase = ns.args[0];
	if (program_to_purchase == "TOR"){
		ns.purchaseTor();
		ns.tprint(`TOR purchased!`)
	} else {
		if (ns.getPlayer().tor == false) {
			ns.purchaseTor();
		}
		ns.purchaseProgram(program_to_purchase);
        ns.tprint(`${program_to_purchase} purchased!`)
	}
}