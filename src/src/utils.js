export class Utils {
    static pretty_num(num, digits = 1) {
        if (num < 10) {
            const digit_scaler = 10 * digits
            return (Math.round(num * digit_scaler) / digit_scaler)
        }
        const lookup = [
            { value: 1, symbol: "" },
            { value: 1e3, symbol: "k" },
            { value: 1e6, symbol: "m" },
            { value: 1e9, symbol: "b" },
            { value: 1e12, symbol: "t" },
            { value: 1e15, symbol: "p" },
            { value: 1e18, symbol: "e" }
        ];
        const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        var item = lookup.slice().reverse().find(function(item) {
            return num >= item.value;
        });
        return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
    }

    static get cities() {
        return ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    }

    static get player_skills() {
        return ['hacking', 'strength', 'defense', 'dexterity', 'agility', 'charisma']
    }

    static get combat_stats() {
        return ['strength', 'defense', 'dexterity', 'agility']
    }

    static get factions() {
        return ["Illuminati", "Daedalus", "The Covenant", "ECorp", "MegaCorp", "Bachman & Associates", "Blade Industries", "NWO", "Clarke Incorporated",
            "OmniTek Incorporated", "Four Sigma", "KuaiGong International", "Fulcrum Secret Technologies", "BitRunners", "The Black Hand", "NiteSec",
            "Aevum", "Chongqing", "Ishima", "New Tokyo", "Sector-12", "Volhaven", "Speakers for the Dead", "The Dark Army", "The Syndicate", "Silhouette",
            "Tetrads", "Slum Snakes", "Netburners", "Tian Di Hui", "CyberSec", "Bladeburners", "Church of the Machine God"
        ]
    }
}

export default Utils;