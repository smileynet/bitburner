export class Job {
    constructor(server) {
        this.server = server;
        this.multipier = server.multipier;
        this.update_task();
    }

    update_task(task = this.server.next_task) {
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

    attack(bot) {
        const max_threads = Math.floor(bot.available_ram / this.task.ram_cost(bot.name))
        let threads_to_execute;
        if (max_threads < this.task.threads_needed) {
            bot.available = false;
            threads_to_execute = max_threads;
        } else {
            threads_to_execute = this.task.threads_needed
        }
        if (threads_to_execute > 0) {
            const result = this.ns.exec(this.task.script, bot.name, threads_to_execute, this.server.name);
            if (result == 0) {
                // TODO: handle result- server already running threads for this task
            } else {
                this.threads_needed -= threads_to_execute;
            }
        } else {
            // TODO: Error, zero threads
        }
    }
}

class Task {
    constructor(job) {
        this.job = job;
        this.server = job.server;
        this.refresh();
    }

    get updated_weaken_time() {
        return this.server.weaken_time;
    }

    get updated_weaken_threads() {
        return this.server.weaken_threads;
    }

    refresh() {
        if (this.task != job.server.next_task) {
            this.job.update_task();
            // TODO: Log completed task
        } else {
            this.time_needed = this.updated_time;
            this.threads_remaining = this.updated_threads;
            this.weaken_time = this.server.weaken_time;
            this.weaken_threads = this.server.weaken_threads;
        }
    }

    ram_cost(bot_name) {
        return this.job.ns.getScriptRam(this.script, bot_name);
    }
}

class WeakenTask extends Task {
    constructor(job) {
        this.task = "weaken";
        this.script = "../botnet/weaken.js";
        super(job);
    }

    get updated_time() {
        return this.server.weaken_time;
    }

    get updated_threads() {
        return this.server.weaken_threads;
    }

    get updated_weaken_time() {
        return 0;
    }

    get updated_weaken_threads() {
        return 0;
    }
}

class GrowTask extends Task {
    constructor(job) {
        this.task = "grow";
        this.script = "../botnet/grow.js";
        super(job);
    }

    get updated_time() {
        return this.server.grow_time;
    }

    get updated_threads() {
        return this.server.grow_threads;
    }
}

class HackTask extends Task {
    constructor(job) {
        this.task = "hack";
        this.script = "../botnet/hack.js";
        super(job);
    }

    get updated_time() {
        return this.server.hack_time;
    }

    get updated_threads() {
        return this.server.hack_threads;
    }
}