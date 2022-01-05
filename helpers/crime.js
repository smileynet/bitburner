import {get_percentage_string, get_shortened_number, display_minutes_and_seconds} from "utils.js"

/** @param {NS} ns **/
export async function main(ns) {
	var crimes = ["Shoplift", "Rob store", "Mug someone", "Larceny", "Deal Drugs", "Bond Forgery",
		"Traffick illegal Arms", "Homicide", "Grand theft Auto", "Kidnap and Randsom", "Assassinate", "Heist"]
	var crime_array = [];
	for (const crime of crimes) {
		var crime_chance = ns.getCrimeChance(crime);
		var crime_stats = ns.getCrimeStats(crime);
		var earnings_per_sec = crime_stats['money'] / crime_stats['time'];
		var karma_per_sec = crime_stats['karma'] / crime_stats['time'];
		
		var crime_item = {'crime': crime, 'earnings_per_sec': earnings_per_sec, 'karma_per_sec': karma_per_sec}
		crime_array.push(crime_item);
		ns.tprint(`${crime} chance: ${get_percentage_string(ns, crime_chance)} earnings/sec: \$${earnings_per_sec} karma/sec: ${karma_per_sec}`)
		for (const stat in crime_stats) {
			var pretty_value = crime_stats[stat]
			if (stat == "money") {
				pretty_value = '$' + get_shortened_number(ns, pretty_value)
			} else if (stat == "time") {
				pretty_value = display_minutes_and_seconds(ns, pretty_value)
			}
			ns.tprint(`   ${stat}: ${pretty_value}`)
		}
	}

	crime_array.sort((firstItem, secondItem) => secondItem.earnings_per_sec - firstItem.earnings_per_sec);
	ns.tprint(`Top money earning crimes:`)
	for (const crime of crime_array) {
		ns.tprint(`   Crime: ${crime['crime']} Earnings: ${crime['earnings_per_sec']}`)
	}

	crime_array.sort((firstItem, secondItem) => secondItem.karma_per_sec - firstItem.karma_per_sec);
	ns.tprint(`Top karma earning crimes:`)
	for (const crime of crime_array) {
		ns.tprint(`   Crime: ${crime['crime']} Earnings: ${crime['karma_per_sec']}`)
	}
}

