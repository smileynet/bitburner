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
        // TODO: Reconcile tasks running on bots currently
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