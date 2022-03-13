import { BotMaster } from "./src/botmaster.js";

/** @param {NS} ns **/
export async function main(ns) {
    let botmaster = new BotMaster(ns);
    await botmaster.run();
}