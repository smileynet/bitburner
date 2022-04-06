import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";

export class CorpManager {
    constructor(ns, messenger) {
        this.messenger = messenger;
        this.corp_api = eval('ns.corporation');
        this.fraud = false;
        this.max_buyback_price = 1000;
        this.finished = false
        this.completed = false;
        this.divisions_completed = false;
        this.corp_upgrades_completed = false;
        this.divisions = []
    }

    init(ns) {
        if (!ns.getPlayer().hasCorporation) {
            const corp_name = 'Biggiez'
            const result = this.corp_api.createCorporation(corp_name, true)
            ns.tprint(`Corp created with result: ${result}`)
        }
        if (this.corp.divisions.length <= 0) {
            this.create_next_division(ns)
        } else {
            for (const division of this.corp.divisions) {
                this.init_division(ns, division.type, division.name)
            }
        }
        this.name = this.corp.name
    }

    run(ns) {
        this.stock_buyback(ns)
        this.handle_divisions(ns)
        if (!this.corp_upgrades_completed) {
            this.handle_corp_upgrades(ns)
            this.check_corp_upgrade_completion(ns)
        }
        this.status_update(ns)
    }

    get division_upgrades_finished() {
        console.debug(this.divisions)
        const unfinished_divisions = this.divisions.filter(division => division.completed == false)
        if (unfinished_divisions.length > 0) return false;
        else return true;
    }

    get corp() {
        return this.corp_api.getCorporation()
    }

    create_division(ns, division_type) {
        const division_name = CorpHelper.get_name(division_type)
        this.corp_api.expandIndustry(division_type, division_name);
        this.init_division(ns, division_type, division_name);
    }

    init_division(ns, division_type, division_name) {
        let high_priority = false
            //if (division.type = 'Software') high_priority = true
        let division = new DivisionManager(ns, this.messenger, this.corp_api, division_name, division_type, high_priority)
        this.divisions.push(division);
        division.init(ns);
    }

    handle_divisions(ns) {
        for (const division of this.divisions) {
            division.run(ns);
        }
        if (this.division_upgrades_finished) {
            this.create_next_division(ns);
        }
    }

    create_next_division(ns) {
        const next_industry = this.get_next_industry(ns)
        const expansion_cost = this.corp_api.getExpandIndustryCost(next_industry)
        this.messenger.add_message(`${this.name} ready to grow`,
            `  Expansion cost: $${Utils.pretty_num(expansion_cost)}   Current funds: $${Utils.pretty_num(CorpHelper.current_money(ns))}`);
        if (expansion_cost < CorpHelper.current_money(ns)) {
            this.create_division(ns, next_industry);
            ns.tprint(`New ${next_industry} division created.`);
        }
    }

    get_next_industry(ns) {
        const industries = CorpHelper.get_industries()
        let potential_industries = []
        for (const industry of industries) {
            if (this.divisions.find(division => division.type == industry)) continue
            potential_industries.push({ industry: industry, priority: CorpHelper.get_priority(industry) })
        }
        potential_industries.sort((a, b) => b.priority - a.priority)
        return potential_industries[0].industry
    }

    check_completion(ns) {
        if (this.fraud) return false
        if (!this.corp_upgrades_completed) return false
        if (!this.division_upgrades_finished) return false
        ns.print(`${this.name} all upgrades complete!`)
        this.completed = true
    }

    status_update(ns) {
        let message = "";
        if (this.corp.public) {
            message += `Current stock price: $${Utils.pretty_num(this.corp.sharePrice,2)} `
            if (this.corp.issuedShares > 0) {
                const buyback_price = this.corp.sharePrice * 1.1 * this.corp.issuedShares
                message += `Shares outstanding: ${Utils.pretty_num(this.corp.issuedShares)} Total buyback price $${Utils.pretty_num(buyback_price,2)}\n`
            }
        }
        message += `  Current funds: $${Utils.pretty_num(this.corp.funds)}\n`
        message += `Profit: $${Utils.pretty_num(this.corp.revenue - this.corp.expenses)} Mult: ${Utils.pretty_num(this.corp.revenue / this.corp.expenses,2)}   Revenue: $${Utils.pretty_num(this.corp.revenue)}   Expenses: $${Utils.pretty_num(this.corp.expenses)}\n`
        if (message != "") {
            this.messenger.add_message('CorpManager Update', message)
        }
    }

