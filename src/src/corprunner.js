export class CorpRunner {
    constructor(ns, messenger) {
        this.messenger = messenger;
        this.corp_api = eval('ns.corporation')
        this.target_warehouse_utilization = 0.7
        this.target_warehouse_level = 10
        this.advert_max = 10
        this.max_office_size = 50
    }

    async run(ns) {
        this.handle_research(ns)
        this.grow_division(ns)
        await this.upgrade_offices(ns)
        this.upgrade_warehouses(ns)
        this.upgrade_advert(ns)
        this.corp_upgrades(ns)
        this.update_products(ns)
        this.preferred_material_handler(ns)
    }

    get corp() {
        return this.corp_api.getCorporation()
    }

    get cities() {
        return ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    }

    get current_money() {
        return this.corp_api.getCorporation().funds
    }

    materials_produced(industry) {
        const industries = {
            software: ['AI Cores'],
            agriculture: ['Food', 'Plants'],
            food: [],
        }
        return industries[industry.toLowerCase()];
    }

    handle_research(ns) {
        for (const division of this.corp.divisions) {
            if (!this.corp_api.hasResearched(division.name, 'Hi-Tech R&D Laboratory') &&
                this.corp_api.getResearchCost(division.name, 'Hi-Tech R&D Laboratory') < division.research) {
                this.corp_api.research(division.name, 'Hi-Tech R&D Laboratory')
                ns.tprint(`${division.name} has researched Hi-Tech R&D Laboratory`)
            } else if (division.research > 70000) {
                this.corp_api.research(division.name, 'Market-TA.I')
                this.corp_api.research(division.name, 'Market-TA.II')
                ns.tprint(`${division.name} has researched Market-TA.I & II`)
            }
        }
    }

    update_products(ns) {
        for (const division of this.corp.divisions) {
            for (const product of division.products) {
                if (this.corp_api.hasResearched(division.name, 'Market-TA.II')) {
                    this.corp_api.setProductMarketTA2(division.name, product, true)
                } else {
                    this.corp_api.sellProduct(division.name, 'Sector-12', product, 'MAX', 'MP', true);
                }
            }
            const produced_materials = this.materials_produced(division.type);
            for (const material of produced_materials) {
                for (const city of division.cities) {
                    if (this.corp_api.hasResearched(division.name, 'Market-TA.II')) {
                        this.corp_api.setMaterialMarketTA2(division.name, city, material, true)
                    } else {
                        this.corp_api.sellMaterial(division.name, city, material, 'MAX', 'MP');
                    }
                }
            }
        }
    }

    preferred_material(industry) {
        const industries = {
            software: `Hardware`,
            agriculture: `Real Estate`,
            food: `AI Cores`,
        }
        return industries[industry.toLowerCase()];
    }

    grow_division(ns) {
        for (const division of this.corp.divisions) {
            for (const city of this.cities) {
                if (!division.cities.includes(city) &&
                    this.corp_api.getExpandCityCost() < this.current_money) {
                    this.corp_api.expandCity(division.name, city)
                    ns.tprint(`${division.name} expanded to ${city}.`)
                }
            }
        }
    }

    preferred_material_handler(ns) {
        for (const division of this.corp.divisions) {
            const preferred_material = this.preferred_material(division.type);
            for (const city of division.cities) {
                if (!this.corp_api.hasWarehouse(division.name, city)) {
                    continue
                }
                const warehouse = this.corp_api.getWarehouse(division.name, city);
                const warehouse_utilization = warehouse.sizeUsed / warehouse.size;
                if (warehouse_utilization < this.target_warehouse_utilization) {
                    if (warehouse.smartSupplyEnabled) {
                        ns.tprint(`Buying ${preferred_material} in ${city}`)
                    }
                    this.corp_api.setSmartSupply(division.name, city, false);
                    this.corp_api.buyMaterial(division.name, city, preferred_material, 50);
                } else {
                    if (!warehouse.smartSupplyEnabled) {
                        ns.tprint(`Not buying ${preferred_material} in ${city}`)
                    }
                    this.corp_api.buyMaterial(division.name, city, preferred_material, 0);
                    this.corp_api.setSmartSupply(division.name, city, true);
                    this.corp_api.setSmartSupplyUseLeftovers(division.name, city, preferred_material, false);
                }
                if (warehouse_utilization > 0.9) {
                    this.corp_api.sellMaterial(division.name, city, preferred_material, 50, 'MP');
                } else {
                    this.corp_api.sellMaterial(division.name, city, preferred_material, 0, 0);
                }
            }
        }
    }

    upgrade_warehouses(ns) {
        for (const division of this.corp.divisions) {
            for (const city of division.cities) {
                if (!this.corp_api.hasWarehouse(division.name, city)) {
                    if (this.corp_api.getPurchaseWarehouseCost() <= this.current_money) {
                        this.corp_api.purchaseWarehouse(division.name, city)
                        ns.tprint(`Warehouse puchased for ${division.name} in ${city}.`)
                    } else {
                        continue;
                    }
                }
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

    async update_office_assignments(ns) {
        for (const division of this.corp.divisions) {
            for (const cityName of division.cities) {
                const office = this.corp_api.getOffice(division.name, cityName);
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Operations', 0);
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Engineer', 0);
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Business', 0);
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Management', 0);
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Research & Development', 0);
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Training', 0);
                const val = office.size / 15;
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Operations', Math.round(val * 4));
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Engineer', Math.round(val * 3));
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Business', Math.round(val * 2));
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Management', Math.round(val * 2));
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Research & Development', Math.round(val * 3));
                await this.corp_api.setAutoJobAssignment(division.name, cityName, 'Training', Math.round(val * 1));
            }
        }
    }

    async upgrade_offices(ns) {
        for (const division of this.corp.divisions) {
            for (const cityName of division.cities) {
                const office = this.corp_api.getOffice(division.name, cityName);
                if (office.size < this.max_office_size &&
                    this.corp_api.getOfficeSizeUpgradeCost(division.name, cityName, (office.size + 1)) <= this.current_money) {
                    this.corp_api.upgradeOfficeSize(division.name, cityName, (office.size + 1))
                    ns.tprint(`${division.name} ${cityName} office size upgraded to ${(office.size + 1)}`)
                }
                if (office.employees.length === office.size) continue;
                for (let i = office.employees.length; i < office.size; i++) this.corp_api.hireEmployee(division.name, cityName);
                await this.update_office_assignments(ns)
            }
        }
    }

    upgrade_advert(ns) {
        for (const division of this.corp.divisions) {
            if (this.corp_api.getHireAdVertCount(division.name) < this.advert_max &&
                this.corp_api.getHireAdVertCost(division.name) <= this.current_money) {
                this.corp_api.hireAdVert(division.name);
                ns.tprint(`${division.name} AdVert level upgraded to ${this.corp_api.getHireAdVertCount(division.name)}.`)
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