import Utils from "/src/utils.js";
import Messenger from "/src/messenger";
import Scanner from "/src/scanner";
import PurchaseManager from "/src/purchasemanager";
import { Job } from "/src/job.js";

export class BotMaster {
    constructor(ns, messenger, scanner) {
        this.scanner = scanner;
        this.messenger = messenger
        this.jobs = [];
    }

    async run(ns) {
        this.update_jobs(ns)
        await this.assign_jobs(ns);
    }

    update_jobs(ns) {
        this.refresh_data(ns);
        this.handle_active_threads(ns)
    }

    handle_active_threads(ns) {
        let all_procs = [];
        for (const bot of this.bots) {
            const running_procs = ns.ps(bot.name);
            for (const process of running_procs) {
                if (process.args.length == 0) { continue; }
                const target_server = process.args[0];
                const matching_jobs = this.jobs.filter(job => job.target.name == target_server);
                if (matching_jobs.length == 0) return;
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

        this.display_threads(all_procs);
    }

    display_threads(all_procs) {
        all_procs.sort((a, b) => b.threads - a.threads);
        let message = ``;
        console.debug(all_procs);
        for (const proc of all_procs) {
            const target_mult = this.targets.filter(target => target.name == proc.target)[0].growth_money_mult;
            message += `  ${proc.target} ${' '.repeat(20 - proc.target.length)} ${proc.type}`;
            message += `${' '.repeat(10 - proc.type.length)} threads: ${proc.threads}`;
            message += `${' '.repeat(10 - String(proc.threads).length)} mult: ${Utils.pretty_num(target_mult)}\n`;
        }
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
            type_jobs.sort((a, b) => b[sort_by] - a[sort_by]);
            jobs_batch.push(...type_jobs);
        })
        console.debug(jobs_batch);
        console.log(`jobs_batch length: ${jobs_batch.length}`)
        return jobs_batch;
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    let messenger = new Messenger();
    let scanner = new Scanner(ns, messenger);
    let botmaster = new BotMaster(ns, messenger, scanner);
    let purchase_manager = new PurchaseManager(ns, messenger, scanner, 16);
    while (true) {
        purchase_manager.run(ns);
        await botmaster.update_jobs(ns);
        await botmaster.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default BotMaster;