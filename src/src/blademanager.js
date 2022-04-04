import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";

export class BladeManager {
    constructor(ns, messenger, interval = 60) {
        this.messenger = messenger;
        this.recovering = false;
        this.min_success_chance = 0.75;
        this.max_chaos = 50;
        this.max_intel_spread = 0.3;
        this.rank_target = 5000
        this.finished = false
        this.refresh_interval = interval;
        this.current_interval = interval;
        this.current_action = 'none'
        this.current_city = 'none'
    }

    async init(ns) {
        let result = false;
        while (!result && ns.isBusy()) {
            result = ns.stopAction();
            ns.tprint(`Waiting for previous action to finish.`)
            await ns.sleep(100);
        }
    }

    run(ns) {
        this.upgrade_skills(ns);
        this.refresh_action(ns);
    }

    priority(ns) {
        if (!ns.fileExists('money.txt') && ns.bladeburner.getRank() < this.rank_target) {
            return 'rank'
        } else {
            return 'money'
        }
    }

    refresh_action(ns) {
        if (this.current_interval <= 0) {
            const next_action = this.select_next_action(ns)
            console.debug(next_action);
            let message = `  Bladeburner next action: ${next_action.name} in ${next_action.city}\n`
            if (next_action.name == this.current_action && next_action.city == this.current_city &&
                next_action.type != 'BlackOps' && ns.bladeburner.getCurrentAction().type != 'Idle') {
                message += `  Staying on current plan.\n`
            } else {
                if (next_action.city != 'none') {
                    const result = ns.bladeburner.switchCity(next_action.city);
                    this.current_city = next_action.city
                    message += `  Switching to ${next_action.city}, result: ${result}\n`
                } else {
                    this.current_city = 'none'
                }
                const result = ns.bladeburner.startAction(next_action.type, next_action.name);
                this.current_action = next_action.name
                message += `  Executing ${next_action.name}, result: ${result}\n`
            }
            this.messenger.add_message('BladeBurner action refresh', message)
            this.current_interval = Math.max(this.refresh_interval, this.current_interval);
        } else {
            this.current_interval--
        }
    }

    skills(ns) {
        const stam_priority = ns.bladeburner.getStamina()[1] < 500 ? 1.2 : 0.5
        const skills = [{ name: "Blade's Intuition", priority: 0.5 },
            { name: "Cloak", priority: 1.1 },
            { name: "Short-Circuit", priority: 1.1 },
            { name: "Digital Observer", priority: 0.8 },
            { name: "Tracer", priority: 0.8 },
            { name: "Overclock", priority: 1.1 },
            { name: "Reaper", priority: 1 },
            { name: "Evasive System", priority: 1 },
            { name: "Datamancer", priority: 0.7 },
            { name: "Cyber's Edge", priority: stam_priority },
            { name: "Hands of Midas", priority: 1.1 },
            { name: "Hyperdrive", priority: 1.2 },
        ];

        return skills
    }

    get contracts() { // TODO: deprecated, refactor usage to get_actions(type)
        return this.get_actions('Contracts')
    }

    get actions() {
        return this.get_actions('General')
    }

    get operations() {
        return this.get_actions('Operations')
    }

    get types() {
        return ['Contracts', 'General', 'Operations', 'BlackOps']
    }

    get_actions(type) {
        const actions = {
            Contracts: ['Retirement', 'Bounty Hunter', 'Tracking'],
            Operations: ['Investigation', 'Undercover Operation', 'Sting Operation', 'Raid', 'Stealth Retirement Operation', 'Assassination'],
            BlackOps: ["Operation Typhoon", "Operation Zero", "Operation X", "Operation Titan", "Operation Ares", "Operation Archangel", "Operation Juggernaut", "Operation Red Dragon", "Operation K", "Operation Deckard", "Operation Tyrell", "Operation Wallace", "Operation Shoulder of Orion", "Operation Hyron", "Operation Morpheus", "Operation Ion Storm", "Operation Annihilus", "Operation Ultron", "Operation Centurion", "Operation Vindictus", "Operation Daedalus"],
            General: ['Training', 'Field Analysis', 'Recruitment', 'Diplomacy', 'Hyperbolic Regeneration Chamber', 'Incite Violence']
        }
        return actions[type]
    }

