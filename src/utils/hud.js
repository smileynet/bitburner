import Utils from "/src/utils.js"

export async function main(ns) {
    ns.disableLog("ALL");
    const doc = eval("document");
    const hook0 = doc.getElementById('overview-extra-hook-0');
    const hook1 = doc.getElementById('overview-extra-hook-1');

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