/** @param {NS} ns **/
export async function main(ns) {
    let corp_api = eval('ns.corporation')
    let divisions = corp_api.getCorporation().divisions
    for (const division of divisions) {
        for (const cityName of division.cities) {
            ns.tprint(corp_api.hasWarehouse(division.name, cityName))
        }
    }
}