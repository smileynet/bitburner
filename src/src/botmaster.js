import Utils from "/src/utils.js";
import Messenger from "/src/messenger";
import Scanner from "/src/scanner";


export class BotMaster {
    constructor(ns, messenger, scanner) {
        this.scanner = scanner;
        this.messenger = messenger
        this.finished = false
        this.jobs = [];
    }

    async run(ns) {
        await this.update_jobs(ns)
        await this.assign_jobs(ns);
    }

    async update_jobs(ns) {
        this.refresh_data(ns);
        await this.handle_active_threads(ns)
    }

    async handle_active_threads(ns) {
        let all_procs = [];
        for (const bot of this.bots) {
            const running_procs = ns.ps(bot.name);
            for (const process of running_procs) {
                if (process.args.length == 0) { continue; }
                const target_server = process.args[0];
                const matching_jobs = this.jobs.filter(job => job.target.name == target_server);
                if (matching_jobs.length == 0) continue;
                let proc = {
                    description: `${target_server} ${matching_jobs[0].task.type}`,
                    target: target_server,
                    type: matching_jobs[0].task.type,
                    threads: process.threads
                }
                const index = all_procs.findIndex(list_proc => list_proc.description == proc.description);
                if (index >= 0) {
                    all_procs[index].threads += proc.threads;
                } else {
                    all_procs.push(proc)
                }
                if (matching_jobs) {
                    if (matching_jobs[0].task.script == process.filename) {
                        matching_jobs[0].task.task_threads -= process.threads;
                    } else if (matching_jobs[0].task.weaken_script == process.filename) {
                        matching_jobs[0].weaken_threads -= process.threads;
                    }
                }
            }
        }
        await this.display_threads(ns, all_procs);
    }

    async display_threads(ns, all_procs) {
        all_procs.sort((a, b) => b.threads - a.threads);
        let message = ``;
        let total = 0
        console.debug(all_procs);
        for (const proc of all_procs) {
            total += proc.threads
            const target_mult = this.targets.filter(target => target.name == proc.target)[0].growth_money_mult;
            message += `  ${proc.target} ${' '.repeat(20 - proc.target.length)} ${proc.type}`;
            message += `${' '.repeat(10 - proc.type.length)} threads: ${proc.threads}`;
            message += `${' '.repeat(10 - String(proc.threads).length)} mult: ${Utils.pretty_num(target_mult)}\n`;
        }
        message += `\n      Total threads: ${Utils.pretty_num(total,2)}`
        await ns.write('threads.txt', total, 'w')
        this.messenger.add_message('BotMaster threads', message);
    }

    refresh_data(ns) {
        this.scanner.refresh(ns);
        this.targets = this.scanner.target_servers(ns);
        this.bots = this.scanner.bot_servers(ns);

        for (const target of this.targets) {
            if (this.jobs.filter(job => job.target.name == target.name).length == 0) {
                this.jobs.push(new Job(target));
                let message = `  ${target.name} ${' '.repeat(20 - target.name.length)} multiplier: ${Utils.pretty_num(target.growth_money_mult)}\n`;
                this.messenger.append_message('BotMaster new jobs', message);
            }
        }

        this.jobs.forEach(job => { job.refresh(); });
    }

    async assign_jobs(ns) {
        const available_bots = this.bots.filter(bot => bot.available);
        available_bots.sort((a, b) => b.available_ram - a.available_ram);
        for (const bot of available_bots) {
            let active_jobs = this.create_jobs_batch(ns);
            while (bot.available && active_jobs.length > 0) {
                let job = active_jobs.shift();
                await job.run(bot);
            }
        }
    }

    create_jobs_batch(ns) {
        const sort_by = 'growth_money_mult'; // Alternatives: growth, money
        const job_type_order = ["hack", ["grow", "weaken"]];
        let jobs_batch = [];
        job_type_order.forEach(type => {
            let type_jobs = this.jobs.filter(job => type.includes(job.task.type) && (job.task.task_threads > 0 || job.task.weaken_threads > 0));
            type_jobs.sort((a, b) => b.target[sort_by] - a.target[sort_by]);
            jobs_batch.push(...type_jobs);
        })
        console.debug(`jobs_batch length: ${jobs_batch.length}`)
        console.debug(jobs_batch);
        return jobs_batch;
    }
}

class Job {
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
            case "grind":
                this.task = new GrindTask(this);
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
        let max_threads = Math.floor(bot.available_ram / this.ram_cost(bot.name))
        let threads_to_execute = Math.min(max_threads, this.task.task_threads)
        if (threads_to_execute > 0) {
            const result = await this.execute_script(this.task.script, bot.name, threads_to_execute, this.target.name);
            console.log(`Job ${this.task.type} run on ${bot.name} with ${threads_to_execute} threads against ${this.target.name}. Max threads ${max_threads} Task Threads: ${this.task.task_threads}}`)
            if (result != 0) {
                this.task.task_threads -= threads_to_execute;
            }
        }
        if (this.task.weaken_threads > 0) {
            max_threads = Math.floor(bot.available_ram / this.weaken_ram_cost(bot.name));
            threads_to_execute = Math.min(max_threads, this.task.weaken_threads);
            if (threads_to_execute > 0) {
                const result = await this.execute_script(this.task.weaken_script, bot.name, threads_to_execute, this.target.name);
                console.log(`Job secondary weaken run on ${bot.name} with ${threads_to_execute} threads against ${this.target.name}. Max threads ${max_threads} Task Threads: ${this.task.weaken_threads}}.`)
                if (result != 0) {
                    this.task.weaken_threads -= threads_to_execute;
                }
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

class GrindTask extends Task {

    get type() {
        return "weaken"
    }

    get script() {
        return "/botnet/grind.js"
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

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const verbose = false
    const messenger = new Messenger(verbose);
    messenger.init(ns)
    const scanner = new Scanner(ns, messenger);
    const botmaster = new BotMaster(ns, messenger, scanner);
    while (!botmaster.finished) {
        await botmaster.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default BotMaster;