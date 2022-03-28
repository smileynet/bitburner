import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";
export class PlayerManager {
    constructor(messenger) {
        this.messenger = messenger;
        this.current_task = null;
        this.task_queue = [];
        this.basic_hacking_amount = 50;
        this.bladeburner_min_stats = 100;
        this.finished = false;
        this.stop_on_finish = true;
        this.goals = [
            { name: 'basic_hacking', enabled: true, priority: 100 },
            { name: 'gang_factions', enabled: true, priority: 20 },
            { name: 'gang', enabled: false, priority: 30 },
            { name: 'corp', enabled: false, priority: 50 },
            { name: 'bladeburner', enabled: true, priority: 80 },
        ];
    }

    init(ns) {
        let goals = this.goals.filter(goal => goal.enabled);
        goals.forEach(goal => {
            this.handle_goal(ns, goal);
        })
        if (this.task_queue <= 0) {
            this.finish(ns);
        }
    }

    run(ns) {
        if (this.current_task == null || this.current_task.is_finished(ns)) {
            if (this.task_queue.length > 0) {
                this.current_task = this.get_next_task(ns)
                while (this.current_task.is_finished(ns) && this.task_queue.length > 0) {
                    ns.tprint(`Skipping ${this.current_task.type} ${this.current_task.subtype} to ${this.current_task.value}, conditions already met`)
                    this.current_task = this.get_next_task(ns)
                }
            }
            if (!this.current_task.is_finished(ns)) {
                ns.tprint(`Executing next task: ${this.current_task.type} ${this.current_task.subtype} to ${this.current_task.value}`)
                this.current_task.init(ns);
                return
            } else {
                this.finish(ns);
            }
        }
        this.current_task.run(ns);
    }

    finish(ns) {
        ns.tprint(`No more tasks remaining, exiting!`)
        this.finished = true;
        if (this.stop_on_finish) ns.stopAction()
    }

    handle_goal(ns, goal) {
        let goal_is_finished
        switch (goal.name) {
            case 'basic_hacking':
                if (ns.getPlayer()['hacking'] < this.basic_hacking_amount) {
                    this.add_task(ns, new PlayerTask(this.messenger, goal.priority, 'stat', this.basic_hacking_amount, 'hacking'))
                } else {
                    ns.tprint(`Basic hacking requirement already met, skipping goal.`)
                }
                break;
            case 'bladeburner':
                goal_is_finished = () => ns.getPlayer().inBladeburner
                if (!goal_is_finished) {
                    Utils.combat_stats.forEach(stat => {
                        this.add_task(ns, new PlayerTask(this.messenger, goal.priority, 'stat', this.bladeburner_min_stats, stat))
                    })
                    this.add_task(ns, new PlayerTask(this.messenger, goal.priority - 10, 'init_group', 100, 'bladeburner', goal_is_finished))
                } else {
                    ns.tprint(`Already in bladeburners, skipping goal.`)
                }
                break;
            case 'gang_factions':
                const karma_goal = -90
                goal_is_finished = () => ns.heart.break() <= karma_goal
                if (!goal_is_finished()) {
                    this.add_task(ns, new PlayerTask(this.messenger, goal.priority, 'external_script', karma_goal, 'karma', goal_is_finished, '/utils/do_crime.js'))
                } else {
                    ns.tprint(`Sufficiently bad karma for gang faction invites, skipping goal.`)
                }
                break;
            default:
                ns.tprint('WARN: Unknown goal!')
                console.warn('Unknown goal!')
        }
    }

    add_task(ns, player_task) {
        ns.tprint(`Adding task: ${player_task.type} ${player_task.subtype} to ${player_task.value} with priority ${player_task.priority}`)
        this.task_queue.push(player_task)
    }

    get_next_task(ns) {
        this.task_queue.sort((a, b) => b.priority - a.priority);
        return this.task_queue.shift();
    }
}

class PlayerTask {
    constructor(messenger, priority, type, value, subtype = 'none', condition = (a, b) => a >= b, script = '') {
        this.messenger = messenger;
        this.priority = priority;
        this.type = type;
        this.value = value;
        this.subtype = subtype;
        this.condition = condition;
        this.script = script
        console.debug(this);
    }

