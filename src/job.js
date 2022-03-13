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

    async run(bot) {
        const max_threads = Math.floor(bot.available_ram / this.ram_cost(bot.name))
        let threads_to_execute;
        if (max_threads < this.task.threads_remaining) {
            threads_to_execute = max_threads;
        } else {
            threads_to_execute = this.task.threads_remaining
        }
        this.ns.tprint(`max_threads ${max_threads} task threads: ${this.task.threads_remaining} threads_to_execute: ${threads_to_execute}`)
        this.ns.tprint(`Job ${this.task.type} run on ${bot.name} with ${threads_to_execute} threads against ${this.target.name}`)
        if (threads_to_execute > 0) {
            if (!this.ns.fileExists(this.task.script, bot.name)) {
                await this.ns.scp(this.task.script, bot.name)
            }
            const result = this.ns.exec(this.task.script, bot.name, threads_to_execute, this.target.name);
            this.ns.tprint(`Result: ${result}`)
            if (result == 0) {
                // TODO: handle result- server already running threads for this task
            } else {
                this.task.threads_remaining -= threads_to_execute;
            }
        } else {
            // TODO: Error, zero threads
        }
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

    refresh() {
        this.time_needed = this.updated_time;
        this.threads_remaining = this.updated_threads;
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