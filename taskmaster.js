import { read_file_as_number, get_num_hackable_ports, get_array_from_file, get_shortened_number, display_minutes_and_seconds } from "utils.js";

class Taskmaster {
    constructor(ns, max_xp_mode = false) {
        this.ns = ns;
        this.current_jobs = [];
        this.percent_to_steal = 0.40; // What percentage of money to steal per hack iteration
        this.security_buffer = 2; // How much above minimum security to tolerate.
        this.reserved_mem = 70; // How much memory to leave free for user scripts.
        this.update_interval = 120; // How many seconds between printing updates to the terminal. Set to -1 to pass.
        this.verbose_job_status = false; // Display a detailed status for each job during display updates.
        this.max_xp_mode = max_xp_mode; // Set all workers to weaken joesguns.
        this.max_xp_enable_hack = true; // Hack & Grow joesguns in addition to max weakening
        this.targets_to_skip = ['n00dles']; // Servers not to target for hacking.
        this.next_hackable_server_skill = false;
        this.next_port_count = false;
        this.best_script_income = -1;
        this.best_script_exp_gain = -1;
        this.rooted_servers = [];
        this.hacking_targets = [];
        this.refresh_data();
    }

    async manage_tasks() {
        var current_interval = 0;
        while (true) {
            await this.refresh_data();
            this.create_job_list();
            this.update_jobs_list();
            this.assign_jobs();
            await this.write_current_jobs_to_log()
            if (current_interval >= this.update_interval) {
                this.display_job_updates();
                await this.display_skill_updates();
                current_interval = 0;
            } else {
                current_interval = current_interval + 1;
            }
            await this.ns.sleep(1000);
        }
    }

    sort_jobs_by_growth() {
        this.current_jobs.sort((firstItem, secondItem) => secondItem.max_money - firstItem.max_money);
        this.current_jobs.sort((firstItem, secondItem) => secondItem.growth - firstItem.growth);
    }

    sort_jobs_by_max_money() {
        this.current_jobs.sort((firstItem, secondItem) => secondItem.growth - firstItem.growth);
        this.current_jobs.sort((firstItem, secondItem) => secondItem.max_money - firstItem.max_money);
    }

    sort_jobs_by_multiplied() {
        this.current_jobs.sort((firstItem, secondItem) => secondItem.max_money - firstItem.max_money);
        this.current_jobs.sort((firstItem, secondItem) => secondItem.multiplied - firstItem.multiplied);
    }

   async refresh_data() {
        var ns = this.ns;
        this.next_hackable_server_skill = get_array_from_file(ns, "/data/next_hackable_server_skill.txt");
        this.next_port_count = get_array_from_file(ns, "/data/next_port_count.txt");
        this.rooted_servers = get_array_from_file(ns, "/data/rooted_servers.txt");
        this.hacking_targets = get_array_from_file(ns, "/data/hacking_targets.txt");
        if (this.best_script_income == -1) {
            this.best_script_income = read_file_as_number (ns, "/data/best_script_income.txt")
        } else {
            await ns.write("/data/best_script_income.txt", this.best_script_income, "w");
        }
        if (this.best_script_exp_gain == -1) {
            this.best_script_exp_gain = read_file_as_number (ns, "/data/best_script_exp_gain.txt")
        } else {
            await ns.write("/data/best_script_exp_gain.txt", this.best_script_exp_gain, "w");
        }
    }