    get intel_actions() {
        const intel_actions = [
            { action: 'Field Analysis', type: 'General' },
            { action: 'Tracking', type: 'Contracts' },
            { action: 'Investigation', type: 'Operations' },
            { action: 'Undercover Operation', type: 'Operations' },
        ]
        return intel_actions
    }

    is_intel_action(action) {
        return this.intel_actions.filter(a => a.action === action).length > 0
    }

    low_stamina(ns) {
        const [current_stamina, max_stamina] = ns.bladeburner.getStamina();
        const high_stamina = max_stamina * 0.8
        const low_stamina = max_stamina * 0.6
        this.messenger.add_message(`BladeManager Stamina Update`, `  current stamina: ${Math.floor(current_stamina)}   recovering: ${this.recovering}\n  low stamina: ${Math.floor(low_stamina)}   high stamina: ${Math.floor(high_stamina)}`)
        if (this.recovering) {
            if (high_stamina > current_stamina) {
                return true;
            } else {
                this.recovering = false;
                return false;
            }
        } else {
            if (low_stamina > current_stamina) {
                this.recovering = true;
                return true;
            } else {
                return false;
            }
        }
    }

    upgrade_skills(ns) {
        const all_skills = this.skills(ns);
        const overclock_level = ns.bladeburner.getSkillLevel("Overclock")
        let skills
        if (overclock_level >= 90) {
            skills = all_skills.filter(skill => skill.name != "Overclock")
        } else {
            skills = all_skills
        }
        skills.sort((a, b) => b.priority - a.priority);
        let i = 1
        for (i = 1; i < 1000; i++) {
            for (const skill of skills) {
                const level = ns.bladeburner.getSkillLevel(skill.name)
                if (level > i * skill.priority) continue;
                const cost = ns.bladeburner.getSkillUpgradeCost(skill.name)
                if (cost <= ns.bladeburner.getSkillPoints()) {
                    ns.bladeburner.upgradeSkill(skill.name);
                    const message = `  ${skill.name} upgraded to ${ns.bladeburner.getSkillLevel(skill.name)}.\n`
                    this.messenger.append_message('BladeBurner skill upgraded', message)
                } else {
                    const message = `  ${skill.name} cost: ${cost}\n`
                    this.messenger.add_message('BladeBurner next skill upgrade', message)
                    return;
                }
            }
        }
    }

    get_next_available_black_op(ns) {
        const type = 'BlackOps'
        const current_rank = ns.bladeburner.getRank()
        for (const action of this.get_actions(type)) {
            const has_rank_required = ns.bladeburner.getBlackOpRank(action) <= current_rank
            if (has_rank_required) {
                const not_completed = ns.bladeburner.getActionCountRemaining(type, action) >= 1
                if (not_completed) {
                    const estimated_success = ns.bladeburner.getActionEstimatedSuccessChance(type, action)
                    const estimated_success_avg = (estimated_success[0] + estimated_success[1]) / 2
                    if (estimated_success_avg >= this.min_success_chance) {
                        const time_needed = ns.bladeburner.getActionTime(type, action)
                        const black_op = {
                            type: type,
                            name: action,
                            time_needed: time_needed / 1000,
                            city: 'none'
                        }
                        ns.tprint(`Attempting Black Op: ${action} Time needed: ${black_op.time_needed}`)
                        return black_op
                    }
                }
            }
        }
    }

    get_best_intel_action(ns) {
        let best_choice = { type: 'General', name: 'Field Analysis', city: this.next_city ? this.next_city : 'none' }
        for (const item of this.intel_actions) {
            let choice = this.get_action_data(ns, item.action, item.type, [this.next_city])
            if (choice.count <= 0) continue;
            if (choice.estimated_success_avg > this.min_success_chance) {
                best_choice = choice;
            }
        }
        return best_choice
    }

    get_best_rank_action(ns) {
        const rank_types = this.types.filter(type => type != 'BlackOps');
        return this.get_best_action(ns, rank_types)
    }

    get_best_money_action(ns) {
        const money_types = ['Contracts']
        return this.get_best_action(ns, money_types)
    }

