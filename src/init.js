/** @param {NS} ns **/

const baseUrl = 'https://raw.githubusercontent.com/digitalcraig/bitburner-scripts/master/src/'
const filesToDownload = [
  'official/basic_hack.js',
  'official/analyze_server.js',
]
const valuesToRemove = ['BB_SERVER_MAP']

function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime()
  }

  return new Date(ms).toLocaleTimeString()
}

export async function main(ns) {
    ns.tprint(`[${localeHHMMSS()}] Downloading scripts`)

    let hostname = ns.getHostname()
    let nopull = false
    let keepservers = false

    if (hostname !== 'home') {
        throw new Exception('Run the script from home')
    }

    if (args.length > 0 ) {
        for (let i = 0; i < args.length; i++) {
            if (args[i] == 'nopull') {
                nopull = true
            }
            if (args[i] == 'keepservers') {
                keepservers = true
            }
        }
    }

    if (nopull == false) {
        for (let i = 0; i < filesToDownload.length; i++) {
                const filename = filesToDownload[i]
                const path = baseUrl + filename
                await ns.scriptKill('/'+filename, 'home')
                await ns.rm('/'+filename)
                await ns.sleep(200)
                ns.tprint(`[${localeHHMMSS()}] Trying to download ${path} to /`+filename)
                await ns.wget(path + '?ts=' + new Date().getTime(), '/'+ filename)
        }
    }

    if (keepservers == false) {
        ns.tprint(`[${localeHHMMSS()}] Clearing server map`)
        valuesToRemove.map((value) => localStorage.removeItem(value))
    }

    //ns.tprint(`[${localeHHMMSS()}] Spawning killAll.ns`)
    //ns.spawn('killAll.ns', 1, 'runHacking.ns')
}