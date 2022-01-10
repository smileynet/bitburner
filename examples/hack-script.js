/** @param {NS} ns **/
export async function main(ns) {
    let serversFound = new Set();
    let serversProfit = [];
    let stack = [];
    let origin = ns.getHostname();
    stack.push(origin);

    while(stack.length > 0) {
        let server = stack.pop();
        if (!serversFound.has(server)){
            serversFound.add(server);
            let neighbors = ns.scan(server);
            for (let serv of neighbors) {
                if (!serversFound.has(serv))
                    stack.push(serv);
            }
        }
    }
    
    let tools=0;
    ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'].forEach(t=>{
        if(ns.fileExists(t)) tools++;    
    })

    let cores = ns.getServer('home').cpuCores;
    let servers = Array.from(serversFound);
    for(let server of servers){
        if( ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()
            || ns.getServerNumPortsRequired(server) > tools ){
            continue;
        }

        let money = ns.hackAnalyzeChance(server) * ns.hackAnalyze(server) * ns.getServerMaxMoney(server);
        let gt = ns.growthAnalyze(server, 1/0.5, cores);
        let profit = money / (ns.getGrowTime(server)*gt);

        serversProfit.push({
            name: server,
            profit: profit* 1000,
        });
    }
    
    serversProfit.sort( (a,b) => b.profit-a.profit );

    let pad = servers.reduce((acc, elem) => Math.max(acc, elem.length), 0)
    for(let serv of serversProfit) {
        ns.tprint(`Server: ${serv.name.padEnd(pad)} | Profit: ${(serv.profit.toFixed(3)+'').padEnd(10)}`);
    }
}