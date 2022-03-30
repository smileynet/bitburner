async function update_office_assignment(ns, divisionName, cityName) {
    const corp_api = eval('ns.corporation');
    const office = corp_api.getOffice(divisionName, cityName);
    ns.tprint(`Beginning job reassignment for ${divisionName} in ${cityName}.`)
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Operations', 0);
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Engineer', 0);
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Business', 0);
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Management', 0);
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Research & Development', 0);
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Training', 0);
    const val = office.size / 15;
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Operations', Math.round(val * 4));
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Engineer', Math.round(val * 3));
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Business', Math.round(val * 2));
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Management', Math.round(val * 2));
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Research & Development', Math.round(val * 3));
    await corp_api.setAutoJobAssignment(divisionName, cityName, 'Training', Math.round(val * 1));
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