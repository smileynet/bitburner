import Messenger from '/src/messenger'
import ScriptLauncher from '/src/scriptlauncher'

class Waker {
    constructor(ns, messenger) {
        this.messenger = messenger

        this.tasks = [
            { name: 'faction_manager', enabled: true, running: false, script: '/src/factionmanager.js', requirements: 'Runs when player has $1m.' },
            { name: 'bladeburner', enabled: true, running: false, script: '/src/blademanager.js', requirements: 'In Bladebunners and saving money (money.txt exists).' },
            { name: 'purchase_manager', enabled: true, running: false, script: '/src/purchasemanager.js', requirements: 'None.' },
            { name: 'aug_purchasing', enabled: true, running: false, script: '/src/augmanager.js', requirements: 'More than 5 augs ready to buy.' },
        ];
    }

    async init(ns) {
        if (ns.getServerMaxRam('home') < 128) {
            if (ns.isRunning('/src/blademanager.js', 'home') && !ns.fileExists('simulacrum.txt', 'home')) {
                ns.kill('/src/blademanager.js', 'home')
            }
        }
        this.tasks = this.tasks.filter(task => task.enabled)
        let mem_available = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
        const script_mem = ns.getScriptRam(`/src/scriptlauncher.js`, 'home')
        const target_mem = script_mem * (this.tasks.length + 1)
        await ns.write('reserved.txt', target_mem, "w");
        while (mem_available < target_mem) {
            this.messenger.add_message(`Waker update`, `Waiting for enough memory to launch...`)
            mem_available = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
            await ns.sleep(5000)
        }
        ns.print(`Launching scripts...`)
    }

    async run(ns) {
        for (const task of this.tasks) {
            ns.print(`Handling task ${task.name}`)
            if (this.can_launch(ns, task.name)) {
                const result = ns.run(`/src/scriptlauncher.js`, 1, task.script)
                ns.tprint(`Tried to launch script ${task.script}, result: ${result}`)
            } else {
                ns.print(`${task.name} not run, requirements: ${task.requirements}`)
            }
        }
        this.finished = true
    }

    can_launch(ns, task) {
        switch (task) {
            case 'purchase_manager':
                return true
            case 'aug_purchasing':
                if (ns.fileExists('affordable_augs.txt', 'home') && parseInt(ns.read('affordable_augs.txt')) >= 5) {
                    return (!ns.isRunning('/src/augmanager.js', 'home', 'check') && !ns.isRunning('/src/augmanager.js', 'home'))
                } else {
                    return false
                }
            case 'faction_manager':
                return ns.getServerMoneyAvailable("home") >= 1000000
            case 'bladeburner':
                if (ns.fileExists('money.txt', 'home') && ns.getPlayer().inBladeburner) {
                    return true
                } else {
                    return false
                }
            default:
                ns.print(`Unrecognized sleeper task: ${task}`)
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
    ns.print(`All eligible tasks run, launching sleeper: ${result}`)

}