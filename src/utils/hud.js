import Utils from "/src/utils.js"

export async function main(ns) {
    ns.disableLog("ALL");
    const doc = eval("document");
    const hook0 = doc.getElementById('overview-extra-hook-0');
    const hook1 = doc.getElementById('overview-extra-hook-1');
    const corp_api = eval('ns.corporation');

    while (true) {
        try {
            const headers = []
            const values = [];
            headers.push("Hacking");
            values.push("----------");
            headers.push("Income:");
            values.push(`$${Utils.pretty_num(ns.getScriptIncome()[0])} /sec`);
            headers.push("Exp:");
            values.push(`${Utils.pretty_num(ns.getScriptExpGain())} /sec`);
            headers.push("Threads:");
            values.push(`${Utils.pretty_num(parseInt(ns.read('threads.txt')))}`);
            headers.push("To Buy");
            values.push("----------");
            if (ns.fileExists('affordable_augs.txt')) {
                headers.push("Augs:");
                values.push(`${parseInt(ns.read('affordable_augs.txt'))}`);
            }
            if (ns.fileExists('/data/server_ram_size.txt')) {
                headers.push("RAM:");
                values.push(`${parseInt(ns.read('/data/server_ram_size.txt'))}`);
            }
            if (ns.fileExists('/data/server_ram_cost.txt')) {
                headers.push("Cost:");
                values.push(`$${Utils.pretty_num(parseInt(ns.read('/data/server_ram_cost.txt')))}`);
            }

            if (ns.getPlayer().hasCorporation) {
                headers.push("Corp");
                values.push("----------");
                const corp = corp_api.getCorporation()
                headers.push("Funds:");
                values.push(`$${Utils.pretty_num(corp.funds)}`);
                headers.push("Profit:");
                values.push(`$${Utils.pretty_num(corp.revenue - corp.expenses)}`);
                headers.push("Mult:");
                values.push(`${Utils.pretty_num(corp.revenue / corp.expenses,2)}`);
                if (corp.public) {
                    headers.push("Stock:");
                    values.push(`$${Utils.pretty_num(corp.sharePrice,2)}`);
                }
            }
            if (ns.fileExists('/data/rep_goal.txt')) {
                headers.push("Rep");
                values.push("----------");
                const rep_obj = JSON.parse(ns.read('/data/rep_goal.txt', 'home'))
                headers.push("Rep Goal:");
                values.push(`${Utils.pretty_num(rep_obj.goal)}`);
                headers.push("Current Rep:");
                values.push(`${Utils.pretty_num(rep_obj.needed)}`);
                headers.push("Est Minues:");
                values.push(`${Utils.pretty_num(rep_obj.time)}`);
            }
            headers.push("--------");
            values.push("----------");
            // Now drop it into the placeholder elements
            hook0.innerText = headers.join(" \n");
            hook1.innerText = values.join("\n");
        } catch (err) { // This might come in handy later
            ns.print("ERROR: Update Skipped: " + String(err));
        }
        await ns.sleep(1000);
    }
}