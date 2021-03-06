var player = ns.getPlayer();
const hackLevel = player.hacking
var weaken_ram = 1.75;
var grow_ram = 1.75;
var hack_ram = 1.7;
const weakenCost = weaken_ram * ns.formulas.hacking.weakenTime(server, player);
const growCost = grow_ram * ns.formulas.hacking.growTime(server, player) + weakenCost * 0.004 / 0.05;
const hackCost = hack_ram * ns.formulas.hacking.hackTime(server, player) + weakenCost * 0.002 / 0.05;
const expRate = ns.formulas.hacking.hackExp(server, player) * (1 + 0.002 / 0.05) / (hackCost) * 1000;