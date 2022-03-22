import Utils from "/src/utils.js";

export class CorpRunner {
    constructor(ns, messenger) {
        this.messenger = messenger;
        this.corp_api = eval('ns.corporation');
        this.target_warehouse_utilization = 0.7;
        this.target_warehouse_level = 10;
        this.advert_max = 10;
        this.max_office_size = 60;
        this.fraud = false;
        this.buyback_price = 1000;
        this.base_investment_amount = 1000000000 // 1 billion
        this.high_priority = ['Software']
        this.priority_multiplier = 2
    }

    async run(ns) {
        this.create_products(ns)
        this.stock_buyback(ns)
        this.handle_research(ns)
        this.grow_division(ns)
        this.upgrade_warehouses(ns)
        await this.upgrade_offices(ns) // NOTE: This should move to an external script to as to be non-blocking
        this.upgrade_advert(ns)
        this.corp_upgrades(ns)
        this.update_products(ns)
        this.preferred_material_handler(ns)
        this.status_update(ns)
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

    status_update(ns) {
        let message = "";

        if (this.corp.public) {
            message += `Current stock price: $${Utils.pretty_num(Math.floor(this.corp.sharePrice),3)}\n`
            if (this.corp.issuedShares > 0) {
                const buyback_price = Utils.pretty_num((this.corp.sharePrice * 1.1) * this.corp.issuedShares)
                message += `Shares outstanding: ${Utils.pretty_num(this.corp.issuedShares)} Total buyback price $${buyback_price}\n`
            }
        }
        message += `Profit: $${Utils.pretty_num(this.corp.revenue - this.corp.expenses)} Revenue: $${Utils.pretty_num(this.corp.revenue)} Expenses: $${Utils.pretty_num(this.corp.expenses)}\n`
        if (message != "") {
            console.debug(message);
            this.messenger.add_message('CorpRunner Update', message)
        }
    }

    get_industry_data(industry, type) {
        const industries = {
            Software: { materials_consumed: ['Hardware', 'Energy'], materials_produced: ['AI Cores'], preferred_material: `Hardware`, makes_products: true },
            Agriculture: { materials_consumed: ['Water', 'Energy'], materials_produced: ['Food', 'Plants'], preferred_material: `Real Estate`, makes_products: false },
            Food: { materials_consumed: ['Food', 'Water', 'Energy'], materials_produced: [], preferred_material: `AI Cores`, makes_products: true },
            Tobacco: { materials_consumed: ['Plants', 'Water'], materials_produced: [], preferred_material: `Robots`, makes_products: true },
            Chemical: { materials_consumed: ['Plants', 'Water', 'Energy'], materials_produced: ['Chemicals'], preferred_material: `Robots`, makes_products: false },
            Fishing: { materials_consumed: ['Energy'], materials_produced: ['Food'], preferred_material: `Robots`, makes_products: false },
            Utilities: { materials_consumed: ['Hardware', 'Metal'], materials_produced: ['Water'], preferred_material: `Robots`, makes_products: false },
            Pharmaceutical: { materials_consumed: ['Chemicals', 'Water', 'Energy'], materials_produced: ['Drugs'], preferred_material: `Robots`, makes_products: true },
            Energy: { materials_consumed: ['Hardware', 'Metal'], materials_produced: ['Energy'], preferred_material: `Real Estate`, makes_products: false },
        }

        return industries[industry][type];
    }

    materials_consumed(industry) {
        return this.get_industry_data(industry, 'materials_consumed');
    }

    materials_produced(industry) {
        return this.get_industry_data(industry, 'materials_produced');
    }

    preferred_material(industry) {
        return this.get_industry_data(industry, 'preferred_material');
    }

    makes_products(industry) {
        return this.get_industry_data(industry, 'makes_products')
    }

    create_products(ns) {
        for (const division of this.corp.divisions) {
            let max_products = 3
            if (this.corp_api.hasResearched(division.name, 'uPgrade: Capacity.II')) {
                max_products = 5
            } else if (this.corp_api.hasResearched(division.name, 'uPgrade: Capacity.I')) {
                max_products = 4
            }
            if (this.makes_products(division.type) && division.products.length < max_products) {
                let current_version = 0
                for (const product_name of division.products) {
                    const tens_char = parseInt(product_name.charAt(product_name.length - 2));
                    const ones_char = parseInt(product_name.charAt(product_name.length - 1));
                    const tens = tens_char > 0 ? tens_char * 10 : 0
                    const ones = ones_char > 0 ? ones_char : 0
                    const version = tens + ones
                    if (version > current_version) current_version = version;
                }
                const new_version = current_version + 1
                const new_product_cost = this.base_investment_amount * 2 * new_version
                if (new_product_cost <= this.current_money) {
                    const product_name = `${division.type}-v${new_version}`
                    this.corp_api.makeProduct(division.name, 'Sector-12', `${product_name}`, this.base_investment_amount, this.base_investment_amount)
                    ns.tprint(`Beginning development on ${product_name}`)
                }
            }
        }
    }

    stock_buyback(ns) {
        if (this.corp.issuedShares > 0) {
            if (!this.fraud) {
                ns.tprint(`Committing fraud to drop the stock price. Share purchase will commence at $${this.buyback_price}`)
            }
            this.fraud = true;
            if (this.corp.sharePrice < this.buyback_price &&
                ((this.corp.sharePrice * 1.1) * this.corp.issuedShares) < ns.getServerMoneyAvailable("home")) {
                ns.tprint(`Buying ${this.corp.issuedShares} back at $${this.corp.sharePrice}.`)
                this.corp_api.buyBackShares(this.corp.issuedShares)
                this.fraud = false;
                ns.tprint(`No fraud was committed in support of this transaction. Businesses will resume normal production.`)
            }
        }
    }

    handle_research(ns) {
        for (const division of this.corp.divisions) {
            const market_ta_unlocked = (this.corp_api.hasResearched(division.name, 'Market-TA.II') &&
                this.corp_api.hasResearched(division.name, 'Market-TA.I'))
            if (!this.corp_api.hasResearched(division.name, 'Hi-Tech R&D Laboratory') &&
                this.corp_api.getResearchCost(division.name, 'Hi-Tech R&D Laboratory') < division.research) {
                this.corp_api.research(division.name, 'Hi-Tech R&D Laboratory')
                ns.tprint(`${division.name} has researched Hi-Tech R&D Laboratory`)
            } else if (!market_ta_unlocked && division.research >= 70000) {
                this.corp_api.research(division.name, 'Market-TA.I')
                this.corp_api.research(division.name, 'Market-TA.II')
                ns.tprint(`${division.name} has researched Market-TA.I & II`)
            } else if (market_ta_unlocked && this.makes_products(division.type)) {
                if (!this.corp_api.hasResearched(division.name, 'uPgrade: Fulcrum') &&
                    division.research >= 10000) {
                    this.corp_api.research(division.name, 'uPgrade: Fulcrum')
                    ns.tprint(`${division.name} has researched uPgrade: Fulcrum`)
                } else if (!this.corp_api.hasResearched(division.name, 'uPgrade: Capacity.I') &&
                    division.research >= 20000) {
                    this.corp_api.research(division.name, 'uPgrade: Capacity.I')
                    ns.tprint(`${division.name} has researched uPgrade: Capacity.I`)
                } else if (!this.corp_api.hasResearched(division.name, 'uPgrade: Capacity.II') &&
                    division.research >= 30000) {
                    this.corp_api.research(division.name, 'uPgrade: Capacity.II')
                    ns.tprint(`${division.name} has researched uPgrade: Capacity.II`)
                }
            }
        }
    }

    update_products(ns) {
        for (const division of this.corp.divisions) {
            for (const product of division.products) {
                if (this.fraud) {
                    if (this.corp_api.hasResearched(division.name, 'Market-TA.II')) {
                        this.corp_api.setProductMarketTA2(division.name, product, false)
                    }
                    this.corp_api.sellProduct(division.name, 'Sector-12', product, 'MAX', 1, true);
                } else if (this.corp.state == 'START') {
                    let productData = this.corp_api.getProduct(division.name, product)
                    if (this.corp_api.hasResearched(division.name, 'Market-TA.II')) {
                        this.corp_api.setProductMarketTA2(division.name, product, true)
                        for (const city of division.cities) {
                            if (productData.cityData[city][0] > 0) {
                                this.corp_api.setProductMarketTA2(division.name, product, false)
                                break;
                            }
                        }
                    }
                    this.corp_api.sellProduct(division.name, 'Sector-12', product, 'MAX', 'MP', true);
                }
            }
            const produced_materials = this.materials_produced(division.type);
            for (const material of produced_materials) {
                for (const city of division.cities) {
                    if (this.fraud) {
                        if (this.corp_api.hasResearched(division.name, 'Market-TA.II')) {
                            this.corp_api.setMaterialMarketTA2(division.name, city, material, false)
                        }
                        this.corp_api.sellMaterial(division.name, city, material, 0, 0);
                    } else if (this.corp.state == 'START') {
                        if (this.corp_api.hasResearched(division.name, 'Market-TA.II')) {
                            this.corp_api.setMaterialMarketTA2(division.name, city, material, true)
                        }
                        this.corp_api.sellMaterial(division.name, city, material, 'MAX', 'MP');
                    }
                }
            }
        }
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
            if (this.corp.state != 'START') continue;
            const preferred_material = this.preferred_material(division.type);
            for (const city of division.cities) {
                if (!this.corp_api.hasWarehouse(division.name, city)) {
                    continue;
                }
                const warehouse = this.corp_api.getWarehouse(division.name, city);
                const warehouse_utilization = warehouse.sizeUsed / warehouse.size;
                if (warehouse_utilization < this.target_warehouse_utilization) {
                    if (warehouse.smartSupplyEnabled && !this.fraud) {
                        ns.tprint(`${division.name} buying ${preferred_material} in ${city}`)
                    }
                    this.corp_api.setSmartSupply(division.name, city, false);
                    this.corp_api.buyMaterial(division.name, city, preferred_material, 500);
                } else {
                    if (!warehouse.smartSupplyEnabled && !this.fraud) {
                        ns.tprint(`${division.name} not buying ${preferred_material} in ${city}`)
                    }
                    this.corp_api.buyMaterial(division.name, city, preferred_material, 0);
                    this.corp_api.setSmartSupply(division.name, city, true);
                    this.corp_api.setSmartSupplyUseLeftovers(division.name, city, preferred_material, false);
                }
                if (this.fraud) {
                    this.corp_api.setSmartSupply(division.name, city, false)
                    this.corp_api.sellMaterial(division.name, city, preferred_material, 0, 0);
                } else if (warehouse_utilization > 0.9) {
                    this.corp_api.setSmartSupply(division.name, city, true)
                    this.corp_api.sellMaterial(division.name, city, preferred_material, 100, 'MP');
                } else {
                    this.corp_api.sellMaterial(division.name, city, preferred_material, 0, 0);
                }

                for (const consumed_material of this.materials_consumed(division.type)) {
                    if (this.fraud) {
                        this.corp_api.buyMaterial(division.name, city, consumed_material, 0);
                        this.corp_api.sellMaterial(division.name, city, consumed_material, 'MAX', 1);
                    } else {
                        this.corp_api.sellMaterial(division.name, city, consumed_material, 0, 0);
                    }
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
                let target_warehouse_level = this.target_warehouse_level
                if (this.high_priority.includes(division.type)) target_warehouse_level *= this.priority_multiplier
                if (warehouse.level <= target_warehouse_level &&
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
                await update_office_assignment(ns, division.name, cityName)
            }
        }
    }

    async update_office_assignment(ns, divisionName, cityName) {
        const office = this.corp_api.getOffice(divisionName, cityName);
        ns.tprint(`Beginning job reassignment for ${divisionName} in ${cityName}.`)
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Operations', 0);
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Engineer', 0);
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Business', 0);
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Management', 0);
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Research & Development', 0);
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Training', 0);
        const val = office.size / 15;
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Operations', Math.round(val * 4));
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Engineer', Math.round(val * 3));
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Business', Math.round(val * 2));
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Management', Math.round(val * 2));
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Research & Development', Math.round(val * 3));
        await this.corp_api.setAutoJobAssignment(divisionName, cityName, 'Training', Math.round(val * 1));
        ns.tprint(`Job reassignment for ${divisionName} in ${cityName} completed.`)
    }

    async upgrade_offices(ns) {
        for (const division of this.corp.divisions) {
            let target_office_size = this.max_office_size
            if (this.high_priority.includes(division.type)) target_office_size *= this.priority_multiplier
            for (const cityName of division.cities) {
                let office = this.corp_api.getOffice(division.name, cityName);
                while (office.size < target_office_size &&
                    this.corp_api.getOfficeSizeUpgradeCost(division.name, cityName, 3) <= this.current_money) {
                    this.corp_api.upgradeOfficeSize(division.name, cityName, 3)
                    office = this.corp_api.getOffice(division.name, cityName);
                    ns.tprint(`${division.name} ${cityName} office size upgraded to ${office.size}`)
                }
                if (office.employees.length === office.size) continue;
                for (let i = office.employees.length; i < office.size; i++) this.corp_api.hireEmployee(division.name, cityName);
                await this.update_office_assignment(ns, division.name, cityName)
            }
        }
    }

    upgrade_advert(ns) {
        for (const division of this.corp.divisions) {
            let target_advert_level = this.advert_max
            if (this.high_priority.includes(division.type)) target_advert_level *= this.priority_multiplier
            if (this.corp_api.getHireAdVertCount(division.name) < target_advert_level &&
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