/**
Top money earning crimes:
Crime: Heist Earnings: 200
Crime: Assassinate Earnings: 40
Crime: Kidnap and Randsom Earnings: 30
Crime: Grand theft Auto Earnings: 20
Crime: Bond Forgery Earnings: 15
Crime: Traffick illegal Arms Earnings: 15
Crime: Homicide Earnings: 15
Crime: Deal Drugs Earnings: 12
Crime: Mug someone Earnings: 9
Crime: Larceny Earnings: 8.88888888888889
Crime: Shoplift Earnings: 7.5
Crime: Rob store Earnings: 6.666666666666667

Top karma earning crimes:
Crime: Homicide Earnings: 0.001
Crime: Grand theft Auto Earnings: 0.0000625
Crime: Mug someone Earnings: 0.0000625
Crime: Kidnap and Randsom Earnings: 0.00005
Crime: Deal Drugs Earnings: 0.00005
Crime: Shoplift Earnings: 0.00005
Crime: Assassinate Earnings: 0.000033333333333333335
Crime: Heist Earnings: 0.000025
Crime: Traffick illegal Arms Earnings: 0.000025
Crime: Larceny Earnings: 0.000016666666666666667
Crime: Rob store Earnings: 0.000008333333333333334
Crime: Bond Forgery Earnings: 3.3333333333333335e-7

Shoplift chance: 6.31% earnings/sec: $7.5 karma/sec: 0.00005
difficulty: 0.05
karma: 0.1
kills: 0
money: $15.00k
name: Shoplift
time: 02 seconds.
type: shoplift
hacking_success_weight: 0
strength_success_weight: 0
defense_success_weight: 0
dexterity_success_weight: 1
agility_success_weight: 1
charisma_success_weight: 0
hacking_exp: 0
strength_exp: 0
defense_exp: 0
dexterity_exp: 2
agility_exp: 2
charisma_exp: 0
intelligence_exp: 0

Rob store chance: 100.00% earnings/sec: $6.666666666666667 karma/sec: 0.000008333333333333334
difficulty: 0.2
karma: 0.5
kills: 0
money: $400.00k
name: Rob Store
time: 1 minute and 00 seconds
type: rob a store
hacking_success_weight: 0.5
strength_success_weight: 0
defense_success_weight: 0
dexterity_success_weight: 2
agility_success_weight: 1
charisma_success_weight: 0
hacking_exp: 30
strength_exp: 0
defense_exp: 0
dexterity_exp: 45
agility_exp: 45
charisma_exp: 0
intelligence_exp: 0.375

Mug someone chance: 100.00% earnings/sec: $9 karma/sec: 0.0000625
difficulty: 0.2
karma: 0.25
kills: 0
money: $36.00k
name: Mug
time: 04 seconds.
type: mug someone
hacking_success_weight: 0
strength_success_weight: 1.5
defense_success_weight: 0.5
dexterity_success_weight: 1.5
agility_success_weight: 0.5
charisma_success_weight: 0
hacking_exp: 0
strength_exp: 3
defense_exp: 3
dexterity_exp: 3
agility_exp: 3
charisma_exp: 0
intelligence_exp: 0

Larceny chance: 69.38% earnings/sec: $8.88888888888889 karma/sec: 0.000016666666666666667
difficulty: 0.3333333333333333
karma: 1.5
kills: 0
money: $800.00k
name: Larceny
time: 1 minute and 30 seconds
type: commit larceny
hacking_success_weight: 0.5
strength_success_weight: 0
defense_success_weight: 0
dexterity_success_weight: 1
agility_success_weight: 1
charisma_success_weight: 0
hacking_exp: 45
strength_exp: 0
defense_exp: 0
dexterity_exp: 60
agility_exp: 60
charisma_exp: 0
intelligence_exp: 0.75

Deal Drugs chance: 47.83% earnings/sec: $12 karma/sec: 0.00005
difficulty: 1
karma: 0.5
kills: 0
money: $120.00k
name: Deal Drugs
time: 10 seconds.
type: deal drugs
hacking_success_weight: 0
strength_success_weight: 0
defense_success_weight: 0
dexterity_success_weight: 2
agility_success_weight: 1
charisma_success_weight: 3
hacking_exp: 0
strength_exp: 0
defense_exp: 0
dexterity_exp: 5
agility_exp: 5
charisma_exp: 10
intelligence_exp: 0

Bond Forgery chance: 4.96% earnings/sec: $15 karma/sec: 3.3333333333333335e-7
difficulty: 0.5
karma: 0.1
kills: 0
money: $4.50m
name: Bond Forgery
time: 5 minutes and 00 seconds
type: forge corporate bonds
hacking_success_weight: 0.05
strength_success_weight: 0
defense_success_weight: 0
dexterity_success_weight: 1.25
agility_success_weight: 0
charisma_success_weight: 0
hacking_exp: 100
strength_exp: 0
defense_exp: 0
dexterity_exp: 150
agility_exp: 0
charisma_exp: 15
intelligence_exp: 3

Traffick illegal Arms chance: 19.89% earnings/sec: $15 karma/sec: 0.000025
difficulty: 2
karma: 1
kills: 0
money: $600.00k
name: Traffick Arms
time: 40 seconds.
type: traffick illegal arms
hacking_success_weight: 0
strength_success_weight: 1
defense_success_weight: 1
dexterity_success_weight: 1
agility_success_weight: 1
charisma_success_weight: 1
hacking_exp: 0
strength_exp: 20
defense_exp: 20
dexterity_exp: 20
agility_exp: 20
charisma_exp: 40
intelligence_exp: 0

Homicide chance: 47.52% earnings/sec: $15 karma/sec: 0.001
difficulty: 1
karma: 3
kills: 1
money: $45.00k
name: Homicide
time: 03 seconds.
type: commit homicide
hacking_success_weight: 0
strength_success_weight: 2
defense_success_weight: 2
dexterity_success_weight: 0.5
agility_success_weight: 0.5
charisma_success_weight: 0
hacking_exp: 0
strength_exp: 2
defense_exp: 2
dexterity_exp: 2
agility_exp: 2
charisma_exp: 0
intelligence_exp: 0

Grand theft Auto chance: 11.74% earnings/sec: $20 karma/sec: 0.0000625
difficulty: 8
karma: 5
kills: 0
money: $1.60m
name: Grand Theft Auto
time: 1 minute and 20 seconds
type: commit grand theft auto
hacking_success_weight: 1
strength_success_weight: 1
defense_success_weight: 0
dexterity_success_weight: 4
agility_success_weight: 2
charisma_success_weight: 2
hacking_exp: 0
strength_exp: 20
defense_exp: 20
dexterity_exp: 20
agility_exp: 80
charisma_exp: 40
intelligence_exp: 0.8

Kidnap and Randsom chance: 6.38% earnings/sec: $30 karma/sec: 0.00005
difficulty: 5
karma: 6
kills: 0
money: $3.60m
name: Kidnap
time: 2 minutes and 00 seconds
type: kidnap someone for ransom
hacking_success_weight: 0
strength_success_weight: 1
defense_success_weight: 0
dexterity_success_weight: 1
agility_success_weight: 1
charisma_success_weight: 1
hacking_exp: 0
strength_exp: 80
defense_exp: 80
dexterity_exp: 80
agility_exp: 80
charisma_exp: 80
intelligence_exp: 1.3

Assassinate chance: 2.03% earnings/sec: $40 karma/sec: 0.000033333333333333335
difficulty: 8
karma: 10
kills: 1
money: $12.00m
name: Assassination
time: 5 minutes and 00 seconds
type: assassinate a high-profile target
hacking_success_weight: 0
strength_success_weight: 1
defense_success_weight: 0
dexterity_success_weight: 2
agility_success_weight: 1
charisma_success_weight: 0
hacking_exp: 0
strength_exp: 300
defense_exp: 300
dexterity_exp: 300
agility_exp: 300
charisma_exp: 0
intelligence_exp: 3.25

Heist chance: 4.74% earnings/sec: $200 karma/sec: 0.000025
difficulty: 18
karma: 15
kills: 0
money: $120.00m
name: Heist
time: 10 minutes and 00 seconds
type: pull off the ultimate heist
hacking_success_weight: 1
strength_success_weight: 1
defense_success_weight: 1
dexterity_success_weight: 1
agility_success_weight: 1
charisma_success_weight: 1
hacking_exp: 450
strength_exp: 450
defense_exp: 450
dexterity_exp: 450
agility_exp: 450
charisma_exp: 450
intelligence_exp: 6.5
*/