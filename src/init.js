import Messenger from '/src/messenger'
import ScriptLauncher from 'scriptlauncher'

class Init {
    constructor(ns, messenger) {
        this.messenger = messenger
        this.script_launcher = new ScriptLauncher(ns, messenger)
        this.tasks = [
            { name: 'hacking', enabled: true, running: false, script: 'launcher.js', requirements: 'None.' },
            { name: 'player_manager', enabled: true, running: false, script: 'playerlauncher.js', requirements: 'None.' },
            { name: 'gang', enabled: false, running: false, script: 'ganglauncher.js', requirements: 'Need to be in a gang (-54000 karma)' },
            { name: 'corp', enabled: false, running: false, script: 'corplauncher.js', requirements: 'Need to form a corp ($150b)' },
            { name: 'bladeburner', enabled: true, running: false, script: 'bladelauncher.js', requirements: 'Need to join Bladeburners (100 each combat stat)' },
        ];
    }

    async run(ns) {
        console.debug(this.tasks)
        for (let task of this.tasks) {
            if (task.running == false && this.can_launch(ns, task.name)) {
                await this.script_launcher.try_to_launch(ns, task)
            } else {
                this.messenger.add_message(`${task.name} pending`, `Requirements: ${task.requirements}`)
            }
        }
    }

    get finished() {
        return this.tasks.filter(t => t.running == false && t.enabled == true).length <= 0
    }

    can_launch(ns, task) {
        switch (task) {
            case 'hacking':
            case 'player_manager':
                return true;
            case 'corp':
                return ns.getPlayer().hasCorporation;
            case 'bladeburner':
                return ns.getPlayer().inBladeburner;
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
    ns.tprint(`Initializing files...`)
    ns.rm('money.txt', 'home');
    await ns.write('reserved.txt', 5, "w");

    const messenger = new Messenger()
    const init = new Init(ns, messenger)

    ns.tprint(`Launching scripts...`)
    while (!init.finished) {
        await init.run(ns)
        messenger.run(ns);
        await ns.sleep(1000);
    }
    ns.tprint(`All tasks complete, exiting!`)
}