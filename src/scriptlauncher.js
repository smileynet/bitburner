import Messenger from '/src/messenger'

export class ScriptLauncher {
    constructor(ns, messenger, script_names = []) {
        this.messenger = messenger;
        this.tasks = script_names.length > 0 ? this.create_tasks(ns, script_names) : [];
        this.current_task = 'none'
    }

    create_tasks(ns, script_names) {
        let tasks = [];
        script_names.forEach(script_name => {
            let task = {
                script: script_name,
                running: false,
                mem_needed: ns.getScriptRam(script_name, 'home')
            }
            tasks.push(task)
        })
        return tasks;
    }

    get finished() {
        return this.tasks.filter(t => t.running == false).length <= 0
    }

    async run(ns) {
        for (const task of this.tasks) {
            if (task.running == false) {
                await this.try_to_launch(ns, task)
            } else {
                this.messenger.add_message(`${task.script} pending`, `Free mem needed: ${task.mem_needed}`)
            }
        }
    }

    async try_to_launch(ns, task) {
        if (await this.check_memory(ns, task)) {
            await this.launch_script(ns, task)
        }
    }

    async launch_script(ns, task) {
        const result = ns.run(task.script)
        if (result > 0) {
            ns.tprint(`${task.script} launched successfully!`)
            task.running = true;
            await ns.write('reserved.txt', 5, "w");
        } else {
            ns.tprint(`WARN: Could not launch ${task.script}!`)
        }
    }

    async check_memory(ns, task) {
        if (!task.mem_needed) {
            task.mem_needed = ns.getScriptRam(task.script, 'home');
        }
        const mem_available = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
        if (task.mem_needed > mem_available) {
            this.messenger.add_message(`${task.script} pending`, `Insufficient memory: ${task.mem_needed} needed, ${mem_available} available`);
            const mem_to_reserve = Math.max(task.mem_needed, parseInt(ns.read('reserved.txt')))
            await ns.write('reserved.txt', mem_to_reserve, "w");
            return false
        } else {
            return true
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    const messenger = new Messenger()
    const script_launcher = new ScriptLauncher(ns, messenger, ns.args)

    while (!script_launcher.finished) {
        await script_launcher.run(ns)
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default ScriptLauncher;