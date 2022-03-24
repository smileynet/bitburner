import { send_stats } from './statspusher'

/** @param {NS} ns **/
export async function main(ns) {
    const metric = 'exp-per-sec'
    const value = 0
    params = {
        MetricData: [{
            MetricName: metric,
            Unit: "None",
            Value: value,
        }, ],
        Namespace: "bitburner-test",
    };
    send_stats(params)
    ns.tprint(ns.getPlayer().strength)
}