    analyze_target(target_server) {
        var ns = this.ns;

        var amount_needed = 0;
        var task = "";

        var server_security_level = ns.getServerSecurityLevel(target_server)
        var server_min_security_level = ns.getServerMinSecurityLevel(target_server)
        var target_security_level = server_min_security_level + this.security_buffer;
        var server_max_money = ns.getServerMaxMoney(target_server)
        var server_money_available = ns.getServerMoneyAvailable(target_server)
        var server_growth_level = ns.getServerGrowth(target_server);

        if (server_security_level > target_security_level) {
            task = "weaken";
            amount_needed = server_security_level - server_min_security_level;
        } else if (server_money_available < server_max_money) {
            task = "grow";
            amount_needed = server_max_money - server_money_available;
        } else {
            task = "hack";
            amount_needed = server_money_available * this.percent_to_steal;
        }

        var time_needed = this.get_time_needed(task, target_server);
        var threads_needed = this.get_threads_needed_for_task(task, target_server, amount_needed)



        var job = { 'target_server': target_server, 'task': task, 'threads_needed': threads_needed, 'threads_executed': 0, 'time_needed': time_needed, 'max_money': server_max_money, 'growth': server_growth_level, 'multiplied': (server_max_money * server_growth_level) };

        if (job['threads_needed'] == 0) {
            ns.tprint(`ERROR: Analyzer assigned a job with zero threads!\n${job}`);
        }

        var jobs = [job];

        if (task == "grow" || task == "hack") {
            if (task == "grow") {
                var security_increase = ns.growthAnalyzeSecurity(threads_needed);
            } else if (task == "hack") {
                var security_increase = ns.hackAnalyzeSecurity(threads_needed);
            }
            var security_threads_needed = this.get_threads_needed_for_task("weaken", target_server, security_increase);
            var security_time_needed = this.get_time_needed("weaken", target_server);
            var secondary_job = { 'target_server': target_server, 'task': "weaken", 'threads_needed': security_threads_needed, 'threads_executed': 0, 'time_needed': security_time_needed, 'max_money': server_max_money, 'growth': server_growth_level, 'multiplied': (server_max_money * server_growth_level) };
            if (secondary_job['threads_needed'] == 0) {
                ns.tprint(`ERROR: Analyzer assigned a job with zero threads!\n${secondary_job}`);
            }
            jobs.push(secondary_job);
        }
        return jobs;
    }

    get_job_update(job) {
        var ns = this.ns;

        var amount_needed = 0;

        var server_security_level = ns.getServerSecurityLevel(target_server)
        var server_min_security_level = ns.getServerMinSecurityLevel(target_server)
        var server_max_money = ns.getServerMaxMoney(target_server)
        var server_money_available = ns.getServerMoneyAvailable(target_server)

        
        if (task == "weaken") {
            amount_needed = server_security_level - server_min_security_level;
        } else if (task == "grow") {
            amount_needed = server_max_money - server_money_available;
        } else if (task == "hack") {
            amount_needed = server_money_available * this.percent_to_steal;
        } else {
            this.ns.tprint(`ERROR: Task not recognized: ${task}`);
            var time_needed = false;
        }

        var time_needed = this.get_time_needed(task, target_server);
        var threads_needed = this.get_threads_needed_for_task(task, target_server, amount_needed)

        job['time_needed'] = time_needed;
        job['threads_needed'] = threads_needed;

        return job;
    }

    get_time_needed(task, target_server) {
        var ns = this.ns;
        if (task == "weaken") {
            var time_needed = ns.getWeakenTime(target_server)
        } else if (task == "grow") {
            var time_needed = ns.getGrowTime(target_server);
        } else if (task == "hack") {
            var time_needed = ns.getHackTime(target_server);
        } else {
            this.ns.tprint(`ERROR: Task not recognized: ${task}`);
            var time_needed = false;
        }
        return time_needed;
    }

    get_threads_needed_for_task(task, target_server, amount_needed) {
        var ns = this.ns;
        var threads = 1;
        var cores = 1;
        /** This is currently not useful
        if (attacking_server == "home"){
            var cores = read_file(ns, "/data/home_cores.txt").toInt();
        } else {
            var cores = 1; 
        } */
        if (task == "weaken") {
            var security_decrease = ns.weakenAnalyze(threads, cores);
            var threads_needed = Math.ceil(amount_needed / security_decrease);
        } else if (task == "grow") {
            var threads_needed = Math.ceil(ns.growthAnalyze(target_server, amount_needed, cores));
        } else if (task == "hack") {
            var threads_needed = Math.ceil(ns.hackAnalyzeThreads(target_server, amount_needed));
        } else {
            this.ns.tprint(`ERROR: Task not recognized: ${task}`);
            var threads_needed = false;
        }
        return threads_needed;
    }

