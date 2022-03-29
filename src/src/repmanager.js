import Utils from 'src/utils'
import Messenger from "/src/messenger";

export class RepManager {
    constructor(messenger, goals, buy_augs_on_exit = false) {
        this.messenger = messenger;
        this.goals = goals;
        this.current_goal = this.goals.shift();
        this.finished = false;
        this.aggressive_boost = true
        this.buy_augs_on_exit = buy_augs_on_exit
    }

    init(ns) {
        ns.kill('/utils/boost.js', 'home')
        ns.run('/utils/boost.js');
        ns.stopAction();
    }

    run(ns) {
        this.join_factions(ns);
        this.handle_goals(ns);
    }

    finish(ns) {
        if (this.buy_augs_on_exit) {
            ns.run(`/src/scriptlauncher.js`, 1, `/src/augmanager.js`)
        }
    }

    join_factions(ns) {
        const faction_invites = ns.checkFactionInvitations();
        for (const faction of faction_invites) {
            if (Utils.cities.includes(faction)) {
                if (!this.should_join_city_faction(ns, faction)) continue;
            }
            const result = ns.joinFaction(faction);
            ns.tprint(`Faction ${faction} joined. Result ${result}`);
        }
    }

    should_join_city_faction(ns, faction) {
        var faction_augs = AugHelper.get_unowned_faction_aug_data(ns, faction);
        if (faction_augs.length > 1) {
            return true;
        } else {
            return false;
        }
    }

    handle_goals(ns) {
        const player = ns.getPlayer();
        let current_rep = ns.getFactionRep(this.current_goal.faction) + player.workRepGained
        let status = `${this.current_goal.faction} rep: ${Utils.pretty_num(current_rep)} goal: ${Utils.pretty_num(this.current_goal.rep)}.`
        if (this.current_goal.rep <= current_rep) {
            ns.stopAction();
            ns.tprint(`Goal completed: ${status}`);
            if (this.goals.length > 0) {
                this.current_goal = this.goals.shift();
                current_rep = ns.getFactionRep(this.current_goal.faction)
                status = `${this.current_goal.faction} rep: ${Utils.pretty_num(current_rep)} goal: ${Utils.pretty_num(this.current_goal.rep)}.`
                ns.tprint(`Current goal: ${status} Remaining goals: ${this.goals.length}`);
            } else {
                ns.tprint(`All goals completed, exiting!`)
                this.finished = true;
            }
        } else {
            if (!ns.isBusy()) {
                this.do_work(ns, this.current_goal);
            } else {
                const rep_needed = this.current_goal.rep - current_rep
                const actual_gain = player.workRepGainRate * 5
                const time_remaining = (rep_needed / actual_gain) / 60
                let hours_string = ''
                if (Math.floor(time_remaining / 60) > 0) hours_string = `Hours: ${Math.floor(time_remaining/60)}`
                this.messenger.add_message(`RepManager update`, `  Current status: ${status} Remaining goals: ${this.goals.length}` +
                    `\n  Time remaining- ${hours_string} Minutes: ${Math.floor(time_remaining%60)}   Gain rate: ${Utils.pretty_num(actual_gain,2)}`)
            }
        }
    }

    do_work(ns, faction_goal) {
        let work_types = ["Hacking Contracts", "Security Work", "Field Work"]
        for (const work_type of work_types) {
            if (ns.workForFaction(faction_goal.faction, work_type)) {
                const result = ns.setFocus(false);
                ns.tprint(`Doing ${work_type} for ${faction_goal.faction} until ${Utils.pretty_num(faction_goal.rep)} rep. Focus: ${result}`)
                break;
            }
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const buy_augs_on_exit = ns.args[0] == 'buy' ? true : false
    const filename = 'goals.txt'
    let goals
    if (ns.fileExists(filename, 'home')) {
        goals = JSON.parse(ns.read(filename))
    } else {
        ns.tprint(`Cannot find ${filename}. Exiting!`)
        return;
    }
    const messenger = new Messenger();
    const repManager = new RepManager(messenger, goals, buy_augs_on_exit)
    repManager.init(ns);
    while (!repManager.finished) {
        repManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
    repManager.finish(ns)
}

export default RepManager;