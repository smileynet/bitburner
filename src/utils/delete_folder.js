/** @param {NS} ns **/
export async function main(ns) {
    let folder = ns.args[0]
    const target = 'home'

    let files = ns.ls(target)

    //let target_files = files.filter(file=> {return (!file.includes('.exe') && !file.includes('.msg') && !file.includes('.lit'))})

    let target_files = files.filter(file => { return file.includes(folder) })
    ns.tprint(target_files)

    for (var i = 0; i < target_files.length; i++) {
        ns.rm(target_files[i], target)
    }
}