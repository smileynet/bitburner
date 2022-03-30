import Utils from 'src/utils'
import Messenger from "/src/messenger";

export class RepManager {
    constructor(messenger, buy_augs_on_exit = true) {
        this.messenger = messenger;
        this.finished = false;
        this.faction_favor_to_buy = 150;
        this.default_focus = false;
        this.buy_augs_on_exit = buy_augs_on_exit
    }

    async init(ns) {
        ns.kill('/utils/boost.js', 'home')
        ns.run('/utils/boost.js');
        ns.stopAction();
        this.load_goals(ns)
        if (this.buy_augs_on_exit) ns.tprint(`WARN: This script will buy augs when completed, likely trigging a reset`)
    }

    run(ns) {
        this.handle_goals(ns);
    }

    finish(ns) {
        ns.kill('/utils/boost.js', 'home')
        if (this.buy_augs_on_exit) {
            ns.run(`/src/scriptlauncher.js`, 1, `/src/augmanager.js`)
        }
    }

    load_goals(ns) {
        const filename = 'goals.txt'
        if (ns.fileExists(filename, 'home')) {
            this.goals = JSON.parse(ns.read(filename))
        } else {
            ns.tprint(`Cannot find ${filename}. Exiting!`)
            return;
        }

        this.current_goal = this.goals.shift();
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
            this.attempt_donation(ns, this.current_goal)
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

    attempt_donation(ns, faction_goal) {
        if (ns.getFactionFavor(faction_goal.faction) >= this.faction_favor_to_buy) {
            const amount = Math.floor(ns.getServerMoneyAvailable("home") * 0.1)
            const result = ns.donateToFaction(faction_goal.faction, amount)
            let new_rep = ns.getFactionRep(this.current_goal.faction) + ns.getPlayer().workRepGained
            ns.tprint(`Can buy favor for faction ${faction_goal.faction}. Attempted donation: ${Utils.pretty_num(amount)} New rep: ${Utils.pretty_num(new_rep)} result: ${result}`)
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
    const buy_augs_on_exit = ns.args[0] == 'grind' ? false : true
    const messenger = new Messenger();
    const repManager = new RepManager(messenger, buy_augs_on_exit)
    await repManager.init(ns);
    while (!repManager.finished) {
        repManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
    repManager.finish(ns)
}

export default RepManager;