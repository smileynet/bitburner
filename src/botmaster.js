import { Bot } from "/src/bot.js";
import { Job } from "/src/job.js";
import { Target } from "/src/target.js";

export class BotMaster {
    constructor(ns) {
        this.ns = ns;
        this.bots = [new Bot(ns, "home"), new Bot(ns, "hackserv-01")];
        this.targets = [new Target(ns, "joesguns")];
        this.jobs = [];
        this.refresh();
    }

    refresh() {
        for (const target of this.targets) {
            if (this.jobs.filter(job => job.server.name == target.name).length == 0) {
                this.jobs.push(new Job(target));
                console.debug(`Job created for ${target.name}`);
            }
        }

        this.jobs.forEach(job => { job.refresh(); });
        for (const bot of this.bots) {
            const running_procs = this.ns.ps(bot.name);
            for (const process of running_procs) {
                if (process.args.length == 0) { continue; }
                const target_server = process.args[0];
                const matching_jobs = this.jobs.filter(job => job.target.name == target_server);
                if (matching_jobs) {
                    if (matching_jobs[0].task.script == process.filename) {
                        matching_jobs[0].task.threads_remaining -= process.threads;
                    } else if (matching_jobs[0].task.weaken_script == process.filename) {
                        matching_jobs[0].weaken_threads -= process.threads;
                    }
                }
            }
        }
    }

    async run() {
        const available_bots = this.bots.filter(bot => bot.available);
        available_bots.sort((a, b) => b.available_ram - a.available_ram);
        for (const bot of available_bots) {
            let active_jobs = this.jobs.filter(job => job.task.threads_remaining > 0);
            active_jobs.sort((a, b) => b.multiplier - a.multiplier);
            // this.ns.tprint(`active_jobs: ${active_jobs.length}`);
            while (bot.available && active_jobs.length > 0) {
                let job = active_jobs.shift();
                // this.ns.tprint(`Running job ${job.task.type} on ${bot.name} against ${job.target.name}`)
                await job.run(bot);
            }
        }
    }
}