    stock_buyback(ns) {
        if (this.corp.issuedShares > 0) {
            if (!this.fraud) {
                ns.tprint(`Committing fraud to drop the stock price. Share purchase will commence at $${this.max_buyback_price}`)
            }
            this.set_fraud(ns, true)
            if (this.corp.sharePrice < this.max_buyback_price &&
                ((this.corp.sharePrice * 1.1) * this.corp.issuedShares) < ns.getServerMoneyAvailable("home")) {
                ns.tprint(`Buying ${Utils.pretty_num(this.corp.issuedShares)} shares back at $${Utils.pretty_num(this.corp.sharePrice,2)}, for a total price of $${Utils.pretty_num(this.corp.issuedShares * this.corp.sharePrice)}`)
                this.corp_api.buyBackShares(this.corp.issuedShares)
                this.set_fraud(ns, false)
                ns.tprint(`No fraud was committed in support of this transaction. Businesses will resume normal production.`)
            }
        }
    }

    set_fraud(ns, fraud) {
        this.fraud = fraud;
        for (const division of this.divisions) {
            division.fraud = fraud
            for (const city of division.cities)
                city.fraud = fraud
        }
    }

    check_corp_upgrade_completion(ns) {
        let upgrades = this.get_corp_upgrades(ns)
        let upgrades_completed = true
        for (const upgrade of upgrades) {
            const current_level = this.corp_api.getUpgradeLevel(upgrade.name)
            if (current_level < upgrade.max) {
                upgrades_completed = false
            }
        }
        this.corp_upgrades_completed = upgrades_completed;
    }

    handle_corp_upgrades(ns) {
        const upgrade = this.get_next_corp_upgrade(ns)
        const current_upgrade_max = this.divisions.length - 1
        if (upgrade.level > current_upgrade_max && !this.divisions_completed) return
        const cost = this.corp_api.getUpgradeLevelCost(upgrade.name)
        if (cost < CorpHelper.current_money(ns)) {
            this.corp_api.levelUpgrade(upgrade.name)
            ns.tprint(`${upgrade.name} upgraded to level ${upgrade.level+1}`)
        } else {
            const message = `  ${upgrade.name} cost: ${cost}\n`
            this.messenger.add_message('CorpManager Next Corp Upgrade', message)
        }
    }

    get_next_corp_upgrade(ns) {
        let upgrades = this.get_corp_upgrades(ns)
        upgrades = upgrades.sort((a, b) => b.priority - a.priority)
        for (let i = 1; i < 20; i++) {
            for (let upgrade of upgrades) {
                upgrade.level = this.corp_api.getUpgradeLevel(upgrade.name)
                if (upgrade.level < upgrade.max) {
                    return upgrade
                }
            }
        }
        ns.tprint(`ERROR: Unexpected end when trying to find next corp upgrade.`)
    }

    get_corp_upgrades(ns) {
        return [
            { name: "Smart Factories", priority: 10, max: 10 },
            { name: "Smart Storage", priority: 9, max: 10 },
            { name: "DreamSense", priority: 1, max: 10 },
            { name: "Wilson Analytics", priority: 1, max: 10 },
            { name: "Nuoptimal Nootropic Injector Implants", priority: 1, max: 10 },
            { name: "Speech Processor Implants", priority: 1, max: 10 },
            { name: "Neural Accelerators", priority: 1, max: 10 },
            { name: "FocusWires", priority: 1, max: 10 },
            { name: "ABC SalesBots", priority: 1, max: 10 },
            { name: "Project Insight", priority: 1, max: 10 },
        ]
    }
}

class CorpHelper {
    static get_industries() {
        return ['Software', 'Agriculture', 'Food', 'Tobacco', 'Chemical', 'Fishing', 'Utilities', 'Pharmaceutical', 'Energy', 'Computer', 'Healthcare', 'Mining', 'RealEstate', 'Robotics']
    }

