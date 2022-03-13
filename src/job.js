export class Job {
    constructor(target) {
        this.target = target;
        this.ns = target.ns;
        this.multiplier = target.multiplier;
        this.update_task();
    }

    update_task(task = this.target.next_task) {
        switch (task) {
            case "weaken":
                this.task = new WeakenTask(this);
                break;
            case "grow":
                this.task = new GrowTask(this);
                break;
            case "hack":
                this.task = new HackTask(this);
                break;
            default:
                console.error("Unknown task")
                break;
        }
    }

    refresh() {
        if (this.task.type != this.target.next_task) {
            this.update_task();
            // TODO: Log completed task
        } else {
            this.task.refresh()
        }
    }

    ram_cost(bot_name) {
        return this.ns.getScriptRam(this.task.script, bot_name);
    }

    weaken_ram_cost(bot_name) {
        return this.ns.getScriptRam(this.task.weaken_script, bot_name);
    }

    async run(bot) {
        const max_threads = Math.floor(bot.available_ram / this.ram_cost(bot.name))
        let threads_to_execute = Math.min(max_threads, this.task.task_threads)
        this.ns.tprint(`Job ${this.task.type} run on ${bot.name} with ${threads_to_execute} threads against ${this.target.name}`)
        if (threads_to_execute > 0) {
            const result = await this.execute_script(bot.name, this.task.script, threads_to_execute, this.target.name);
            if (result != 0) {
                this.task.task_threads -= threads_to_execute;
            }
        }
        const max_weaken_threads = Math.floor(bot.available_ram / this.weaken_ram_cost(bot.name))
        let threads_to_execute = Math.min(threads_to_execute, this.task.weaken_threads)
        if (threads_to_execute > 0) {
            const result = await this.execute_script(bot.name, this.task.weaken_script, threads_to_execute, this.target.name);
            if (result != 0) {
                this.task.weaken_threads -= threads_to_execute;
            }
        }

    }

    async execute_script(script, bot_name, threads, target) {
        if (!this.ns.fileExists(script, bot_name)) {
            await this.ns.scp(script, bot_name)
        }
        return this.ns.exec(script, bot_name, threads, target);
    }
}

class Task {
    constructor(job) {
        this.target = job.target;
        this.refresh();
    }

    get updated_weaken_time() {
        return this.target.weaken_time;
    }

    get updated_weaken_threads() {
        return this.target.weaken_threads;
    }

    get weaken_script() {
        return "/botnet/weaken.js"
    }

    refresh() {
        this.time_needed = this.updated_time;
        this.task_threads = this.updated_threads;
        this.weaken_time = this.target.weaken_time;
        this.weaken_threads = this.target.weaken_threads;
    }
}

class WeakenTask extends Task {

    get type() {
        return "weaken"
    }

    get script() {
        return "/botnet/weaken.js"
    }

    get updated_time() {
        return this.target.weaken_time;
    }

    get updated_threads() {
        return this.target.weaken_threads;
    }

    get updated_weaken_time() {
        return 0;
    }

    get updated_weaken_threads() {
        return 0;
    }
}

class GrowTask extends Task {
    get type() {
        return "grow"
    }

    get script() {
        return "/botnet/grow.js"
    }

    get updated_time() {
        return this.target.grow_time;
    }

    get updated_threads() {
        return this.target.grow_threads;
    }
}

class HackTask extends Task {
    get type() {
        return "hack"
    }

    get script() {
        return "/botnet/hack.js"
    }

    get updated_time() {
        return this.target.hack_time;
    }

    get updated_threads() {
        return this.target.hack_threads;
    }
}