async function update_office_assignment(ns, divisionName, cityName) {
    const roles = [
        { name: 'Operations', weight: 4 },
        { name: 'Engineer', weight: 3 },
        { name: 'Business', weight: 2 },
        { name: 'Management', weight: 2 },
        { name: 'Research & Development', weight: 3 },
        { name: 'Training', weight: 1 },
    ]
    const corp_api = eval('ns.corporation');
    const office = corp_api.getOffice(divisionName, cityName);
    ns.tprint(`Beginning job reassignment for ${divisionName} in ${cityName}.`)
    for (const role of roles) {
        await corp_api.setAutoJobAssignment(divisionName, cityName, role.name, 0);
    }
    const val = office.size / 15;
    for (const role of roles) {
        await corp_api.setAutoJobAssignment(divisionName, cityName, role.name, Math.round(val * role.weight));
    }
    ns.tprint(`Job reassignment for ${divisionName} in ${cityName} completed.`)
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const divisionName = ns.args[0]
    const cityName = ns.args[1]
    if (!divisionName || !cityName) {
        ns.tprint(`ERROR: Missing division or city name arguments. divisionName: ${divisionName} cityName: ${cityName}`)
        return;
    }
    await update_office_assignment(ns, divisionName, cityName);
}