import { Job } from "/src/job.js";
import { Scanner } from "/src/scanner.js";

export class BotMaster {
    constructor(ns) {
        this.scanner = new Scanner (ns);
        this.jobs = [];
        this.refresh(ns);
    }

    refresh(ns) {
        this.scanner.refresh(ns)
        this.targets = this.scanner.target_servers(ns);
        this.bots = this.scanner.bot_servers(ns);

        for (const target of this.targets) {
            if (this.jobs.filter(job => job.target.name == target.name).length == 0) {
                this.jobs.push(new Job(target));
                console.debug(`Job created for ${target.name}`);
            }
        }

        this.jobs.forEach(job => { job.refresh(); });

        let all_procs = {};
        
        for (const bot of this.bots) {
            const running_procs = ns.ps(bot.name);
            for (const process of running_procs) {
                if (process.args.length == 0) { continue; }
                const target_server = process.args[0];
                const matching_jobs = this.jobs.filter(job => job.target.name == target_server);
                const proc_desc = `${target_server} ${matching_jobs[0].task.type}`
                if(all_procs[proc_desc] == null) {
                    all_procs[proc_desc] = process.threads;
                } else {
                    all_procs[proc_desc] += process.threads;
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

        console.debug(all_procs);
        ns.tprint(`Current running threads:`)
        for (const [key, value] of Object.entries(all_procs)) {
            ns.tprint(`  ${key} threads: ${value}`)
        }
    }

    async run(ns) {
        const available_bots = this.bots.filter(bot => bot.available);
        available_bots.sort((a, b) => b.available_ram - a.available_ram);
        for (const bot of available_bots) {
            let active_jobs = this.create_jobs_batch(ns)
            while (bot.available && active_jobs.length > 0) {
                let job = active_jobs.shift();
                await job.run(bot);
            }
        }
    }

    create_jobs_batch(ns) {
        const sort_by = 'growth_money_mult'; // Alternatives: growth, money
        const job_type_order = ["hack", "grow", "weaken"];
        let jobs_batch = [];
        job_type_order.forEach(type => {
            let type_jobs = this.jobs.filter(job => job.task.type == type && (job.task.task_threads > 0 || job.task.weaken_threads > 0));
            type_jobs.sort((a, b) => b[sort_by] - a[sort_by]);
            console.debug(type_jobs);
            jobs_batch.push(...type_jobs);
        })      
        console.debug(jobs_batch);
        console.log(`jobs_batch length: ${jobs_batch.length}`)
        return jobs_batch;
    }
}