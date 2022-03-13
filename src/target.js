export class Target {
    constructor(ns, server_name, percent_to_steal = 0.4, security_buffer = 2) {
        this.ns = ns;
        this.name = server_name;
        this.percent_to_steal = percent_to_steal;
        this.max_money = ns.getServerMaxMoney(server_name);
        this.min_security = ns.getServerMinSecurityLevel(server_name);
        this.tgt_security = this.min_security + security_buffer;
        this.growth = ns.getServerGrowth(server_name);
        this.growth_money_mult = this.server_max_money * this.server_growth_level;
        // TODO: Validate target
    }

    get current_security() {
        return this.ns.getServerSecurityLevel(this.name);
    }

    get current_money() {
        return this.ns.getServerMoneyAvailable(this.name);
    }

    get next_task() {
        if (this.current_security > this.tgt_security) {
            return "weaken";
        } else if (this.current_money < this.max_money) {
            return "grow";
        } else {
            return "hack";
        }
    }

    get weaken_amount() {
        return this.current_security - this.min_security;
    }

    get grow_amount() {
        return this.max_money - this.current_money;
    }

    get hack_amount() {
        return this.current_money * this.percent_to_steal;
    }

    get weaken_time() {
        return this.ns.getWeakenTime(this.name);
    }

    get grow_time() {
        return this.ns.getGrowTime(this.name);
    }

    get hack_time() {
        return this.ns.getHackTime(this.name);
    }

    get weaken_threads() {
        const cores = 1;
        const threads = 1;
        const security_decrease = this.ns.weakenAnalyze(threads, cores);
        return Math.ceil(this.weaken_amount / security_decrease);
    }

    get grow_threads() {
        const cores = 1;
        return Math.ceil(this.ns.growthAnalyze(this.name, this.grow_amount, cores));
    }

    get hack_threads() {
        return Math.ceil(this.ns.hackAnalyzeThreads(this.name, this.hack_amount));
    }
}