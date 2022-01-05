import {read_file_as_number,get_shortened_number} from "utils.js";

/** @param {NS} ns **/
export async function main(ns) {
    var previous_best_script_income = read_file_as_number (ns, "/data/best_script_income.txt");
    var previous_best_script_exp_gain = read_file_as_number (ns, "/data/best_script_exp_gain.txt");
    var current_time = new Date();    
    var output = `${current_time} - best script income: \$${get_shortened_number(ns, previous_best_script_income)} / sec, best script xp gain: ${get_shortened_number(ns, previous_best_script_exp_gain)} / sec\n`
    ns.tprint(output);
    await ns.write("/records/script_gains.txt", output, "a");
    var files = ns.ls("home", "/data/");
    for (const file of files) {
        ns.tprint(`Removing ${file}`)
        ns.rm(file);
    }

    //await ns.write("all_gang_equip_status.txt", false, "w");

    var scripts_to_launch = ["update_cores.ns","scanner.js","server_manager.js","taskmaster.js","gang_runner.js","upgrade_gang_equip.js","mastermind.js","hud/primary.js"];
    
    for(const script of scripts_to_launch) {
        ns.exec(script,"home");
        await ns.sleep(1000);
    }
}