import Messenger from '/src/messenger'
import ScriptLauncher from '/src/scriptlauncher'

class Init {
    constructor(ns, messenger) {
        this.messenger = messenger
        this.tasks = [
            { name: 'player_manager', enabled: true, running: false, script: '/src/playermanager.js', requirements: 'None.' },
            { name: 'hud', enabled: true, running: false, script: '/utils/hud.js', requirements: 'None.' },
            { name: 'faction_manager', enabled: true, running: false, script: '/src/factionmanager.js', requirements: 'Runs after BladeManager is running.' },
            { name: 'gang', enabled: false, running: false, script: '/src/gangmanager.js', requirements: 'Need to be in a gang (-54000 karma)' },
            { name: 'corp', enabled: true, running: false, script: '/src/corpmanager.js', requirements: 'Need to form a corp ($150b)' },
            { name: 'bladeburner', enabled: true, running: false, script: '/src/blademanager.js', requirements: 'Need to join Bladeburners  (100 each combat stat), runs after PlayerMnanager completes.' },
            { name: 'hacking', enabled: true, running: false, script: '/src/botmaster.js', requirements: 'None.' },
        ];
    }

    async init(ns) {
        ns.tprint(`Initializing files...`)
        ns.rm('money.txt', 'home');
        ns.rm('goals.txt', 'home');
        ns.rm('cheap.txt', 'home');
        await ns.write('reserved.txt', 6, "w");
        this.tasks = this.tasks.filter(task => task.enabled)
        ns.tprint(`Launching scripts...`)
    }

    async run(ns) {
        for (let task of this.tasks) {
            if (task.pending && !this.is_pending(ns, task)) {
                task.running = true
            }
            if (task.running == false && this.can_launch(ns, task.name) && !this.is_pending(ns, task)) {
                task.pending = true
                ns.run(`/src/scriptlauncher.js`, 1, task.script)
                this.messenger.add_message(`${task.name} launch`, `Tried to launch script ${task.script}.`)
            } else if (task.enabled) {
                this.messenger.add_message(`${task.name} pending`, `Requirements: ${task.requirements}`)
            }
        }
    }

    get finished() {
        return this.tasks.filter(task => task.running == false && task.enabled == true).length <= 0
    }

    is_pending(ns, task) {
        if (ns.isRunning(`/src/scriptlauncher.js`, 'home', task.script)) {
            return true
        } else {
            return false
        }
    }

    has_finished_running(ns, task_name) {
        const manager_task = this.tasks.filter(task => task.name == task_name)[0]
        return (!manager_task.enabled || (!ns.isRunning(manager_task.script, 'home') && manager_task.running))
    }

    can_launch(ns, task) {
        switch (task) {
            case 'hacking':
            case 'player_manager':
            case 'hud':
                return true;
            case 'faction_manager':
                return ns.isRunning('/src/blademanager.js', 'home')
            case 'corp':
                return ns.getPlayer().hasCorporation;
            case 'bladeburner':
                return (ns.getPlayer().inBladeburner && this.has_finished_running(ns, 'player_manager'));
            case 'gang':
                return ns.gang.inGang();
            default:
                ns.tprint(`Unrecognized init task: ${task}`)
                return false;
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const messenger = new Messenger()
    const init = new Init(ns, messenger)

    await init.init(ns);
    while (!init.finished) {
        await init.run(ns)
        messenger.run(ns);
        await ns.sleep(1000);
    }
    ns.tprint(`All tasks complete, exiting!`)
}