    static get_industry_data(industry, type) {
        const industries = {
            Software: { name: 'Warez', materials_consumed: ['Hardware', 'Energy'], materials_produced: ['AI Cores'], preferred_material: `Hardware`, makes_products: true, priority: 10 },
            Agriculture: { name: 'Cows', materials_consumed: ['Water', 'Energy'], materials_produced: ['Food', 'Plants'], preferred_material: `Real Estate`, makes_products: false, priority: 8 },
            Food: { name: 'Burritoz', materials_consumed: ['Food', 'Water', 'Energy'], materials_produced: [], preferred_material: `AI Cores`, makes_products: true, priority: 7 },
            Tobacco: { name: 'Smokez', materials_consumed: ['Plants', 'Water'], materials_produced: [], preferred_material: `Robots`, makes_products: true, priority: 9 },
            Chemical: { name: 'Chemz', materials_consumed: ['Plants', 'Water', 'Energy'], materials_produced: ['Chemicals'], preferred_material: `Robots`, makes_products: false, priority: 6 },
            Fishing: { name: 'Sushiz', materials_consumed: ['Energy'], materials_produced: ['Food'], preferred_material: `Robots`, makes_products: false, priority: 5 },
            Utilities: { name: 'Poopiez', materials_consumed: ['Hardware', 'Metal'], materials_produced: ['Water'], preferred_material: `Robots`, makes_products: false, priority: 4 },
            Pharmaceutical: { name: 'Drugz', materials_consumed: ['Chemicals', 'Water', 'Energy'], materials_produced: ['Drugs'], preferred_material: `Robots`, makes_products: true, priority: 3 },
            Energy: { name: 'Wattz', materials_consumed: ['Hardware', 'Metal'], materials_produced: ['Energy'], preferred_material: `Real Estate`, makes_products: false, priority: 2 },
            Computer: { name: '', materials_consumed: [''], materials_produced: [''], preferred_material: ``, makes_products: false, priority: 1 },
            Healthcare: { name: '', materials_consumed: [''], materials_produced: [''], preferred_material: ``, makes_products: false, priority: 1 },
            Mining: { name: '', materials_consumed: [''], materials_produced: [''], preferred_material: ``, makes_products: false, priority: 1 },
            RealEstate: { name: '', materials_consumed: [''], materials_produced: [''], preferred_material: ``, makes_products: false, priority: 1 },
            Robotics: { name: '', materials_consumed: [''], materials_produced: [''], preferred_material: ``, makes_products: false, priority: 1 },
        }

        return industries[industry][type];
    }

    static materials_consumed(industry) {
        return CorpHelper.get_industry_data(industry, 'materials_consumed');
    }

    static materials_produced(industry) {
        return CorpHelper.get_industry_data(industry, 'materials_produced');
    }

    static preferred_material(industry) {
        return CorpHelper.get_industry_data(industry, 'preferred_material');
    }

    static makes_products(industry) {
        return CorpHelper.get_industry_data(industry, 'makes_products')
    }

    static get_priority(industry) {
        return CorpHelper.get_industry_data(industry, 'priority')
    }

    static get_name(industry) {
        return CorpHelper.get_industry_data(industry, 'name')
    }


    static current_money(ns) {
        return eval('ns.corporation').getCorporation().funds
    }
}

class DivisionManager {
    constructor(ns, messenger, corp_api, name, type, high_priority = false) {
        this.corp_api = corp_api;
        this.messenger = messenger;
        this.name = name;
        this.type = type;
        this.opts = {
            advert_max: 6,
            target_warehouse_utilization: 0.7,
            target_warehouse_level: 10,
            max_office_size: 9,
            priority_multiplier: 2,
            high_priority: high_priority,
        }
        this.base_product_investment = 1000000000 // 1 billion
        this.completed = false;
        this.advert_completed = false;
        this.expansion_completed = false;
        this.initial_products_completed = false;
        this.fraud = false;
        this.makes_products = CorpHelper.makes_products(this.type)
        this.produced_materials = CorpHelper.materials_produced(this.type);
    }

