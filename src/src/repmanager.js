import Utils from 'src/utils'
import Messenger from "/src/messenger";

export class RepManager {
    constructor(messenger, buy_augs_on_exit = false) {
        this.messenger = messenger;
        this.finished = false;
        this.default_focus = false;
        this.buy_augs_on_exit = buy_augs_on_exit
        this.min_balance_for_donation = 1000000000
    }

    async init(ns) {
        this.faction_favor_to_buy = ns.getFavorToDonate();
        ns.kill('/utils/boost.js', 'home')
        ns.run('/utils/boost.js');
        if (ns.isRunning('/src/blademanager.js', 'home') && !ns.fileExists('simulacrum.txt', 'home')) {
            ns.kill('/src/blademanager.js', 'home')
        }
        ns.stopAction();
        this.load_goals(ns)
        this.prioritize_goals(ns)
        this.refresh_faction_rep(ns)
        if (this.buy_augs_on_exit) ns.tprint(`WARN: This script will buy augs when completed, likely trigging a reset`)
    }

    async run(ns) {
        this.handle_goals(ns);
        await this.status_update(ns);
    }

    finish(ns) {
        ns.kill('/utils/boost.js', 'home')
        if (this.buy_augs_on_exit) {
            ns.run(`/src/scriptlauncher.js`, 1, `/src/augmanager.js`)
        } else {
            ns.run(`/src/scriptlauncher.js`, 1, `/src/blademanager.js`)
        }
        ns.rm('/data/rep_goal.txt', 'home');
    }

    async status_update(ns) {
        const player = ns.getPlayer();
        let current_rep = this.get_current_rep(ns);
        const rep_needed = this.current_goal.rep - current_rep
        const actual_gain = player.workRepGainRate * 5
        const time_remaining = (rep_needed / actual_gain) / 60
        let hours_string = ''
        if (Math.floor(time_remaining / 60) > 0) hours_string = `Hours: ${Math.floor(time_remaining/60)}`
        const time_string = `${hours_string} Minutes: ${Math.floor(time_remaining%60)}`
        this.messenger.add_message(`RepManager update`, `  Current status: ${this.status} Remaining goals: ${this.goals.length}` +
            `\n  Time remaining- ${time_string}   Gain rate: ${Utils.pretty_num(actual_gain,2)}`)
        const rep_obj = { goal: this.current_goal.rep, needed: rep_needed, time: time_remaining, }
        await ns.write('/data/rep_goal.txt', JSON.stringify(rep_obj), 'w')
    }

    load_goals(ns) {
        const filename = 'faction_goals.txt'
        if (ns.fileExists(filename, 'home')) {
            this.goals = JSON.parse(ns.read(filename))
        } else {
            ns.tprint(`Cannot find ${filename}. Exiting!`)
            ns.exit()
            return;
        }
    }

    prioritize_goals(ns) {
        ns.print(`Goals:`)
        this.goals.sort((a, b) => a.rep - b.rep)
        for (const goal of this.goals) {
            this.set_priority(ns, goal)
            ns.print(`${goal.faction}   rep: ${goal.rep}   priority: ${goal.priority}`)
        }
        this.goals.sort((a, b) => b.priority - a.priority)
    }

    set_priority(ns, goal) {
        const faction = goal.faction
        switch (faction) {
            case 'CyberSec':
                goal.priority = 16
                break;
            case 'Sector-12':
                goal.priority = 10
                break;
            case 'Aevum':
                goal.priority = 15
                break;
            case 'NiteSec':
                goal.priority = 14
                break;
            case 'The Black Hand':
                goal.priority = 13
                break;
            case 'BitRunners':
                goal.priority = 12
                break;
            case 'Daedalus':
                goal.priority = 20
                break;
            case 'Illuminati':
                goal.priority = 19
                break;
            case 'Slum Snakes':
                goal.priority = 6
                break;
            case 'Tian Di Hui':
                goal.priority = 7
                break;
            default:
                goal.priority = 1
        }
    }

    refresh_faction_rep(ns) {
        ns.print('Current goals:')
        for (const goal of this.goals) {
            const current_rep = this.get_current_rep(ns, goal.faction)
            goal.rep_needed = goal.rep - current_rep
            ns.print(`${goal.faction} rep needed: ${Utils.pretty_num(goal.rep_needed)}`)
        }
        this.goals.sort((a, b) => a.rep_needed - b.rep_needed)
    }

    handle_goals(ns) {
        if (!this.current_goal) this.current_goal = this.goals.shift();
        let current_rep = this.get_current_rep(ns);
        this.status = `${this.current_goal.faction}   rep: ${Utils.pretty_num(current_rep)}   goal: ${Utils.pretty_num(this.current_goal.rep)}   priority: ${this.current_goal.priority}`
        if (this.current_goal.rep <= current_rep) {
            ns.stopAction();
            ns.tprint(`Goal completed: ${this.status}`);
            if (this.goals.length > 0) {
                this.refresh_faction_rep(ns)
                this.current_goal = this.goals.shift();
                current_rep = ns.getFactionRep(this.current_goal.faction)
                this.status = `${this.current_goal.faction} rep: ${Utils.pretty_num(current_rep)} goal: ${Utils.pretty_num(this.current_goal.rep)}`
                ns.tprint(`New goal: ${this.status}   Remaining goals: ${this.goals.length}`);
            } else {
                ns.tprint(`All goals completed, exiting!`)
                this.finished = true;
            }
        } else {
            this.attempt_donation(ns, this.current_goal)
            if (!ns.isBusy()) {
                this.do_work(ns, this.current_goal);
            }
        }
    }

    get_current_rep(ns, faction = this.current_goal.faction) {
        const player = ns.getPlayer();
        let current_rep = ns.getFactionRep(faction) + player.workRepGained;
        return current_rep;
    }

    attempt_donation(ns, faction_goal) {
        const current_money = ns.getServerMoneyAvailable("home")
        if (current_money > this.min_balance_for_donation && ns.getFactionFavor(faction_goal.faction) >= this.faction_favor_to_buy) {
            const amount = Math.floor(current_money * 0.1)
            const result = ns.donateToFaction(faction_goal.faction, amount)
            let new_rep = ns.getFactionRep(this.current_goal.faction) + ns.getPlayer().workRepGained
            if (!result) ns.tprint(`WARN: Buying reputation failed!`)
            ns.tprint(`Buying favor for ${faction_goal.faction}: $${Utils.pretty_num(amount)} New rep: ${Utils.pretty_num(new_rep)}`)
        }
    }

    do_work(ns, faction_goal) {
        let work_types = ["Hacking Contracts", "Security Work", "Field Work"]
        for (const work_type of work_types) {
            if (ns.workForFaction(faction_goal.faction, work_type, this.default_focus)) {
                ns.tprint(`Doing ${work_type} for ${faction_goal.faction} until ${Utils.pretty_num(faction_goal.rep)} rep.`)
                break;
            }
        }

    }
}

export class RepHelper {

}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const verbose = false
    const messenger = new Messenger(verbose);
    messenger.init(ns);
    const buy_augs_on_exit = ns.args[0] == 'buy' ? true : false
    const repManager = new RepManager(messenger, buy_augs_on_exit)
    await repManager.init(ns);
    while (!repManager.finished) {
        await repManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
    repManager.finish(ns)
}

export default RepManager;