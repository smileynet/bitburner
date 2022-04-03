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

        function getLayer(depth) {

        }

        function setLayer(depth) {


        }

        function resolve_combos(num_a, num_b) {
            let combos
            combos = combination[num_a].solutions
            combos.forEach(combo => {
                const new_combo = [...combo, num_b]
                new_combo.sort((a, b) => b - a);
                let lookup_matches = []
                if (lookup[new_combo.length]) {
                    if (lookup[new_combo.length][new_combo[0]]) {
                        if (lookup[new_combo.length][new_combo[0]][new_combo[1]]) {
                            lookup_matches = lookup[new_combo.length][new_combo[0]][new_combo[1]]
                        } else {
                            lookup[new_combo.length][new_combo[0]][new_combo[1]] = [new_combo]
                        }
                    } else {
                        lookup[new_combo.length][new_combo[0]] = {
                            [new_combo[1]]: [new_combo]
                        }
                    }
                } else {
                    lookup[new_combo.length] = {
                        [new_combo[0]]: {
                            [new_combo[1]]: [new_combo]
                        }
                    }
                }
                let possible_matches = []
                for (const solution of lookup_matches) {
                    first_loop++
                    if (solution.length != new_combo.length) continue
                    if (solution[0] != new_combo[0]) continue
                    if (solution[1] != new_combo[1]) continue
                    let bad_match = false
                    if (new_combo.length > 3) {
                        for (let i = 2; i < (new_combo.length); i++) {
                            //console.log(`a: ${num_a}   solution[i] ${solution[i]}   new_combo[i]: ${new_combo[i]}`)
                            if (solution[i] != new_combo[i]) {
                                //console.log(`a: ${num_a} i: ${i} ${new_combo} ${solution}`)
                                bad_match = true
                                break
                            }
                        }
                    }
                    if (bad_match) continue
                    possible_matches.push(solution)
                }

                let match = false
                    //console.log(`solutions: ${solutions.length} possible_matches: ${possible_matches.length}`)
                for (const possible_match of possible_matches) {
                    second_loop++
                    if (arrayEquals(possible_match, new_combo)) {
                        match = true
                        break;
                    }
                }
                if (!match) {
                    lookup[new_combo.length][new_combo[0]][new_combo[1]] = [...lookup[new_combo.length][new_combo[0]][new_combo[1]], new_combo]
                    solutions.push(new_combo)
                }
            })
        }

        console.log(`Finding total ways to sum for ${data}`)

        var combination = {};
        var lengths = {};
        let last = new Date();
        var first_loop = 0
        var second_loop = 0
        for (let i = 2; i <= data; i++) {
            let now = new Date();
            console.log(`i: ${i}   time: ${now-last}   first_loop: ${first_loop}   second_loop: ${second_loop}`)
            last = now
            first_loop = 0
            second_loop = 0
            const is_even = i % 2 == 0 ? true : false
            let a = i - 1
            let b = 1
            var solutions = [
                [a, b]
            ]
            var lookup = {
                2: {
                    a: {
                        b: [
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
            solutions.push([i])
            combination[i] = { solutions: solutions, count: solutions.length }
        }
        const fs = require('fs')
        fs.writeFile('./src/data/total_ways.json', JSON.stringify(lengths), err => {
            if (err) {
                console.error(err)
                return
            }
        })

        /*console.log(`\n\nCombinations:`)
        for (const [key, values] of Object.entries(combination)) {
            console.log(`${key}:        Count: ${values.count}`)
        }**/
        console.log(`Number of combinations: ${lengths[data]}`)
        return combination[data].length
    }
}

let ns = ''
console.log(ContractSolver.total_ways_to_sum(ns, 20))