    init(ns) {
        this.cities = []
        for (const city_name of this.current_city_names) {
            this.add_city_object(ns, city_name);
        }
    }

    run(ns) {
        this.handle_cities(ns)
        this.handle_warehouse_apis(ns)
        this.handle_office_apis(ns)
        this.check_expansion_completion(ns)
        this.status_update(ns)
        this.check_completion(ns)
    }

    get current_city_names() {
        return this.corp_api.getDivision(this.name).cities
    }

    get corp() {
        return this.corp_api.getCorporation()
    }

    get division_object() {
        return this.corp.divisions.find(division => division.name == this.name)
    }
    get research_amount() {
        return this.corp_api.getDivision(this.name).research
    }

    get products() {
        return this.corp_api.getDivision(this.name).products
    }

    get max_products() {
        let max_products = 3;
        const corp_api_unlocked = this.corp_api.hasUnlockUpgrade('Office API')
        if (corp_api_unlocked) {
            if (this.corp_api.hasResearched(this.name, 'uPgrade: Capacity.II')) {
                max_products = 5;
            } else if (this.corp_api.hasResearched(this.name, 'uPgrade: Capacity.I')) {
                max_products = 4;
            }
        }
        return max_products;
    }

    get city_upgrades_finished() {
        const unfinished_cities = this.cities.filter(city => city.completed == false)
        if (unfinished_cities.length > 0) return false;
        else return true;
    }

    get advert_level() {
        return this.corp_api.getHireAdVertCount(this.name)
    }

    get target_advert_level() {
        let target_advert_level = this.opts.advert_max
        if (this.opts.high_priority) target_advert_level *= this.opts.priority_multiplier
        return target_advert_level
    }

    status_update(ns) {
        const profit = this.division_object.lastCycleRevenue - this.division_object.lastCycleExpenses
        const profit_mult = this.division_object.lastCycleRevenue / this.division_object.lastCycleExpenses
        let message = `  Division Profit: ${Utils.pretty_num(profit)}  Mult: ${Utils.pretty_num(profit_mult)}`
        message += `  Current number of products: ${this.products.length}`
        message += `   Highest version: ${this.get_highest_product_version()}`
        message += `   Under development: ${this.product_under_development()}\n`
        if (!this.completed) {
            message += `  Advert level: ${this.corp_api.getHireAdVertCount(this.name)}   target: ${this.target_advert_level}\n`
            message += `  Cities:\n`
            for (const city of this.cities) {
                message += `    ${city.name} completion- warehouse: ${city.warehouse_completed} office: ${city.office_completed}\n`
            }
        }

        this.messenger.add_message(`${this.name} status update.`, message);
    }

    check_completion(ns) {
        if (this.completed) return
        if (!this.advert_completed) return false
        if (!this.city_upgrades_finished) return false
        if (!this.expansion_completed) return false
        if (!this.initial_products_completed) return false
        ns.print(`${this.name} all upgrades complete!`)
        this.completed = true
    }

    check_advert_completion(ns) {
        if (this.advert_completed) return
        if (this.advert_level >= this.target_advert_level) {
            this.advert_completed = true;
            ns.print(`${this.name} AdVert at target level: ${this.advert_level}.`)
        }
    }

    check_expansion_completion(ns) {
        if (this.expansion_completed) return
        if (this.cities.length >= Utils.cities.length) {
            this.expansion_completed = true
            ns.print(`${this.name} city expansion complete.`)
        }
    }

    handle_warehouse_apis(ns) {
        if (!this.corp_api.hasUnlockUpgrade('Warehouse API')) return
        this.create_products(ns)
        this.update_products(ns)
        this.check_initial_product_completion(ns)
        this.expand_division_to_new_city(ns)
    }

    handle_office_apis(ns) {
        if (!this.corp_api.hasUnlockUpgrade('Office API')) return
        this.handle_research(ns)
        this.upgrade_advert(ns)
        this.check_advert_completion(ns)
    }

    handle_cities(ns) {
        for (const city of this.cities) {
            city.run(ns);
        }
    }