    get_all_active_tasks() {
        var ns = this.ns;
        var rooted_servers = this.rooted_servers;
        var jobs = [];
        var servers = [];
        for (const attacking_server of rooted_servers) {
            var running_procs = ns.ps(attacking_server);
            for (const process of running_procs) {
                var script_name = process['filename']
                if (script_name == "/botnet/weaken_security.ns") {
                    var task = "weaken";
                } else if (script_name == "/botnet/grow_money.ns") {
                    var task = "grow";
                } else if (script_name == "/botnet/hack_server.ns") {
                    var task = "hack";
                } else {
                    ns.print(`Process is not a bot script, skipping.`);
                    continue;
                }
                var target_server = process['args'][0];
                var threads = process['threads'];
                if (servers.includes(target_server)) {
                    for (var job of jobs) {
                        if (job['target_server'] == target_server && job['task'] == task) {
                            job['threads'] += threads;
                            break;
                        }
                    }
                } else {
                    servers.push(target_server);
                    jobs.push({ 'target_server': target_server, 'task': task, 'threads': threads });
                }
            }
        }
        return jobs;
    }

    create_job_list() {
        var ns = this.ns;
        //ns.tprint(this.hacking_targets);
        this.current_jobs = [];
        if (this.max_xp_mode) {
            if (this.max_xp_enable_hack) {
                var jobs = this.analyze_target("joesguns");
                this.current_jobs = jobs;
            }
            var job = { 'target_server': "joesguns", 'task': "weaken", 'threads_needed': 1000000000, 'threads_executed': 0, 'time_needed': 5, 'max_money': 7000000, 'growth': 20, 'multiplied': 140000000 };
            this.current_jobs.push(job);
        } else {
            for (const target_server of this.hacking_targets) {
                if (this.targets_to_skip.includes(target_server)) {
                    continue;
                } 
                var jobs = this.analyze_target(target_server);
                var new_job = jobs[0]
                ns.print(`New job added: ${new_job['task']} on ${new_job['target_server']}. Threads: ${new_job['threads_needed']} Time needed: ${new_job['time_needed']}`)
                this.current_jobs.push(new_job);
                if (jobs[1]) {
                    var secondary_job = jobs[1]
                    ns.print(`Secondary job added: ${secondary_job['task']} on ${secondary_job['target_server']}. Threads: ${secondary_job['threads_needed']} Time needed: ${secondary_job['time_needed']}`)
                    this.current_jobs.push(secondary_job);
                }
            }
        }   
    }

    

    update_jobs_list() {
        var ns = this.ns;
        var tasks = this.get_all_active_tasks();
        for (const task of tasks) {
            for (var job of this.current_jobs) {
                if (job['target_server'] == task['target_server'] && job['task'] == task['task']) {
                    ns.print(`Starting threads for ${job['target_server']} ${job['task']}: ${job['threads_needed']}`)
                    job['threads_needed'] -= task['threads'];
                    ns.print(`Remaining threads for ${job['target_server']} ${job['task']}: ${job['threads_needed']}`)
                    break;
                }
            }
        }
    }

    get_available_ram(server_name) {
        var ns = this.ns;
        var max_ram = ns.getServerMaxRam(server_name);
        var used_ram = ns.getServerUsedRam(server_name);
        var available_ram = max_ram - used_ram;
        return available_ram;
    }

    get_task_script(task) {
        if (task == "weaken") {
            var task_script = "/botnet/weaken_security.ns";
        } else if (task == "grow") {
            var task_script = "/botnet/grow_money.ns";
        } else if (task == "hack") {
            var task_script = "/botnet/hack_server.ns";
        } else {
            this.ns.tprint(`ERROR: Task not recognized: ${task}`);
            var task_script = false;
        }
        return task_script;
    }

