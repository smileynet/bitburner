async function update_office_assignment(ns, divisionName, cityName) {
    const roles = [
        { name: 'Operations', weight: 2, heavy_weight: 4 }, //4
        { name: 'Engineer', weight: 2, heavy_weight: 3 }, //3
        { name: 'Business', weight: 1, heavy_weight: 2 }, //2 
        { name: 'Management', weight: 2, heavy_weight: 2 }, //2
        { name: 'Research & Development', weight: 1, heavy_weight: 3 }, //3
        { name: 'Training', weight: 1, heavy_weight: 1 },
    ]
    const corp_api = eval('ns.corporation');
    const office = corp_api.getOffice(divisionName, cityName);
    ns.tprint(`Beginning job reassignment for ${divisionName} in ${cityName}.`)
    for (const role of roles) {
        await corp_api.setAutoJobAssignment(divisionName, cityName, role.name, 0);
    }
    if (office.size <= 9) {
        const val = office.size / 9;
        for (const role of roles) {
            await corp_api.setAutoJobAssignment(divisionName, cityName, role.name, Math.round(val * role.weight));
        }
    } else {
        const val = office.size / 15;
        for (const role of roles) {
            await corp_api.setAutoJobAssignment(divisionName, cityName, role.name, Math.round(val * role.heavy_weight));
        }
    }

    ns.tprint(`Job reassignment for ${divisionName} in ${cityName} completed.`)
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const divisionName = ns.args[0]
    const cityName = ns.args[1]
    const corp_api = eval('ns.corporation');
    if (divisionName == 'all') {
        const corp = corp_api.getCorporation()
        for (const division of corp.divisions) {
            const cities = corp_api.getDivision(division.name).cities
            for (const city of cities) {
                ns.tprint(`Assigning employees for ${division.name} ${city}`)
                await update_office_assignment(ns, division.name, city);
            }
        }
    } else if (!divisionName || !cityName) {
        ns.tprint(`ERROR: Missing division or city name arguments. divisionName: ${divisionName} cityName: ${cityName}`)
        return;
    } else {
        await update_office_assignment(ns, divisionName, cityName);
    }
}