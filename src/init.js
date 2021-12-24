/** @param {NS} ns **/

const officialBaseUrl = 'https://raw.githubusercontent.com/bitburner-official/bitburner-scripts/master/'
const officialFilesToDownload = [
    'analyze_server.js',
    'basic_hack.js',
    'custom-stats.js',
    'deploy.js'
]
const officialPrefix = '/official'

const baseUrl = 'https://raw.githubusercontent.com/digitalcraig/bitburner-scripts/master/src/'
const filesToDownload = []
const prefix = '/'

const valuesToRemove = ['BB_SERVER_MAP']

function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime()
  }

  return new Date(ms).toLocaleTimeString()
}

function pull(ns, baseUrl, filesToDownload, prefix) {
    for (let i = 0; i < filesToDownload.length; i++) {
        const filename = filesToDownload[i]
        const path = baseUrl + filename
        await ns.scriptKill('/'+filename, 'home')
        await ns.rm('/'+filename)
        await ns.sleep(200)
        ns.tprint(`[${localeHHMMSS()}] Trying to download ${path} to `,prefix + filename)
        await ns.wget(path + '?ts=' + new Date().getTime(), prefix + filename)
    }
}

export async function main(ns) {

    let hostname = ns.getHostname()
    let nopull = false
    let keepvalues = false

    if (hostname !== 'home') {
        throw new Exception('Run the script from home')
    }

    if (ns.args.length > 0 ) {
        for (let i = 0; i < ns.args.length; i++) {
            if (ns.args[i] == 'nopull') {
                nopull = true
            }
            if (ns.args[i] == 'keepservers') {
                keepservers = true
            }
        }
    }

    if (nopull == false) {
        ns.tprint(`[${localeHHMMSS()}] Downloading official scripts`)
        pull(officialBaseUrl, officialFilesToDownload, '/official/')
    }

    if (keepvalues == false) {
        ns.tprint(`[${localeHHMMSS()}] Clearing local storage`)
        valuesToRemove.map((value) => localStorage.removeItem(value))
    }

    //ns.tprint(`[${localeHHMMSS()}] Spawning killAll.ns`)
    //ns.spawn('killAll.ns', 1, 'runHacking.ns')
}