    get_max_task_threads(server_name, task) {
        var ns = this.ns;
        var task_script = this.get_task_script(task);
        var available_ram = this.get_available_ram(server_name);
        if (server_name == "home") {
            available_ram = available_ram - this.reserved_mem;
        }
        var script_ram = ns.getScriptRam(task_script, server_name);
        var max_task_threads = Math.floor(available_ram / script_ram);
        return max_task_threads;
    }

    execute_task(task, target_server, attacking_server, threads_needed) {
        var ns = this.ns;
        var threads_available = this.get_max_task_threads(attacking_server, task)
        var task_script = this.get_task_script(task);
        if (threads_available > threads_needed) {
            var threads_to_execute = threads_needed;
        } else {
            var threads_to_execute = threads_available;
        }

        if (threads_to_execute > 0) {
            var result = ns.exec(task_script, attacking_server, threads_to_execute, target_server);
            if (result == 0) {
                //ns.print(`Server ${attacking_server} is already running threads for this task!`)
            }
        } else {
            //ns.tprint(`ERROR: Tried to run script with 0 threads!`);
        }

        if (result == 0 || result == false) {
            return false;
        } else {
            return threads_to_execute;
        }
    }

    async assign_jobs() {
        var ns = this.ns;
        if (ns.fileExists("/data/pending_server_upgrade.txt")) {
            var server_to_skip = ns.read("/data/pending_server_upgrade.txt");
        }

        //this.sort_jobs_by_growth();
        //this.sort_jobs_by_max_money();
        this.sort_jobs_by_multiplied();
        for (const job of this.current_jobs) {
            if (this.targets_to_skip.includes(job['target_server'])) {
                continue;
            }
            for (const attacking_server of this.rooted_servers) {
                if (attacking_server == server_to_skip) {
                    continue;
                }
                if (job[`threads_needed`] > 0) {
                    var threads_executed = this.execute_task(job[`task`], job[`target_server`], attacking_server, job[`threads_needed`]);
                    if (threads_executed == false) {
                        // ns.print(`WARN: Could not execute task ${job[`task`]} against ${job[`target_server`]} on ${attacking_server}`);
                    } else {
                        job[`threads_needed`] = job[`threads_needed`] - threads_executed;
                        job['threads_executed'] = job['threads_executed'] + threads_executed;
                        ns.print(`${job[`target_server`]}: Executed ${threads_executed} ${job[`task`]} thr on ${attacking_server}, ${job['threads_needed']} remaining. Runtime: ${display_minutes_and_seconds(ns, job['time_needed'])}.`);
                        if (job[`threads_needed`] <= 0) {
                            job[`threads_needed`] = 0;
                            var current_time = new Date();
                            job['busy_until'] = new Date(current_time.getTime() + job['time_needed']);
                        }
                    }
                } else {
                    break;
                }
            }
        }
    }

