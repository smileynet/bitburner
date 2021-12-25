export function display_minutes_and_seconds(ns, millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    if (minutes > 0) {
            return ns.nFormat(minutes,'0,0') + " minute" + (minutes > 1 ? 's' : '') + " and " + (seconds < 10 ? '0' : '') + seconds + " seconds.";
    } else {
        return (seconds < 10 ? '0' : '') + seconds + " seconds.";
    }
    
}

export async function wait_for_sufficient_money(ns, amount) { // this may no longer be in use
	ns.print(`Waiting for amount \$${get_shortened_number(ns, amount)}`);
	ns.disableLog("getServerMoneyAvailable");	
	var current_money = ns.getServerMoneyAvailable("home");
	while (current_money < amount) {
		ns.print(`Need \$${get_shortened_number(ns, amount)}. Have \$${get_shortened_number(ns, current_money)}`);
		await ns.sleep(3000);
		current_money = ns.getServerMoneyAvailable("home");
	}
}

export function get_array_from_file(ns, filename) {
    var new_array = [];
    var file_exists = ns.fileExists(filename)
    if (file_exists) {
        var input = ns.read(filename);
        new_array = input.split(",");
    } else {
        ns.tprint(`ERROR: File ${filename} does not exist!`)
    }
    return new_array
}

export function read_file (ns, filename) {
	var file_exists = ns.fileExists(filename);
	if (file_exists) {
		var file_contents = ns.read(filename);
	} else {
		ns.alert("File does not exist!");
	}
	return file_contents;
}

export function get_num_hackable_ports(ns) {
    var num_ports = 0;
    
    var port_hacker_programs = ["BruteSSH.exe","FTPCrack.exe","relaySMTP.exe","HTTPWorm.exe","SQLInject.exe"]
    
    for (const program of port_hacker_programs) {
        if(ns.fileExists(program, "home")) {
            var num_ports = num_ports + 1;
        }
    }
    
    // ns.print(`Max hackable ports: ${num_ports}`);
    
    return num_ports; 
}

export function get_shortened_number(ns, number) {
    var shortened_number = number;
    if (number / 1000000000000000000000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000000000000000000000,'0,0.00') + "d";
    } else if (number / 1000000000000000000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000000000000000000,'0,0.00') + "n";
    } else if (number / 1000000000000000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000000000000000,'0,0.00') + "o";
    } else if (number / 1000000000000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000000000000,'0,0.00') + "s7";
    } else if (number / 1000000000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000000000,'0,0.00') + "s6";
    } else if (number / 1000000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000000,'0,0.00') + "q5";
    } else if (number / 1000000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000000,'0,0.00') + "q4";
    } else if (number / 1000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000,'0,0.00') + "t";
    } else if (number / 1000000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000000,'0,0.00') + "t";
    } else if (number / 1000000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000000,'0,0.00') + "b";
    } else if (number / 1000000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000000,'0,0.00') + "m";
    } else if (number / 1000 > 1 ) {
        shortened_number = ns.nFormat(shortened_number / 1000,'0,0.00') + "k";
    } else {
        shortened_number = ns.nFormat(shortened_number,'0,0.00');
    }
    return shortened_number;
}