export class CorpRunner {
    constructor(ns, messenger) {
        this.messenger = messenger;
        this.corp_api = eval('ns.corporation')
        this.corp = this.corp_api.getCorporation()
        this.target_warehouse_utilization = 0.7
        this.target_warehouse_level = 10
    }

    run(ns) {
        this.upgrade_warehouses(ns)
        this.corp_upgrades(ns)
        this.preferred_material_handler(ns)
    }

    get cities() {
        return ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    }

    get current_money() {
        return this.corp_api.getCorporation().funds
    }

    preferred_material(industry) {
        const industries = {
            software: `Hardware`,
            agriculture: `Real Estate`,
        }
        return industries[industry.toLowerCase()];
    }

    preferred_material_handler(ns) {
        for (const division of this.corp.divisions) {
            const preferred_material = this.preferred_material(division.type);
            for (const city of division.cities) {
                const warehouse = this.corp_api.getWarehouse(division.name, city);
                const warehouse_utilization = warehouse.sizeUsed / warehouse.size;
                if (warehouse_utilization < this.target_warehouse_utilization) {
                    if (warehouse.smartSupplyEnabled) {
                        ns.tprint(`Buying ${preferred_material} in ${city}`)
                    }
                    this.corp_api.setSmartSupply(division.name, city, false);
                    this.corp_api.buyMaterial(division.name, city, preferred_material, 400);
                } else {
                    if (!warehouse.smartSupplyEnabled) {
                        ns.tprint(`Not buying ${preferred_material} in ${city}`)
                    }
                    this.corp_api.buyMaterial(division.name, city, preferred_material, 0);
                    this.corp_api.setSmartSupply(division.name, city, true);
                    this.corp_api.setSmartSupplyUseLeftovers(division.name, city, preferred_material, false);
                }
            }
        }
    }

    upgrade_warehouses(ns) {
        for (const division of this.corp.divisions) {
            for (const city of division.cities) {
                const warehouse = this.corp_api.getWarehouse(division.name, city);
                const warehouse_utilization = warehouse.sizeUsed / warehouse.size;
                if (warehouse.level <= this.target_warehouse_level &&
                    warehouse_utilization >= this.target_warehouse_utilization) {
                    const cost = this.corp_api.getUpgradeWarehouseCost(division.name, city);
                    if (cost < this.current_money) {
                        this.corp_api.upgradeWarehouse(division.name, city);
                        ns.tprint(`Warehouse upgraded to ${warehouse.level} for ${division.name} in ${city}.`)
                    }
                }
            }
        }
    }

    corp_upgrades(ns) {
        const upgrades = [
            { name: "Smart Factories", weight: 1, max: 10 },
            { name: "Smart Storage", weight: 1, max: 10 },
            { name: "DreamSense", weight: 1, max: 10 },
            { name: "Wilson Analytics", weight: 1, max: 10 },
            { name: "Nuoptimal Nootropic Injector Implants", weight: 1, max: 10 },
            { name: "Speech Processor Implants", weight: 1, max: 10 },
            { name: "Neural Accelerators", weight: 1, max: 10 },
            { name: "FocusWires", weight: 1, max: 10 },
            { name: "ABC SalesBots", weight: 1, max: 10 },
            { name: "Project Insight", weight: 1, max: 10 },
        ]

        for (const upgrade of upgrades) {
            const current_level = this.corp_api.getUpgradeLevel(upgrade.name)
            if (current_level < upgrade.max) {
                const cost = this.corp_api.getUpgradeLevelCost(upgrade.name)
                if (cost < this.current_money) {
                    this.corp_api.levelUpgrade(upgrade.name)
                    ns.tprint(`${upgrade.name} upgraded to level ${current_level+1}`)
                }
            }
        }
    }
}