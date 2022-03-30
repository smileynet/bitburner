import Messenger from '/src/messenger'

export class ScriptLauncher {
    constructor(ns, messenger, script_name, script_args) {
        this.messenger = messenger;
        this.script_name = script_name
        this.script_args = script_args
        this.mem_needed = ns.getScriptRam(script_name, 'home')
        this.finished = false;
        this.current_task = 'none'
    }

    init(ns) {
        if (ns.isRunning(this.script_name, 'home', this.script_args)) {
            ns.kill(this.script_name, 'home', this.script_args)
        }
    }

    async run(ns) {
        if (await this.check_memory(ns)) {
            await this.launch_script(ns)
        } else {
            this.messenger.add_message(`${this.script_name} pending`, `Free mem needed: ${this.mem_needed}`)
        }
    }

    async launch_script(ns) {
        const result = ns.run(this.script_name, 1, this.script_args);
        if (result > 0) {
            ns.tprint(`${this.script_name} with args ${this.script_args} launched successfully!`)
            const reserved = ns.getServerMaxRam('home') > 1024 ? 66 : 6
            await ns.write('reserved.txt', reserved, "w");
            this.finished = true;
        } else {
            ns.tprint(`WARN: Could not launch ${this.script_name} with args ${this.script_args}!`)
        }
    }

    async check_memory(ns) {
        const mem_available = ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
        if (this.mem_needed > mem_available) {
            this.messenger.add_message(`${this.script_name} pending`, `Insufficient memory: ${this.mem_needed} needed, ${mem_available} available`);
            const mem_to_reserve = Math.max(this.mem_needed, parseInt(ns.read('reserved.txt')))
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
    const script_name = ns.args[0]
    let script_args = ns.args.slice(1)
    script_args = script_args.join(' ');
    const script_launcher = new ScriptLauncher(ns, messenger, script_name, script_args)
    script_launcher.init(ns)
    while (!script_launcher.finished) {
        await script_launcher.run(ns)
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default ScriptLauncher;