import Messenger from '/src/messenger'
import ScriptLauncher from '/src/scriptlauncher'

class Init {
    constructor(ns, messenger) {
        this.messenger = messenger
        this.tasks = [
            { name: 'player_manager', enabled: true, running: false, script: '/src/playermanager.js', requirements: 'None.' },
            { name: 'faction_manager', enabled: true, running: false, script: '/src/factionmanager.js', requirements: 'After player manager.' },
            { name: 'gang', enabled: false, running: false, script: '/src/gangmanager.js', requirements: 'Need to be in a gang (-54000 karma)' },
            { name: 'corp', enabled: true, running: false, script: '/src/corpmanager.js', requirements: 'Need to form a corp ($150b)' },
            { name: 'bladeburner', enabled: true, running: false, script: '/src/blademanager.js', requirements: 'Need to join Bladeburners  (100 each combat stat), runs after player manager completes.' },
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
            if (!task.running) {
                task.running = ns.isRunning(task.script)
            }
            if (task.running == false && this.can_launch(ns, task.name) && !this.is_pending(ns, task)) {
                ns.run(`/src/scriptlauncher.js`, 1, task.script)
                this.messenger.add_message(`${task.name} launch`, `Tried to launch script ${task.script}.`)
            } else if (task.enabled) {
                this.messenger.add_message(`${task.name} pending`, `Requirements: ${task.requirements}`)
            }
        }
    }

    get finished() {
        return this.tasks.filter(t => t.running == false && t.enabled == true).length <= 0
    }

    is_pending(ns, task) {
        if (ns.isRunning(`/src/scriptlauncher.js`, 'home', task.script)) {
            return true
        } else {
            return false
        }
    }

    can_launch(ns, task) {
        switch (task) {
            case 'hacking':
            case 'player_manager':
                return true;
            case 'faction_manager':
                return !ns.isRunning('/src/playermanager.js')
            case 'corp':
                return ns.getPlayer().hasCorporation;
            case 'bladeburner':
                return (ns.getPlayer().inBladeburner && !ns.isRunning('/src/playermanager.js'));
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