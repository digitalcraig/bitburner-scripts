/** @param {NS} ns **/
import { getItem, localeHHMMSS, settings } from 'common.js'

const scriptsToKill = [
    'starthacking.js',
    'spider.js',
    'grow.js',
    'hack.js',
    'weaken.js',
    'playerervers.js',
    'hackingcontroller.js',
    'start.js',
    'find.js',
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
      ns.tprint(`[${localeHHMMSS()}] Spawning hacking controller`)
      ns.spawn('hackingcontroller.js', 1)
    }
  }