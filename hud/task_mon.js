function kill_proc(ns, proc) {
	ns.kill(proc['filename'],"home",proc['args']);
	ns.toast(`${proc['filename']} killed!`)
}

function create_button(proc) {
	const doc = eval("document");
	var span = document.createElement("span");
	var button = doc.createElement('button');
	button.innerHTML = proc['filename'];
	button.name = `${proc['filename']}_kill`;
	button.addEventListener('click', function(){kill_proc(ns, proc)});
	span.appendChild(button);
	return span
}

function create_span(proc) {
	const doc = eval("document");
	var span = doc.createElement("span");
	span.innerHTML = proc['filename'];
	span.addEventListener('click', function(){kill_proc(ns, proc)});
	span.className = "jss10 MuiTypography-root MuiTypography-body1 css-19io8zh"
	return span
}

function append_table_row(proc) {
	const doc = eval("document");
	var table = doc.getElementsByClassName('MuiTable-root css-1gurbcj')[0];
	var target_row_num = table.rows.length - 2;
	var row = table.insertRow(target_row_num);
	var cell = row.insertCell(0);
	var span = create_span(proc);
	cell.appendChild(span);
}

export async function main(ns) {
	ns.disableLog("ALL");
	const doc = eval("document");
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');
	var procs = ns.ps("home");
	// TODO: Create identifier to delete on death
	// TODO: Use buttons to invoke function
	// TODO: Tell Phil
	try {
		for(const proc of procs) {
			append_table_row(proc)
		}
	} catch (err) {
		ns.print("ERROR: Update Skipped: " + String(err));
	}
	while (true) {
		await ns.sleep(1000);
	}
}