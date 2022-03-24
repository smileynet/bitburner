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

    refresh_stamina(ns) {
        if (this.high_stamina_level < 100) {
            this.low_stamina_level = Math.min(60, ns.bladeburner.getStamina()[1] - 20);
            this.high_stamina_level = Math.min(100, ns.bladeburner.getStamina()[1]);
        }
    }

    refresh_action(ns) {
        if (this.current_interval <= 0) {
            const next_action = this.select_next_action(ns)
            let message = `Bladeburner next action: ${next_action.name} in ${next_action.city}\n`
            if (next_action.name == this.current_action && next_action.city == this.current_city) {
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
            this.current_interval = this.refresh_interval;
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

    get contracts() {
        return ['Retirement', 'Bounty Hunter', 'Tracking']
    }

    get actions() {
        return ['Training', 'Field Analysis', 'Recruitment', 'Diplomacy', 'Hyperbolic Regeneration Chamber', 'Incite Violence']
    }

    get operations() {
        return ['Investigation', 'Undercover Operation', 'Sting Operation', 'Raid', 'Stealth Retirement Operation', 'Assassination']
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
        let purchased = true;
        for (i = 1; i < 1000; i++) {
            for (const skill of skills) {
                const level = ns.bladeburner.getSkillLevel(skill.name)
                if (level > i * skill.priority) continue;
                const cost = ns.bladeburner.getSkillUpgradeCost(skill.name)
                if (cost <= ns.bladeburner.getSkillPoints()) {
                    ns.bladeburner.upgradeSkill(skill.name);
                    const message = `${skill.name} upgraded to ${ns.bladeburner.getSkillLevel(skill.name)}.\n`
                    this.messenger.append_message('BladeBurner skill upgrade', message)
                    purchased = true;
                } else {
                    const message = `Next skill upgrade: ${skill.name} cost: ${cost}\n`
                    this.messenger.append_message('BladeBurner skill upgrade', message)
                    return;
                }
            }
        }
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
            let type = 'Contract'
            for (const contract of this.contracts) {
                const count = ns.bladeburner.getActionCountRemaining('Contract', contract)
                if (count <= 0) continue;
                let best_city = 'none'
                let best_amount = this.min_success_chance
                for (const city of Utils.cities) {
                    ns.bladeburner.switchCity(city);
                    const amount = ns.bladeburner.getActionEstimatedSuccessChance('Contract', contract)
                    const avg = (amount[0] + amount[1]) / 2
                    if (avg > best_amount) {
                        if (contract == this.current_action && city == this.current_city) {
                            return { type: type, name: contract, city: city }
                        }
                        best_city = city;
                    }
                    if (best_city != 'none') return { type: type, name: contract, city: city }
                }
            }
        }
        return { type: 'General', name: 'Training', city: 'none' }
    }
}