    display_job_updates() {
        var ns = this.ns;
        var tasks = this.get_all_active_tasks();
        var threads = 0;
        ns.tprint("---------------------------------------------------------------------");
        ns.tprint(`Assigned tasks: ${tasks.length}`);
        for (const task of tasks) {
            if (tasks.length < 5) {
                ns.tprint(`Target: ${task['target_server']} Task: ${task['task']} Threads: ${task['threads']}`)
            }
            threads += task['threads']            
        }
        ns.tprint(`   Total Assigned Threads: ${threads}`)
        ns.tprint(`Pending tasks: ${this.current_jobs.length - tasks.length}`);
        ns.tprint("---------------------------------------------------------------------");


        if (this.verbose_job_status) {
            var jobs_copy = [...this.current_jobs];
            jobs_copy.sort((firstItem, secondItem) => firstItem.busy_until - secondItem.busy_until);

            jobs_copy.sort((firstItem, secondItem) => secondItem.growth - firstItem.growth);
            ns.tprint(`All current jobs:`);
            for (var job of jobs_copy) {
                if (true) { //job['threads_executed'] > 0 && job['threads_needed'] > 0
                    var server_security_level = ns.nFormat(ns.getServerSecurityLevel(job['target_server']), '0,0.00');
                    var server_min_security_level = ns.getServerMinSecurityLevel(job['target_server']);
                    var server_max_money = ns.getServerMaxMoney(job['target_server']);
                    var server_money_available = ns.getServerMoneyAvailable(job['target_server']);
                    ns.tprint(`${job['target_server']} task ${job['task']}:`);
                    ns.tprint(`   Threads needed: ${job['threads_needed']} executed: ${job['threads_executed']}, Time needed: ${display_minutes_and_seconds(ns, job['time_needed'])}`);
                    ns.tprint(`   Current sec level: ${server_security_level} min level: ${server_min_security_level}`);
                    ns.tprint(`   Current money level: \$${get_shortened_number(ns, server_money_available)}, max level: \$${get_shortened_number(ns, server_max_money)} Growth: ${job['growth']}`);
                }
            }
            ns.tprint('');
            ns.tprint("---------------------------------------------------------------------");
        }
    }

    async display_skill_updates() {
        var ns = this.ns;
        var current_hacking_skill = ns.getHackingLevel();
        var current_hackable_ports = get_num_hackable_ports(ns);
        var script_income = ns.getScriptIncome()[0];
        var script_exp_gain = ns.getScriptExpGain();
        if (this.best_script_income < script_income) {
            this.best_script_income = script_income;
            await ns.write("/data/best_script_income.txt", this.best_script_income, "w");
        }
        if (this.best_script_exp_gain < script_exp_gain) {
            this.best_script_exp_gain = script_exp_gain;
            await ns.write("/data/best_script_exp_gain.txt", this.best_script_exp_gain, "w");
        }

        //ns.tprint("---------------------------------------------------------------------");
        ns.tprint(`Current exp gain: ${get_shortened_number(ns, script_exp_gain)} / sec. Current income: \$${get_shortened_number(ns, script_income)} / sec.`);
        ns.tprint(`Best exp gain:    ${get_shortened_number(ns, this.best_script_exp_gain)} / sec. Best income:    \$${get_shortened_number(ns, this.best_script_income)} / sec.`);
        ns.tprint(`Next hackable server at skill: ${this.next_hackable_server_skill}. current skill ${current_hacking_skill}.`);
        ns.tprint(`Num ports required for next: ${this.next_port_count}. Current hackable ports: ${current_hackable_ports}.`);
        ns.tprint("---------------------------------------------------------------------");
    }

    async write_current_jobs_to_log() {
        var ns = this.ns;
        var output = `All current jobs:\n`;
        for (var job of this.current_jobs) {
            var server_security_level = ns.nFormat(ns.getServerSecurityLevel(job['target_server']), '0,0.00');
            var server_min_security_level = ns.getServerMinSecurityLevel(job['target_server']);
            var server_max_money = ns.getServerMaxMoney(job['target_server']);
            var server_money_available = ns.getServerMoneyAvailable(job['target_server']);
            output += `${job['target_server']} task ${job['task']}:\n`;
            output += `   Threads needed: ${job['threads_needed']} executed: ${job['threads_executed']}, Time needed: ${display_minutes_and_seconds(ns, job['time_needed'])}\n`;
            output += `   Current sec level: ${server_security_level} min level: ${server_min_security_level}\n`;
            output += `   Current money level: \$${get_shortened_number(ns, server_money_available)}, max level: \$${get_shortened_number(ns, server_max_money)} Growth: ${job['growth']}\n`;
        }
        await ns.write("/log/current_jobs.txt", output, "w");
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

    var max_xp_mode = false;
    if(ns.args[0]) {
        max_xp_mode = ns.args[0]
    }
    let taskmaster = new Taskmaster(ns, max_xp_mode);
    await taskmaster.manage_tasks();
}