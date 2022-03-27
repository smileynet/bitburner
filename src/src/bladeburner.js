import Utils from "/src/utils.js";

export class BladeBurner {
    constructor(ns, messenger, interval = 60) {
        this.messenger = messenger;
        this.low_stamina_level = Math.min(60, ns.bladeburner.getStamina()[1] - 20);
        this.high_stamina_level = Math.min(100, ns.bladeburner.getStamina()[1]);
        this.recovering = false;
        this.min_success_chance = 0.75;
        this.refresh_interval = interval;
        this.current_interval = interval;
        this.current_action = 'none'
        this.current_city = 'none'
    }

    run(ns) {
        this.refresh_stamina(ns);
        this.upgrade_skills(ns);
        this.refresh_action(ns);
    }

    priority(ns) {
        if (!ns.fileExists('money.txt')) {
            return 'rank'
        } else {
            return 'money'
        }
    }

    refresh_stamina(ns) {
        if (this.high_stamina_level < 100) {
            this.low_stamina_level = Math.min(60, ns.bladeburner.getStamina()[1] - 20);
            this.high_stamina_level = Math.min(100, ns.bladeburner.getStamina()[1]);
        }
    }

    refresh_action(ns) {
        if (this.current_interval <= 0) {
            const next_action = this.select_next_action(ns)
            console.debug(next_action);
            let message = `Bladeburner next action: ${next_action.name} in ${next_action.city}\n`
            if (next_action.name == this.current_action && next_action.city == this.current_city && next_action.type != 'BlackOps') {
                message += `Staying on current plan.\n`
            } else {
                if (next_action.city != 'none') {
                    const result = ns.bladeburner.switchCity(next_action.city);
                    this.current_city = next_action.city
                    message += `Switching to ${next_action.city}, result: ${result}\n`
                } else {
                    this.current_city = 'none'
                }
                const result = ns.bladeburner.startAction(next_action.type, next_action.name);
                this.current_action = next_action.name
                message += `Executing ${next_action.name}, result: ${result}\n`
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
            { name: "Digital Observer", priority: 0.5 },
            { name: "Tracer", priority: 0.7 },
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

    low_stamina(ns) {
        const current_stamina = ns.bladeburner.getStamina()[0];
        if (this.recovering) {
            if (this.high_stamina_level > current_stamina) {
                return true;
            } else {
                this.recovering = false;
                return false;
            }
        } else {
            if (this.low_stamina_level > current_stamina) {
                this.recovering = true;
                return true;
            } else {
                return false;
            }
        }
    }

    upgrade_skills(ns) {
        const skills = this.skills(ns);
        skills.sort((a, b) => b.priority - a.priority);
        let i = 1
        for (i = 1; i < 1000; i++) {
            for (const skill of skills) {
                const level = ns.bladeburner.getSkillLevel(skill.name)
                if (level > i * skill.priority) continue;
                const cost = ns.bladeburner.getSkillUpgradeCost(skill.name)
                if (cost <= ns.bladeburner.getSkillPoints()) {
                    ns.bladeburner.upgradeSkill(skill.name);
                    const message = `${skill.name} upgraded to ${ns.bladeburner.getSkillLevel(skill.name)}.\n`
                    this.messenger.append_message('BladeBurner skill upgraded', message)
                } else {
                    const message = `${skill.name} cost: ${cost}\n`
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

    get_best_action(ns, types) {
        let best_choice = { type: 'General', name: 'Training', city: 'none', weighted_success: 0 }
        for (const type of types) {
            if (type == 'BlackOps') continue;
            for (const action of this.get_actions(type)) {
                const count = ns.bladeburner.getActionCountRemaining(type, action)
                if (count <= 0) continue;
                for (const city of Utils.cities) {
                    ns.bladeburner.switchCity(city);
                    const current_level = ns.bladeburner.getActionCurrentLevel(type, action)
                    const rep_gain = ns.bladeburner.getActionRepGain(type, action, current_level)
                    const action_time = ns.bladeburner.getActionTime(type, action)
                    const rep_per_sec = rep_gain / action_time * 1000
                    const estimated_success = ns.bladeburner.getActionEstimatedSuccessChance(type, action)
                    const estimated_success_avg = (estimated_success[0] + estimated_success[1]) / 2
                    const rep_per_sec_weighted = rep_per_sec * estimated_success_avg
                    if (estimated_success_avg > this.min_success_chance &&
                        rep_per_sec_weighted > best_choice.weighted_success) {
                        best_choice.type = type;
                        best_choice.name = action;
                        best_choice.city = city;
                        best_choice.weighted_success = rep_per_sec_weighted;
                        if (best_choice.name == this.current_action && best_choice.city == this.current_city) {
                            return best_choice;
                        }
                    }
                }
            }
        }
        return best_choice;
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
            let types
            if (this.priority(ns) == 'rank') {
                types = this.types;
            } else {
                types = ['Contracts']
            }
            const next_action = this.get_best_action(ns, types)
            console.debug(next_action)
            return next_action
        }
    }
}