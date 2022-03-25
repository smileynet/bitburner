/*
 _     _
| |__ | |__      __   ___   _  ___
| '_ \| '_ \ ____\ \ / / | | |/ _ \
| |_) | |_) |_____\ V /| |_| |  __/
|_.__/|_.__/       \_/  \__,_|\___|

*/
/**
 * CONFIGURATION
 * --------------------------------------
 */

/**
 * `bb-vue` installs to a unique subdirectory by default. To place it somewhere other than
 * your root directory in BitBurner, set the prefixDirectory config as needed. Do not use a
 * relative path such as './myDirectory' - always use absolute paths like '/myDirectory'
 */
let prefixDirectory = ''

/**
 * --------------------------------------
 * DO NOT EDIT BELOW THIS LINE
 */

let requiredHost = 'home'
let repoRoot = 'https://raw.githubusercontent.com/smolgumball/bb-vue'
let repoBranch = 'dev'
let manifestFile = 'installManifest.txt'
let manifestTmpPath = '/tmp/installManifest__bb-vue.txt'

export async function main(ns) {
    if (ns.getHostname() !== requiredHost) {
        throw new Error('Run this script from the root directory of home')
    }

    if (ns.args[0]) repoBranch = ns.args[0]
    if (ns.args[1]) prefixDirectory = ns.args[1]

    if (prefixDirectory) prefixDirectory = slashifyPath(prefixDirectory)

    let repoUrl = joinPaths(repoRoot, repoBranch)
    let manifestPath = joinPaths(repoUrl, manifestFile)
    let manifestData = await fetchConfig(ns, manifestPath)
    let manifestLength = manifestData.manifestPaths.length

    for (let i in manifestData.manifestPaths) {
        let { repoPath, installPath } = manifestData.manifestPaths[i]
        repoPath = joinPaths(repoUrl, repoPath)
        try {
            installPath = joinPaths(prefixDirectory, installPath)
            await githubReq(ns, repoPath, installPath)
            await rewriteImports(ns, installPath, manifestData.importRoot, prefixDirectory)
            ns.tprint(`Installed: ${installPath} [${Number(i) + 1}/${manifestLength}]`)
        } catch (e) {
            ns.tprint(`ERROR: Exception while downloading ${repoPath}: `, e.message)
            throw e
        }
    }

    ns.rm(manifestTmpPath, requiredHost)
    let mainJsPath = joinPaths(prefixDirectory, manifestData.entryFile)
    let otherExamplePath = joinPaths(prefixDirectory, `/bb-vue/examples/1-the-app-tray.js`)

    // prettier-ignore
    ns.tprint(`
 
 Install complete! 🎉
 
 Run the following in your home terminal for an example that uses bb-vue:
 run ${mainJsPath}
 
 And here's another example:
 run ${otherExamplePath}
 
 `)
}

async function rewriteImports(ns, filePath, importRoot, prefixDirectory) {
    let file = ns.read(filePath)
    file = file.replaceAll(`from '${importRoot}`, `from '${joinPaths(prefixDirectory, importRoot)}`)
    file = file.replaceAll(`from "${importRoot}`, `from "${joinPaths(prefixDirectory, importRoot)}`)
    file = file.replaceAll(`from \`${importRoot}`, `from \`${joinPaths(prefixDirectory, importRoot)}`)
    await ns.write(filePath, file, 'w')
    await ns.sleep(1)
}

async function fetchConfig(ns, manifestPath) {
    try {
        await githubReq(ns, manifestPath, manifestTmpPath)
        return JSON.parse(ns.read(manifestTmpPath))
    } catch (e) {
        ns.tprint(`ERROR: Downloading and reading config file failed ${manifestPath}`)
        throw e
    }
}

async function githubReq(ns, repoPath, installPath) {
    if (isScriptFile(installPath)) {
        ns.print('Cleanup on: ' + installPath)
        await ns.scriptKill(installPath, requiredHost)
        await ns.rm(installPath, requiredHost)
    }

    ns.print('Request to: ' + repoPath)
    await ns.wget(repoPath + '?cacheBust=' + Date.now(), installPath, requiredHost)
}

// Path helpers
// ---

function joinPaths(pathA, pathB) {
    if (!pathA) return pathB
    if (!pathB) return pathA
    return `${trimTrailingSlash(pathA)}/${trimLeadingSlash(pathB)}`
}

function trimPath(path) {
    return `${trimTrailingSlash(trimLeadingSlash(path))}`
}

function slashifyPath(path) {
    if (!path) return path
    return `/${trimPath(path)}/`
}

function trimLeadingSlash(path) {
    if (path && path.startsWith('/')) {
        return path.slice(1)
    }
    return path
}

function trimTrailingSlash(path) {
    if (path && path.endsWith('/')) {
        return path.slice(0, -1)
    }
    return path
}

// Reflection helpers
// ---

function isScriptFile(path) {
    return path.endsWith('ns') || path.endsWith('js')
}

// Installer script forked from:
// https://github.com/lethern/Bitburner_git_fetch