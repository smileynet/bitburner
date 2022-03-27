import Utils from "/src/utils.js";
export class PlayerManager {
    constructor(messenger) {
        this.messenger = messenger;
        this.current_task = null;
        this.task_queue = [];
        this.basic_hacking = 50;
        this.bladeburner_min_stats = 100;
        this.finished = false;
        this.stop_on_finish = true;
        this.goals = [
            { name: 'basic_hacking', enabled: true, priority: 100 },
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
                ns.tprint(`No more tasks remaining, exiting!`)
                this.finished = true;
                if (this.stop_on_finish) ns.stopAction()
                return true;
            }
        }
        this.current_task.run(ns);
    }

    handle_goal(ns, goal) {
        switch (goal.name) {
            case 'basic_hacking':
                this.add_task(ns, new PlayerTask(this.messenger, goal.priority, 'stat', this.basic_hacking, 'hacking'))
                break;
            case 'bladeburner':
                Utils.combat_stats.forEach(stat => {
                    this.add_task(ns, new PlayerTask(this.messenger, goal.priority, 'stat', this.bladeburner_min_stats, stat))
                })
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
    constructor(messenger, priority, type, value, subtype = 'none', condition = (a, b) => a >= b) {
        this.messenger = messenger;
        this.priority = priority;
        this.type = type;
        this.value = value;
        this.subtype = subtype;
        this.condition = condition;
    }

    is_finished(ns) {
        switch (this.type) {
            case 'stat':
                const message = `goal: ${this.value} current: ${ns.getPlayer()[this.subtype]} result: ${this.condition(ns.getPlayer()[this.subtype], this.value)}`
                this.messenger.add_message(`PlayerTask ${this.type} ${this.subtype} update:`, message);
                return this.condition(ns.getPlayer()[this.subtype], this.value)
            default:
                ns.tprint(`ERROR: Unknown type. ${JSON.stringify(this)}`)
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
            default:
                ns.tprint(`ERROR: Unknown type. ${JSON.stringify(this)}`)
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

    static train_stat(ns, stat) {
        let result
        switch (stat) {
            case 'hacking':
            case 'charisma':
                result = this.train_at_uni(ns, stat)
                break;
            default:
                result = this.train_at_gym(ns, stat)
        }
        ns.tprint(`Training ${stat} result: ${result}`)
    }
}

export default PlayerManager;