    init_research(ns) {
        let research_names = [
            'Hi-Tech R&D Laboratory',
            'Market-TA.I',
            'Market-TA.II'
        ]
        if (this.makes_products) {
            const product_research = [
                'uPgrade: Fulcrum',
                'uPgrade: Capacity.I',
                'uPgrade: Capacity.II',
            ]
            research_names = [...research_names, ...product_research]
        }

        this.research = {}
        for (const research_name of research_names) {
            let info = {}
            info.unlocked = this.corp_api.hasResearched(this.name, research_name);
            info.cost = this.corp_api.getResearchCost(this.name, research_name);
            this.research[research_name] = info
        }
    }

    add_city_object(ns, city_name) {
        const city = new CityManager(ns, this, city_name);
        city.init(ns);
        this.cities.push(city);
    }

    expand_division_to_new_city(ns) {
        if (!this.city_upgrades_finished || this.expansion_completed) return
        const expansion_cost = this.corp_api.getExpandCityCost() + this.corp_api.getPurchaseWarehouseCost()
        this.messenger.add_message(`${this.name} ready to grow`,
            `  Expansion cost: $${Utils.pretty_num(expansion_cost)}   Current funds: $${Utils.pretty_num(CorpHelper.current_money(ns))}`);
        for (const city_name of Utils.cities) {
            if (!this.current_city_names.includes(city_name) &&
                expansion_cost < CorpHelper.current_money(ns)) {
                this.corp_api.expandCity(this.name, city_name)
                this.corp_api.purchaseWarehouse(this.name, city_name)
                this.add_city_object(ns, city_name)
                ns.tprint(`${this.name} expanded to ${city_name}.`)
                return;
            }
        }
    }

    check_initial_product_completion(ns) {
        if (this.initial_products_completed) return
        if (!this.makes_products) this.initial_products_completed = true;
        if (this.products.length >= this.max_products) {
            this.initial_products_completed = true
        }
    }

    create_products(ns) {
        if (!this.makes_products) return
            // if (this.product_under_development()) return
        if (this.products.length < this.max_products) {
            let current_version = this.get_highest_product_version();
            const new_version = current_version + 1
            const new_product_cost = this.base_product_investment * 2 * new_version
            if (new_product_cost <= CorpHelper.current_money(ns)) {
                const product_name = `${this.type}-v${new_version}`
                this.corp_api.makeProduct(this.name, 'Sector-12', `${product_name}`, this.base_product_investment, this.base_product_investment)
                ns.tprint(`Beginning development of ${product_name}`)
            }
        }
    }

    product_under_development() {
        for (const product_name of this.products) {
            const product = this.corp_api.getProduct(this.name, product_name)
            if (product.developmentProgress < 100) {
                return true
            }
        }
        return false
    }

    get_highest_product_version() {
        let current_version = 0;
        for (const product_name of this.products) {
            const tens_char = parseInt(product_name.charAt(product_name.length - 2));
            const ones_char = parseInt(product_name.charAt(product_name.length - 1));
            const tens = tens_char > 0 ? tens_char * 10 : 0;
            const ones = ones_char > 0 ? ones_char : 0;
            const version = tens + ones;
            if (version > current_version)
                current_version = version;
        }
        return current_version;
    }

    update_products(ns) {
        if (!this.makes_products) return
        const corp_api_unlocked = this.corp_api.hasUnlockUpgrade('Office API')
        for (const product of this.products) {
            if (this.fraud) {
                if (corp_api_unlocked && this.corp_api.hasResearched(this.name, 'Market-TA.II')) {
                    this.corp_api.setProductMarketTA2(this.name, product, false)
                }
                this.corp_api.sellProduct(this.name, 'Sector-12', product, 'MAX', 1, true);
            } else if (this.corp.state == 'START') {
                let productData = this.corp_api.getProduct(this.name, product)
                if (corp_api_unlocked && this.corp_api.hasResearched(this.name, 'Market-TA.II')) {
                    this.corp_api.setProductMarketTA2(this.name, product, true)
                    for (const city of this.cities) {
                        if (productData.cityData[city.name][0] > 0) {
                            this.corp_api.setProductMarketTA2(this.name, product, false)
                            break;
                        }
                    }
                }
                this.corp_api.sellProduct(this.name, 'Sector-12', product, 'MAX', 'MP', true);
            }
        }
    }