    is_finished(ns) {
        let message;
        switch (this.type) {

            case 'stat':
                message = `goal: ${this.value} current: ${ns.getPlayer()[this.subtype]} result: ${this.condition(ns.getPlayer()[this.subtype], this.value)}`
                this.messenger.add_message(`PlayerTask ${this.type} ${this.subtype} update:`, message);
                return this.condition(ns.getPlayer()[this.subtype], this.value)
            case 'init_group':
                const result = this.condition();
                this.messenger.add_message(`PlayerTask ${this.type} ${this.subtype} update:`, `  Result: ${result}`);
                console.debug(`Result:`)
                console.debug(result)
                return result
            case 'external_script':
                switch (this.subtype) {
                    case 'karma':
                        message = `goal: ${this.value} current: ${ns.heart.break()} result: ${this.condition()}`
                        this.messenger.add_message(`PlayerTask ${this.type} ${this.subtype} update:`, message);
                        break;
                    default:
                        ns.tprint(`ERROR: is_finished unknown sub-type. ${JSON.stringify(this)}`)
                }
                if (this.condition()) {
                    ns.kill(this.script, 'home')
                    return true;
                } else {
                    return false;
                }
            default:
                ns.tprint(`ERROR: is_finished unknown type. ${JSON.stringify(this)}`)
        }

    }

    init(ns) {
        this.do_task(ns)
    }

    run(ns) {
        if (!ns.isBusy()) {
            this.do_task(ns);
        }
    }

    do_task(ns) {
        switch (this.type) {
            case 'stat':
                PlayerHelper.train_stat(ns, this.subtype)
                break;
            case 'init_group':
                PlayerHelper.init_group(ns, this.subtype)
                break;
            case 'external_script':
                PlayerHelper.launch_script(ns, this.script)
                break;
            default:
                ns.tprint(`ERROR: do_task unknown type. ${JSON.stringify(this)}`)
        }
    }
}

class PlayerHelper {
    static get travel_cost() {
        return 200000
    }

    static get default_focus() {
        return false
    }

    static travel_to(ns, city) {
        const player = ns.getPlayer();
        const current_money = ns.getServerMoneyAvailable("home");
        if (current_money < this.travel_cost) return player.city;
        if (city != player.city) {
            if (ns.travelToCity(city)) return player.city;
        } else {
            ns.print(`Already in ${city}.`)
            return player.city;
        }
        ns.tprint(`ERROR: Unknown travel result`)
    }

    static train_at_uni(ns, stat, focus = this.default_focus) {
        const desired_city = 'Volhaven';
        const current_city = this.travel_to(ns, desired_city);
        const course_name = {
            charisma: "Leadership",
            hacking: "Algorithms"
        }
        const school_name = {
            Volhaven: "ZB Institute of Technology",
            ['Sector-12']: "rothman university"
        }
        return ns.universityCourse(school_name[current_city], course_name[stat], focus);
    }

    static train_at_gym(ns, stat, focus = this.default_focus) {
        const desired_city = 'Sector-12';
        const current_city = this.travel_to(ns, desired_city);
        const gym_name = {
            Volhaven: "millenium fitness gym",
            ['Sector-12']: "powerhouse gym",
        }
        return ns.gymWorkout(gym_name[current_city], stat, focus)
    }

    static launch_script(ns, script) {
        const result = ns.run(script)
        ns.tprint(`Script ${script} launched with result: ${result}`)
    }

    static train_stat(ns, stat) {
        let result
        switch (stat) {
            case 'hacking':
            case 'charisma':
                result = this.train_at_uni(ns, stat)
                break;;
            default:
                result = this.train_at_gym(ns, stat)
        }
        ns.tprint(`Training ${stat} result: ${result}`)
    }

    static init_group(ns, group) {
        switch (group) {
            case 'bladeburner':
                const result = ns.bladeburner.joinBladeburnerDivision();
                ns.tprint(`Attempted to join bladeburners. Result: ${result}`)
                break;
            default:
                ns.tprint(`WARN: Unknown group: ${group}`)
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    const playerManager = new PlayerManager(messenger)
    playerManager.init(ns);
    while (!playerManager.finished) {
        playerManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default PlayerManager;