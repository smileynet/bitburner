import {get_num_hackable_ports, get_array_from_file, read_file} from "utils.js";
import {Scanner} from "scanner.js";

class Taskmaster {
    constructor(ns, scanner = false) { 
        this.ns = ns;
        this.current_jobs = [];
        this.percent_to_steal = 0.10; // What percentage of money to steal per hack iteration
        this.security_buffer = 2; // How much above minimum security to tolerate.
        this.reserved_mem = 32; // How much memory to leave free for user scripts.
        this.update_interval = 180 // How many seconds between printing updates to the terminal. Set to -1 to pass.

        if(scanner == false) {
            this.next_hackable_server_skill  = false;
            this.next_port_count = false;
            this.rooted_servers = [];
            this.hacking_targets = [];
            import_data();
        } else {
            this.scanner = scanner;
            this.refresh_data_from_scanner();
        }        
    }

    async manage_tasks() {
        var current_interval = 0;
        while(true) {
            this.check_for_progress();
            this.update_job_targets();
            this.update_jobs();
            this.assign_jobs();
            this.display_job_updates();
            if (current_interval >= this.update_interval) {
                this.display_skill_updates();
                current_interval = 0;
            } else {
                current_interval = current_interval + 1;
            }            
            await this.ns.sleep(1000);
        }
    }

    sort_jobs_by_growth() {
        this.current_jobs.sort((firstItem, secondItem) => secondItem.max_cash - firstItem.max_cash);
        this.current_jobs.sort((firstItem, secondItem) => secondItem.growth - firstItem.growth);
    }
    
    import_data() {
        var ns = this.ns;
        this.next_hackable_server_skill  = get_array_from_file(ns, "/data/next_hackable_server_skill.txt");
        this.next_port_count = get_array_from_file(ns, "/data/next_port_count.txt");
        this.rooted_servers = get_array_from_file(ns, "/data/rooted_servers.txt");
        this.hacking_targets = get_array_from_file(ns, "/data/hacking_targets.txt");
    }
    
    refresh_data_from_scanner() {
        this.next_hackable_server_skill  = this.scanner.next_hackable_server_skill;
        this.next_port_count = this.scanner.next_port_count;
        this.rooted_servers = this.scanner.rooted_servers;
        this.hacking_targets = this.scanner.hacking_targets;
    }
    
    check_for_progress() {
        var ns = this.ns;
        var current_hacking_skill = ns.getHackingLevel();
        var current_hackable_ports = get_num_hackable_ports(ns);
        if ((this.next_hackable_server_skill != false && this.next_hackable_server_skill < current_hacking_skill) || 
        (this.next_port_count != false && this.next_port_count < current_hackable_ports)) {
            ns.toast(`Additional servers are rootable!`);
            if (this.scanner) {
                ns.tprint(`Additional servers are rootable! Refreshing server lists!`);
                this.scanner.scan_and_root_servers();
                this.refresh_data_from_scanner();
            } else {
                ns.tprint(`WARN: No scanner defined, please manually refresh the server lists!`);
                this.next_hackable_server_skill = false;
                this.next_port_count = false;
            }
        }
    }