    handle_research(ns) {
        if (!this.research) this.init_research(ns)
        const market_ta_unlocked = (this.research['Market-TA.II'].unlocked &&
            this.research['Market-TA.I'].unlocked)
        const market_ta_cost = 70000
        if (this.can_research('Hi-Tech R&D Laboratory')) {
            this.unlock_research(ns, 'Hi-Tech R&D Laboratory');
        } else if (!market_ta_unlocked && this.research_amount >= market_ta_cost) {
            this.unlock_research(ns, 'Market-TA.I');
            this.unlock_research(ns, 'Market-TA.II');
        } else
        if (market_ta_unlocked && this.makes_products) {
            const product_research = ['uPgrade: Fulcrum', 'uPgrade: Capacity.I', 'uPgrade: Capacity.II']
            for (const research_name of product_research) {
                if (this.can_research(research_name)) {
                    this.unlock_research(ns, research_name);
                }
            }
        }
    }

    can_research(research_name) {
        if (!this.research[research_name].unlocked &&
            this.research[research_name].cost < this.research_amount) {
            return true;
        } else {
            return false
        }
    }

    unlock_research(ns, research_name) {
        const result = this.corp_api.research(this.name, research_name);
        this.research[research_name].unlocked = result;
        ns.tprint(`${this.name} has researched ${research_name}, result: ${result}`)
    }

    upgrade_advert(ns) {
        if (this.advert_completed) return
        if (this.cities.length < this.advert_level && !this.expansion_completed) return
        const advert_cost = this.corp_api.getHireAdVertCost(this.name)
        this.messenger.add_message(`${this.name} needs to upgrade advert`,
            `  Current: ${this.advert_level}   Target: ${this.target_advert_level} Cost: $${Utils.pretty_num(advert_cost)}`);
        if (this.advert_level < this.target_advert_level &&
            advert_cost <= CorpHelper.current_money(ns)) {
            this.corp_api.hireAdVert(this.name);
            ns.tprint(`${this.name} AdVert level upgraded to ${this.advert_level}.`)
        }
    }
}
class CityManager {
    constructor(ns, division, name) {
        this.corp_api = division.corp_api
        this.division_name = division.name
        this.division_type = division.type
        this.name = name
        this.opts = division.opts
        this.messenger = division.messenger;
        this.completed = false;
        this.has_warehouse = this.corp_api.hasWarehouse(division.name, name)
        this.preferred_material = CorpHelper.preferred_material(this.division_type);
        this.consumed_materials = CorpHelper.materials_consumed(this.division_type)
        this.produced_materials = CorpHelper.materials_produced(this.division_type);
        this.office_completed = false
        this.warehouse_completed = false;
        this.fraud = false;
        this.buying_preferred = false
        this.selling_preferred = false
    }

    init(ns) {
        this.check_office_completion(ns)
        this.check_warehouse_completion(ns)
        this.enable_smart_supply();
    }

    run(ns) {
        this.handle_materials(ns)
        if (!this.completed) {
            this.check_completion(ns)
            this.handle_warehouse_api(ns)
            this.handle_office_api(ns)
            this.status_update(ns)
        }
    }

    get warehouse() {
        return this.corp_api.getWarehouse(this.division_name, this.name);
    }

    get office() {
        return this.corp_api.getOffice(this.division_name, this.name);
    }

    get warehouse_utilization() {
        return this.warehouse.sizeUsed / this.warehouse.size;
    }

    get corp() {
        return this.corp_api.getCorporation()
    }

    get target_office_size() {
        let target_office_size = this.opts.max_office_size;
        if (this.opts.high_priority)
            target_office_size *= this.opts.priority_multiplier;
        return target_office_size;
    }

    get target_warehouse_level() {
        let target_warehouse_level = this.opts.target_warehouse_level;
        if (this.opts.high_priority)
            target_warehouse_level *= this.opts.priority_multiplier;
        return target_warehouse_level;
    }

