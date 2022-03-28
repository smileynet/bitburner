async function commit_crime(ns, crime = "homicide") {
    while (true) {
        if (ns.isBusy()) {
            await ns.sleep(1000);
        } else {
            ns.print(`Current karma: ${ns.heart.break()}`)
            ns.commitCrime(crime);
            await ns.sleep(1000);
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    await commit_crime(ns);
}