    get_action_data(ns, action, type, cities = Utils.cities) {
        const max_intel_spread = this.max_intel_spread;
        let action_data = { name: action, type: type }
        action_data.count = ns.bladeburner.getActionCountRemaining(type, action)
        action_data.current_level = ns.bladeburner.getActionCurrentLevel(type, action)
        action_data.rep_gain = ns.bladeburner.getActionRepGain(type, action, action_data.current_level)
        action_data.action_time = ns.bladeburner.getActionTime(type, action)
        action_data.rep_per_sec = action_data.rep_gain / action_data.action_time * 1000
        const original_city = this.current_city
        action_data.city = 'none'
        action_data.weighted_success = 0
        for (const city of cities) {
            ns.bladeburner.switchCity(city);
            const estimated_success = ns.bladeburner.getActionEstimatedSuccessChance(type, action)
            if (estimated_success[1] - estimated_success[0] > max_intel_spread && !this.is_intel_action(action)) {
                this.messenger.add_message(`BladeMaster insufficient intel`, `  Action: ${action}   City: ${city}` +
                    `   low: ${Math.floor(estimated_success[0] * 100)}   high: ${Math.floor(estimated_success[1] * 100)}`)
                this.next_city = city;
                action_data.needs_intel = true;
            }
            const estimated_success_avg = (estimated_success[0] + estimated_success[1]) / 2
            const rep_per_sec_weighted = action_data.rep_per_sec * estimated_success_avg
            if (rep_per_sec_weighted > action_data.weighted_success) {
                action_data.city = city;
                action_data.estimated_success_avg = estimated_success_avg
                action_data.weighted_success = rep_per_sec_weighted
            }
        }
        if (original_city != this.current_city && original_city != 'none' && action_data.needs_intel == false) {
            ns.bladeburner.switchCity(original_city);
        }
        return action_data
    }

    get_best_action(ns, types) {
        let best_choice = { type: 'General', name: 'Training', city: 'none', weighted_success: 0 }
        for (const type of types) {
            for (const action of this.get_actions(type)) {
                let choice = this.get_action_data(ns, action, type)
                if (choice.count <= 0) continue;
                if (choice.needs_intel) {
                    return this.get_best_intel_action(ns)
                }
                if (choice.estimated_success_avg > this.min_success_chance &&
                    choice.weighted_success > best_choice.weighted_success) {
                    best_choice = choice;
                    if (best_choice.name == this.current_action && best_choice.city == this.current_city) {
                        return best_choice;
                    }
                }
            }
        }
        return best_choice;
    }

    city_chaos(ns) {
        for (const city of Utils.cities) {
            const chaos = ns.bladeburner.getCityChaos(city)
            if (chaos > this.max_chaos) {
                this.messenger.add_message(`BladeManager city chaos alert`, `  City ${city} at chaos level ${Math.ceil(chaos)}`)
                return city;
            }
        }
        return false;
    }

    select_next_action(ns) {
        if (ns.getPlayer().strength < 100) {
            return { type: 'General', name: 'Training', city: 'none' }
        } else if (this.low_stamina(ns)) {
            if (ns.getPlayer().strength < 200) {
                return { type: 'General', name: 'Training', city: 'none' }
            } else {
                return { type: 'General', name: 'Field Analysis', city: 'none' }
            }
        } else {
            const black_op = this.get_next_available_black_op(ns)
            console.debug(black_op)
            if (black_op) {
                this.current_interval = black_op.time_needed + 5;
                return black_op;
            }
            const result = this.city_chaos(ns);
            if (result != false) return { type: 'General', name: 'Diplomacy', city: result }
            let next_action
            if (this.priority(ns) == 'rank') {
                next_action = this.get_best_rank_action(ns)
            } else {
                next_action = this.get_best_money_action(ns)
            }
            console.debug(next_action)
            return next_action
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const verbose = false
    const messenger = new Messenger(verbose);
    messenger.init(ns)
    let bladeburner = new BladeManager(ns, messenger);
    await bladeburner.init(ns)
    while (!bladeburner.finished) {
        bladeburner.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default BladeManager;