    status_update(ns) {
        // Leaving this in place for future functionality, currently this is rolled up by the division implementation of this function.
        //this.messenger.add_message(`${this.division_name} ${this.name} upgrade completion`,
        //    `  Warehouse: ${this.warehouse_completed}   Office: ${this.office_completed}`);
    }

    check_completion(ns) {
        if (!this.warehouse_completed) return false
        if (!this.office_completed) return false
        ns.print(`${this.division_name} ${this.name} all upgrades complete!`)
        this.completed = true
    }

    handle_warehouse_api(ns) {
        if (!this.corp_api.hasUnlockUpgrade('Warehouse API')) return
        if (!this.warehouse_completed) {
            if (!this.has_warehouse) {
                this.buy_warehouse(ns)
            } else {
                this.upgrade_warehouse(ns)
            }
            this.check_warehouse_completion(ns)
        }
    }

    handle_office_api(ns) {
        if (!this.corp_api.hasUnlockUpgrade('Office API')) return
        if (!this.office_completed) {
            this.upgrade_office(ns)
            this.check_office_completion(ns)
        }

    }

    check_office_completion(ns) {
        this.messenger.add_message(`${this.division_name} ${this.name} office status`,
            `  Current office level: ${this.office.size}   target: ${this.target_office_size}`);
        if (this.office.size >= this.target_office_size) {
            ns.print(`${this.division_name} office in ${this.name} at target level: ${this.target_office_size}.`)
            this.office_completed = true
        }
    }

    check_warehouse_completion(ns) {
        this.messenger.add_message(`${this.division_name} ${this.name} warehouse status`,
            `  Current warehouse level: ${this.warehouse.level}   target: ${this.target_warehouse_level}`);
        if (this.warehouse.level >= this.target_warehouse_level) {
            this.warehouse_completed = true
            ns.print(`${this.division_name} warehouse in ${this.name} at target level: ${this.target_warehouse_level}.`)
        }
    }


    upgrade_office(ns) {
        const batch_upgrade_size = 3
        const office_upgrade_cost = this.corp_api.getOfficeSizeUpgradeCost(this.division_name, this.name, batch_upgrade_size)
        this.messenger.add_message(`${this.division_name} ${this.name} needs office upgrades.`,
            `  Upgrade cost: $${Utils.pretty_num(office_upgrade_cost)}   Current funds: $${Utils.pretty_num(CorpHelper.current_money(ns))}`);
        while (this.office.size < this.target_office_size &&
            office_upgrade_cost <= CorpHelper.current_money(ns)) {
            this.corp_api.upgradeOfficeSize(this.division_name, this.name, batch_upgrade_size)
            ns.tprint(`${this.division_name} ${this.name} office size upgraded to ${this.office.size}`)
        }
        if (this.office.employees.length === this.office.size) return;
        for (let i = this.office.employees.length; i < this.office.size; i++) this.corp_api.hireEmployee(this.division_name, this.name);
        ns.run('/src/scriptlauncher.js', 1, '/utils/office_assignment.js', this.division_name, this.name)
    }

    handle_materials(ns) {
        if (this.corp.state != 'START') return;
        this.handle_consumed_materials(ns);
        this.handle_produced_materials(ns);
        this.buy_preferred_material(ns);
        this.sell_preferred_material(ns);
    }

    handle_produced_materials(ns) {
        const corp_api_unlocked = this.corp_api.hasUnlockUpgrade('Office API')
        for (const material of this.produced_materials) {
            if (this.fraud) {
                if (corp_api_unlocked && this.corp_api.hasResearched(this.division_name, 'Market-TA.II')) {
                    this.corp_api.setMaterialMarketTA2(this.division_name, this.name, material, false);
                };
                this.sell_material(material, 'MAX', 1);
            } else if (this.corp.state == 'START') {
                if (corp_api_unlocked && this.corp_api.hasResearched(this.division_name, 'Market-TA.II')) {
                    this.corp_api.setMaterialMarketTA2(this.division_name, this.name, material, true);
                }
                this.sell_material(material, 'MAX', 'MP');
            }
        }
    }

