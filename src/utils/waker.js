import Messenger from '/src/messenger'
import ScriptLauncher from '/src/scriptlauncher'

class Sleeper {
    constructor(ns, messenger) {
        this.messenger = messenger

        this.tasks = [
            { name: 'faction_manager', enabled: true, running: false, script: '/src/factionmanager.js', requirements: 'Runs when player has $10m.' },
            { name: 'aug_purchasing', enabled: true, running: false, script: '/src/augmanager.js', requirements: 'More than 10 augs ready to buy.' },
        ];
    }

    async init(ns) {
        this.tasks = this.tasks.filter(task => task.enabled)
        ns.tprint(`Launching scripts...`)
    }

    async run(ns) {
        for (const task of this.tasks) {
            ns.tprint(`Handling task ${task.name}`)
            if (this.can_launch(ns, task.name)) {
                const result = ns.run(`/src/scriptlauncher.js`, 1, task.script)
                ns.tprint(`Tried to launch script ${task.script}, result: ${result}`)
            } else {
                ns.tprint(`${task.name} not run, requirements: ${task.requirements}`)
            }
        }
        this.finished = true
    }

    can_launch(ns, task) {
        switch (task) {
            case 'aug_purchasing':
                if (ns.fileExists('affordable_augs.txt', 'home')) {
                    return parseInt(ns.read('affordable_augs.txt')) >= 10
                } else {
                    return false
                }
            case 'faction_manager':
                return ns.getServerMoneyAvailable("home") >= 1000000
            default:
                ns.tprint(`Unrecognized sleeper task: ${task}`)
                return false;
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const messenger = new Messenger()
    const sleeper = new Sleeper(ns, messenger)

    await sleeper.init(ns);
    while (!sleeper.finished) {
        await sleeper.run(ns)
        messenger.run(ns);
        await ns.sleep(1000);
    }
    ns.tprint(`All eligible tasks run, launching sleeper!`)
    ns.run(`/src/scriptlauncher.js`, 1, '/utils/sleeper.js')
}