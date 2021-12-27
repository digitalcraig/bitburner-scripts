/** @param {NS} ns **/

const officialBaseUrl = 'https://raw.githubusercontent.com/bitburner-official/bitburner-scripts/master/'
const officialFilesToDownload = [
    'analyze_server.js',
    'basic_hack.js',
    'custom-stats.js',
    'deploy.js',
    'find_coding_contract.js',
    'find_server.js',
    'monitor.js',
    'opened_servers.js',
    'buyservers.js'
]
const officialFilePrefix = '/official/'

const baseUrl = 'https://raw.githubusercontent.com/digitalcraig/bitburner-scripts/master/src/'
const filesToDownload = [
    'common.js',
    'starthacking.js',
    'spider.js',
    'hackingcontroller.js',
    'grow.js',
    'weaken.js',
    'hack.js',
    'killall.js',
    'repl.js'
]
const filePrefix = ''

const valuesToRemove = ['BB_SERVER_MAP']

function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime()
  }

  return new Date(ms).toLocaleTimeString()
}

async function pullScripts(ns, baseUrl, filesToDownload, filePrefix) {
    for (let i = 0; i < filesToDownload.length; i++) {
        const filename = filesToDownload[i]
        const path = baseUrl + filename
        await ns.scriptKill('/'+filename, 'home')
        await ns.rm('/'+filename)
        await ns.sleep(200)
        ns.tprint(`[${localeHHMMSS()}] Trying to download ${path} to `+ filePrefix + filename)
        await ns.wget(path + '?ts=' + new Date().getTime(), filePrefix + filename)
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
        await pullScripts(ns, officialBaseUrl, officialFilesToDownload, officialFilePrefix)
        ns.tprint(`[${localeHHMMSS()}] Downloading digitalcraig scripts`)
        await pullScripts(ns, baseUrl, filesToDownload, filePrefix)
    }

    if (keepvalues == false) {
        ns.tprint(`[${localeHHMMSS()}] Clearing local storage`)
        valuesToRemove.map((value) => localStorage.removeItem(value))
    }


    ns.tprint(`[${localeHHMMSS()}] Spawning killall script`)
    ns.spawn('killall.js', 1, 'buyservers.js')

}