    handle_consumed_materials(ns) {
        for (const consumed_material of this.consumed_materials) {
            if (this.fraud) {
                this.disable_smart_supply();
                this.buy_material(consumed_material, 0);
                this.sell_material(consumed_material, 'MAX', 1);
                this.not_fraud = false
            } else {
                if (this.not_fraud) return
                this.enable_smart_supply();
                this.sell_material(consumed_material, 0, 0);
                this.not_fraud = true;
            }
        }
    }

    sell_preferred_material(ns) {
        if (this.warehouse_utilization > 0.9) {
            if (this.selling_preferred) return
            this.sell_material(this.preferred_material, 100, 1);
            this.messenger.add_message(`${this.division_name} ${this.name} selling ${this.preferred_material}`,
                this.get_warehouse_utilization_string());
            this.selling_preferred = true
        } else if (this.warehouse_utilization < this.opts.target_warehouse_utilization * 1.1) {
            if (!this.selling_preferred) return
            this.sell_material(this.preferred_material, 0, 0);
            this.messenger.add_message(`${this.division_name} ${this.name} no longer selling ${this.preferred_material}`,
                this.get_warehouse_utilization_string());
            this.selling_preferred = false
        }
    }

    buy_preferred_material(ns) {
        if (this.warehouse_utilization < this.opts.target_warehouse_utilization) {
            if (this.buying_preferred) return;
            this.messenger.add_message(`${this.division_name} ${this.name} buying ${this.preferred_material}`,
                this.get_warehouse_utilization_string());
            this.disable_smart_supply();
            this.buy_material(this.preferred_material, 500);
            this.buying_preferred = true
        } else {
            if (!this.buying_preferred) return;
            this.messenger.add_message(`${this.division_name} ${this.name} no longer buying ${this.preferred_material}`,
                this.get_warehouse_utilization_string());
            this.buy_material(this.preferred_material, 0);
            this.enable_smart_supply();
            this.corp_api.setSmartSupplyUseLeftovers(this.division_name, this.name, this.preferred_material, false);
            this.buying_preferred = false
        }
    }

    get_warehouse_utilization_string() {
        return `  Utilization: ${this.warehouse_utilization.toFixed(2)}, target utilization: ${this.opts.target_warehouse_utilization}`
    }

    buy_material(material, amount) {
        this.corp_api.buyMaterial(this.division_name, this.name, material, amount);
    }

    sell_material(material, amount, price) {
        this.corp_api.sellMaterial(this.division_name, this.name, material, amount, price);
    }

    disable_smart_supply() {
        this.corp_api.setSmartSupply(this.division_name, this.name, false)
    }

    enable_smart_supply() {
        this.corp_api.setSmartSupply(this.division_name, this.name, true)
    }

    buy_warehouse(ns) {
        if (this.corp_api.getPurchaseWarehouseCost() <= CorpHelper.current_money(ns)) {
            this.corp_api.purchaseWarehouse(this.division_name, this.name)
            this.has_warehouse = true
            ns.tprint(`Warehouse purchased for ${this.division_name} in ${this.name}.`)
        }
    }

    upgrade_warehouse(ns) {
        if (this.warehouse_completed) return
        const warehouse_upgrade_cost = this.corp_api.getUpgradeWarehouseCost(this.division_name, this.name);
        this.messenger.add_message(`${this.division_name} ${this.name} needs warehouse upgrades.`,
            `  Upgrade cost: $${Utils.pretty_num(warehouse_upgrade_cost)}   Current funds: $${Utils.pretty_num(CorpHelper.current_money(ns))}`)
        if (this.warehouse.level < this.target_warehouse_level &&
            this.warehouse_utilization >= this.opts.target_warehouse_utilization) {
            if (warehouse_upgrade_cost < CorpHelper.current_money(ns)) {
                this.corp_api.upgradeWarehouse(this.division_name, this.name);
                ns.tprint(`Warehouse upgraded to ${this.warehouse.level} for ${this.division_name} in ${this.name}.`)
            }
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const verbose = false
    const messenger = new Messenger(verbose);
    messenger.init(ns);
    const corp_manager = new CorpManager(ns, messenger);
    corp_manager.init(ns)
    while (!corp_manager.finished) {
        corp_manager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default CorpManager;