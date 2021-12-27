/** @param {NS} ns **/
import { getItem, localeHHMMSS } from 'common.js'

const logDebug = false

const settings = {
  mapRefreshInterval: 24 * 60 * 60 * 1000,
  keys: {
    serverMap: 'BB_SERVER_MAP',
  },
}

const scriptsToKill = [
    'starthacking.js',
    'spider.js',
    'grow.js',
    'hack.js',
    'weaken.js',
    'playerervers.js',
    'hackingcontroller.js',
    'start.js',
    ]
    
  export async function main(ns) {
    ns.tprint(`[${localeHHMMSS()}] Starting killall script`)
  
    const scriptToRunAfter = ns.args[0]
  
    let hostname = ns.getHostname()
  
    if (hostname !== 'home') {
      throw new Exception('Run the script from home')
    }
  
    const serverMap = getItem(settings.keys.serverMap)
  
    if (!serverMap || serverMap.lastUpdate < new Date().getTime() - settings.mapRefreshInterval) {
      ns.tprint(`[${localeHHMMSS()}] Spawning spider script`)
      ns.spawn('spider.js', 1, 'killall.js')
      ns.exit()
      return
    }
  
    for (let i = 0; i < scriptsToKill.length; i++) {
      await ns.scriptKill(scriptsToKill[i], 'home')
    }
  
    const killAbleServers = Object.keys(serverMap.servers)
      .filter((hostname) => ns.serverExists(hostname))
      .filter((hostname) => hostname !== 'home')
  
    for (let i = 0; i < killAbleServers.length; i++) {
      await ns.killall(killAbleServers[i])
    }
  
    ns.tprint(`[${localeHHMMSS()}] All processes killed`)
  
    if (scriptToRunAfter) {
      ns.tprint(`[${localeHHMMSS()}] Spawning ${scriptToRunAfter}`)
      ns.spawn(scriptToRunAfter, 1)
    } else {
      ns.tprint(`[${localeHHMMSS()}] Starting Hacking`)
      ns.spawn('starthacking.js', 1)
    }
  }