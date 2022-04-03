class ContractSolver {
    static total_ways_to_sum(ns, data) {
        /*
            Description: It is possible write four as a sum in exactly four different ways:

                3 + 1
                2 + 2
                2 + 1 + 1
                1 + 1 + 1 + 1

            How many different ways can the number 75 be written as a sum of at least two positive integers?

            Data:
            75
        */
        function arrayEquals(a, b) {
            return Array.isArray(a) &&
                Array.isArray(b) &&
                a.length === b.length &&
                a.every((val, index) => val === b[index]);
        }

        function handle_lookup(combo) {
            let result = []
            if (combo[0] == 1) return result
            if (!lookup[combo.length]) {
                lookup[combo.length] = {
                    [combo[0]]: {
                        [combo[1]]: [combo]
                    }
                }
                return result
            }
            if (!lookup[combo.length][combo[0]]) {
                lookup[combo.length][combo[0]] = {
                    [combo[1]]: [combo]
                }
                return result
            }
            for (let i = 0; i < combo.length; i++) {
                result = getLayer(i, i, combo)
                if (result == false) {
                    setLayer(i, combo)
                }
            }
            if (result) {
                return result
            } else {
                return []
            }
        }

        function getLayer(depth, top, combo) {
            if (depth <= 0) {
                return lookup[combo.length][combo[0]]
            } else {
                let current_layer = getLayer(depth - 1, top, combo)
                if (current_layer) {
                    if (current_layer[combo[depth]]) {
                        return current_layer[combo[depth]]
                    } else {
                        if (depth == top) {
                            return current_layer
                        } else {
                            return false
                        }
                    }
                } else {
                    return false
                }
            }
        }

        function setLayer(depth, combo) {
            if (depth <= 0) {
                lookup[combo.length][combo[0]] = {
                    [combo[1]]: [combo]
                }
            } else {
                let previous_layer = getLayer(depth - 1, depth - 1, combo)
                previous_layer[combo[depth - 1]] = {
                    [combo[depth]]: [combo]
                }
            }
        }

        function resolve_combos(num_a, num_b) {
            let combos
            combos = combination[num_a].solutions
            combos.forEach(combo => {
                const new_combo = [...combo, num_b]
                new_combo.sort((a, b) => b - a);
                let lookup_matches = handle_lookup(new_combo)
                let match = false
                for (const possible_match of lookup_matches) {

                    if (arrayEquals(possible_match, new_combo)) {
                        match = true
                        break;
                    }
                }
                if (!match) {
                    solutions.push(new_combo)
                }
            })
        }

        console.log(`Finding total ways to sum for ${data}`)

        console.log('readFile called');
        var combination = {};
        var lengths = {};
        let last = new Date();
        for (let i = 2; i <= data; i++) {
            let now = new Date();
            console.log(`i: ${i}   time: ${now-last}`)
            last = now

            const is_even = i % 2 == 0 ? true : false
            let a = i - 1
            let b = 1
            var solutions = [
                [a, b]
            ]
            var lookup = {
                2: {
                    [a]: {
                        [b]: [
                            [a, b]
                        ]
                    }
                },
            }
            while (a > 1) {
                if (a > b || (is_even && a == b)) {
                    resolve_combos(a, b)
                } else {
                    break;
                }
                a--
                b++
            }
            lengths[i] = solutions.length
            let deduped_solutions = Array.from(new Set(solutions.map(JSON.stringify)), JSON.parse)
            deduped_solutions = solutions.sort((a, b) => b[0] - a[0])
            deduped_solutions.push([i])
            combination[i] = { solutions: deduped_solutions, count: deduped_solutions.length - 1 }
        }
        var fs = require('fs');
        fs.writeFile('./src/data/total_ways.json', JSON.stringify(lengths), err => {
            if (err) {
                console.error(err)
                return
            }
        })

        console.log(`\n\nCombinations:`)
        for (const [key, values] of Object.entries(combination)) {
            console.log(`${key}:        Count: ${values.count}`)
        }
        console.log(`Number of combinations: ${lengths[data]}`)
        return lengths[data]
    }
}

let ns = ''
console.log(ContractSolver.total_ways_to_sum(ns, 100))