    analyze_target(target_server) {
        var ns = this.ns;
    
        var amount_needed = 0;
        var time_needed = 0;
        var task = "";

        var server_security_level = ns.getServerSecurityLevel(target_server)
        var server_min_security_level = ns.getServerMinSecurityLevel(target_server)
        var target_security_level = server_min_security_level + this.security_buffer;
        var server_max_money = ns.getServerMaxMoney(target_server)
        var server_money_available = ns.getServerMoneyAvailable(target_server)
        var server_growth_level = ns.getServerGrowth(target_server);
    
        if (server_security_level > target_security_level) {
            task = "weaken";
            amount_needed = server_security_level - target_security_level;
            time_needed = ns.getWeakenTime(target_server)	
        } else if ( server_money_available < server_max_money ) {
            task = "grow";
            amount_needed = server_max_money - server_money_available;
            time_needed = ns.getGrowTime(target_server);
        } else {
            task = "hack";
            amount_needed = server_money_available * this.percent_to_steal;
            time_needed = ns.getHackTime(target_server);
        }

        var threads_needed = this.get_threads_needed_for_task(task, target_server, amount_needed)
    
        var job = {'target_server': target_server, 'task': task, 'threads_needed': threads_needed, 'time_needed': time_needed, 'max_money': server_max_money, 'growth': server_growth_level};
        if (job['threads_needed'] == 0) {
            ns.tprint(`ERROR: Analyzer assigned a job with zero threads!\n${job}`);
        }
        return job;
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

    update_job_targets() {
        var ns = this.ns;
        for (const target_server of this.hacking_targets) {
            var exists = false;
            for (const job of this.current_jobs) {
                if (job['target_server'] == target_server['name']) {
                    exists = true;
                }
            }
            if (exists == false) {
                var new_job = this.analyze_target(target_server['name']);
                ns.print(`New job added: ${new_job['task']} on ${new_job['target_server']}`)
                this.current_jobs.push(new_job);
            }
        }
    }

    update_jobs() {
        var ns = this.ns;
        var current_time = new Date();
        var current_jobs_copy = [...this.current_jobs]
        for (var i = 0; i < current_jobs_copy.length; i++) {
            var job = current_jobs_copy[i];
            if (job['busy_until'] != null && job['busy_until'] < current_time) {
                //ns.toast(`Job completed! ${job['task']} on ${job['target_server']}`);
                ns.print(`Job completed! ${job['task']} on ${job['target_server']}. Next task: ${job['task']} with ${job['threads_needed']} threads.`);
                delete this.current_jobs[i];
                var new_job = this.analyze_target(job['target_server']);
                this.current_jobs[i] = new_job;
            }
        }
       this.sort_jobs_by_growth();
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
        if (threads_available > threads_needed){
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
        
        if (result == 0 || result == false ) {
            return false;
        } else {
            return threads_to_execute;
        }
    }

    async assign_jobs() {
        var ns = this.ns;
        for(const job of this.current_jobs) {
            for(const attacking_server of this.rooted_servers) {
                if (job[`threads_needed`] > 0) {
                    var threads_executed = this.execute_task(job[`task`], job[`target_server`], attacking_server, job[`threads_needed`]);
                    if (threads_executed == false) {
                        // ns.print(`WARN: Could not execute task ${job[`task`]} against ${job[`target_server`]} on ${attacking_server}`);
                    } else {
                        job[`threads_needed`] = job[`threads_needed`] - threads_executed;
                        ns.print(`Executed ${threads_executed} threads against ${job[`target_server`]} on ${attacking_server}. ${job['threads_needed']} threads remaining.`);
                        if (job[`threads_needed`] <= 0) {
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
        var pending_tasks = 0;
        
        var jobs_copy = [...this.current_jobs];
        jobs_copy.sort((firstItem, secondItem) => firstItem.busy_until - secondItem.busy_until);
        ns.print("-------------------------");
        ns.print(`Active jobs:`);
        for (var job of jobs_copy) {
            if (job['busy_until'] == undefined) {
                pending_tasks = pending_tasks + 1;
            } else {
                ns.print(`${job['target_server']} current task: ${job['task']} - next task ready at ${job['busy_until'].toLocaleTimeString()}`);
            }
        }
        ns.print(`Pending tasks: ${pending_tasks}`);
        ns.print("-------------------------");
        
    }

    display_skill_updates() {
        var ns = this.ns;
        var current_hacking_skill = ns.getHackingLevel();
        var current_hackable_ports = get_num_hackable_ports(ns);
        ns.tprint("---------------------------------------------------------------------");
        ns.tprint(`Next hackable server at skill: ${this.next_hackable_server_skill}. current skill ${current_hacking_skill}.`)
        ns.tprint(`Number of ports required for next server: ${this.next_port_count}. current hackable ports: ${current_hackable_ports}.`) 
        ns.tprint("---------------------------------------------------------------------");
    }
}
    
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    
    let scanner = new Scanner(ns);
    await scanner.scan_and_root_servers();
    
    let taskmaster = new Taskmaster(ns, scanner);
    await taskmaster.manage_tasks();    
}