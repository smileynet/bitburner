import Messenger from '/src/messenger'
import ScriptLauncher from '/src/scriptlauncher'

class Waker {
    constructor(ns, messenger) {
        this.messenger = messenger

        this.tasks = [
            { name: 'faction_manager', enabled: true, running: false, script: '/src/factionmanager.js', requirements: 'Runs when player has $1m.' },
            { name: 'purchase_manager', enabled: true, running: false, script: '/src/purchasemanager.js', requirements: 'None.' },
            { name: 'aug_purchasing', enabled: true, running: false, script: '/src/augmanager.js', requirements: 'More than 10 augs ready to buy.' },
        ];
    }

    async init(ns) {
        this.tasks = this.tasks.filter(task => task.enabled)
        let mem_available = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
        const script_mem = ns.getScriptRam(`/src/scriptlauncher.js`, 'home')
        const target_mem = script_mem * (this.tasks.length + 1)
        await ns.write('reserved.txt', target_mem, "w");
        while (mem_available < target_mem) {
            ns.tprint(`Waiting for enough memory to launch...`)
            mem_available = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
            await ns.sleep(5000)
        }
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
            case 'purchase_manager':
                return true
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
    const sleeper = new Waker(ns, messenger)
    await sleeper.init(ns);
    while (!sleeper.finished) {
        await sleeper.run(ns)
        messenger.run(ns);
        await ns.sleep(1000);
    }
    const result = ns.run(`/src/scriptlauncher.js`, 1, '/utils/sleeper.js')
    ns.tprint(`All eligible tasks run, launching sleeper: ${result}`)

}