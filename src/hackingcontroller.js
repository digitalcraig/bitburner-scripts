import { getItem, getPlayerDetails, localeHHMMSS, hackScripts, hackPrograms, numberWithCommas, convertSToHHMMSS, createUUID } from 'common.js'

const logDebug = false

const hackingParameters = {
    homeRamReserved: 20,
    homeRamReservedBase: 20,
    homeRamExtraRamReserved: 12,
    homeRamBigMode: 64,
    minSecurityLevelOffset: 1,
    maxMoneyMultiplier: 0.9,
    minSecurityWeight: 100,
    mapRefreshInterval: 24 * 60 * 60,
    maxWeakenTime: 30 * 60,
    keys: {
      serverMap: 'BB_SERVER_MAP',
    },
    changes: {
      hack: 0.002,
      grow: 0.004,
      weaken: 0.05,
    },
  }

 /**
 * This function determines the number of weaken cycles 
 * @param {NS} ns
 * @param {integer} growCycles The number of grow cycles to be run
 * @returns {integer} The number of weaken cycles to run
 */
function weakenCyclesForGrow(growCycles) {
    return Math.max(0, Math.ceil(growCycles * (hackingParameters.changes.grow / hackingParameters.changes.weaken)))
  }

  /**
 * This function determines the number of weaken cycles 
 * @param {NS} ns
 * @param {integer} hackCycles The number of hack cycles to be run
 * @returns {integer} The number of weaken cycles to run
 */
function weakenCyclesForHack(hackCycles) {
return Math.max(0, Math.ceil(hackCycles * (hackingParameters.changes.hack / hackingParameters.changes.weaken)))
}
  
function getHackableServers(ns, servers) {
    const playerDetails = getPlayerDetails(ns)

    ns.tprint(`[${localeHHMMSS()}] Getting hackable servers`)
    const hackableServers = Object.keys(servers)
        .filter((hostname) => ns.serverExists(hostname))
        .filter((hostname) => servers[hostname].ports <= playerDetails.portHacks || ns.hasRootAccess(hostname))
        .map((hostname) => {
        if (hostname !== 'home') {
            if (!ns.hasRootAccess(hostname)) {
            hackPrograms.forEach((hackProgram) => {
                if (ns.fileExists(hackProgram, 'home')) {
                 ns[hackProgram.split('.').shift().toLocaleLowerCase()](hostname)
                }
            })
            ns.nuke(hostname)
            }
        }

        return hostname
        })
        .filter((hostname) => servers[hostname].ram >= 2)
        
    hackableServers.sort((a, b) => servers[a].ram - servers[b].ram)
    ns.tprint(`[${localeHHMMSS()}] Hackable servers are: ` + hackableServers)

    return hackableServers
}

async function copyScripts(ns, server) {

  ns.tprint(`[${localeHHMMSS()}] Copying hacking scripts to ` + server)
  await ns.scp(hackScripts, "home", server)

}

function findTargetServer(ns, serversList, servers, serverExtraData) {
    const playerDetails = getPlayerDetails(ns)

    if (logDebug) {
      ns.tprint(`[${localeHHMMSS()}] Calculating server targets from server list: ` + serversList)
      serversList.forEach((server) => {
        ns.tprint(`[${localeHHMMSS()}] Server details ` + JSON.stringify(servers[server], null, 2))
      })
    }

    serversList = serversList
      .filter((hostname) => servers[hostname].hackingLevel <= playerDetails.hackingLevel)
      .filter((hostname) => servers[hostname].maxMoney)
      .filter((hostname) => hostname !== 'home')
      .filter((hostname) => servers[hostname].weakenTime < hackingParameters.maxWeakenTime)
      
    let weightedServers = serversList.map((hostname) => {
      const fullHackCycles = Math.ceil(100 / Math.max(0.00000001, ns.hackAnalyze(hostname)))
  
      serverExtraData[hostname] = {
        fullHackCycles,
      }
  
      const serverValue = servers[hostname].maxMoney * (hackingParameters.minSecurityWeight / (servers[hostname].minSecurityLevel + ns.getServerSecurityLevel(hostname)))
  
      return {
        hostname,
        serverValue,
        hackTime: servers[hostname].hackTime,
        growTime: servers[hostname].growTime,
        weakenTime: servers[hostname].weakenTime,
        minSecurityLevel: servers[hostname].minSecurityLevel,
        securityLevel: ns.getServerSecurityLevel(hostname),
        maxMoney: servers[hostname].maxMoney,
      }
    })
  
    weightedServers.sort((a, b) => b.serverValue - a.serverValue)
    if (logDebug) {
      ns.tprint(`[${localeHHMMSS()}] Weighted servers are: ` + JSON.stringify(weightedServers, null, 2))
    }

    return weightedServers.map((server) => server.hostname)
  }

 /**
 * This script enables automtic hacking using available servers
 * @param {NS} ns
 */

 export async function main(ns) {
    ns.tprint(`[${localeHHMMSS()}] Starting hacking controller`)
  
    let hostname = ns.getHostname()
  
    if (hostname !== 'home') {
      throw new Exception('Run the script from home')
    }
  
    while (true) {
      const serverExtraData = {}
      const serverMap = getItem(hackingParameters.keys.serverMap)
      if (serverMap.servers.home.ram >= hackingParameters.homeRamBigMode) {
        hackingParameters.homeRamReserved = hackingParameters.homeRamReservedBase + hackingParameters.homeRamExtraRamReserved
      }
  
      if (!serverMap || serverMap.lastUpdate < new Date().getTime() - hackingParameters.mapRefreshInterval) {
        ns.tprint(`[${localeHHMMSS()}] Refreshing server map`)
        ns.spawn('spider.js', 1, 'hackingcontroller.js')
        ns.exit()
        return
      }

      serverMap.servers.home.ram = Math.max(0, serverMap.servers.home.ram - hackingParameters.homeRamReserved)

      const hackableServers = getHackableServers(ns, serverMap.servers)
      const targetServers = findTargetServer(ns, hackableServers, serverMap.servers, serverExtraData)
      const bestTarget = targetServers.shift()

      if (logDebug) {
        ns.tprint(`[${localeHHMMSS()}] Best Target details ` + JSON.stringify(bestTarget, null, 2))  
      }
      const hackTime = serverMap.servers[bestTarget].hackTime
      const growTime = serverMap.servers[bestTarget].growTime
      const weakenTime = serverMap.servers[bestTarget].weakenTime

  
      const growDelay = Math.max(0, weakenTime - growTime - 0.015) // Grow to complete 15ms before weaken
      const hackDelay = Math.max(0, growTime + growDelay - hackTime - 0.015) // Hack to complete 15ms after grow
  
      const securityLevel = ns.getServerSecurityLevel(bestTarget)
      const money = ns.getServerMoneyAvailable(bestTarget)
  
      let action = 'weaken'
      if (securityLevel > serverMap.servers[bestTarget].minSecurityLevel + hackingParameters.minSecurityLevelOffset) {
        action = 'weaken'
      } else if (money < serverMap.servers[bestTarget].maxMoney * hackingParameters.maxMoneyMultiplier) {
        action = 'grow'
      } else {
        action = 'hack'
      }
  
      let hackCycles = 0
      let growCycles = 0
      let weakenCycles = 0

      let hackScriptRam = ns.getScriptRam('hack.js')
      let growScriptRam = ns.getScriptRam('grow.js')
      let weakenScriptRam = ns.getScriptRam('weaken.js')

      for (let i = 0; i < hackableServers.length; i++) {
        const server = serverMap.servers[hackableServers[i]]
        hackCycles += Math.floor(server.ram / hackScriptRam)
        growCycles += Math.floor(server.ram / growScriptRam)
      }
      weakenCycles = growCycles
    
      ns.tprint(
        `[${localeHHMMSS()}] Selected ${bestTarget} for a target. Planning to ${action} the server. Will wake up around ${localeHHMMSS(
          new Date().getTime() + weakenTime + .0300
        )}`
      )
      ns.tprint(
        `[${localeHHMMSS()}] Stock values: baseSecurity: ${serverMap.servers[bestTarget].baseSecurityLevel}; minSecurity: ${
          serverMap.servers[bestTarget].minSecurityLevel
        }; maxMoney: $${numberWithCommas(parseInt(serverMap.servers[bestTarget].maxMoney, 10))}`
      )
      ns.tprint(`[${localeHHMMSS()}] Current values: security: ${Math.floor(securityLevel * 1000) / 1000}; money: $${numberWithCommas(parseInt(money, 10))}`)
      ns.tprint(
        `[${localeHHMMSS()}] Time to: hack: ${convertSToHHMMSS(hackTime)}; grow: ${convertSToHHMMSS(growTime)}; weaken: ${convertSToHHMMSS(weakenTime)}`
      )
      ns.tprint(`[${localeHHMMSS()}] Delays: ${convertSToHHMMSS(hackDelay)} for hacks, ${convertSToHHMMSS(growDelay)} for grows`)
  
      if (action === 'weaken') {
        if (hackingParameters.changes.weaken * weakenCycles > securityLevel - serverMap.servers[bestTarget].minSecurityLevel) {
          weakenCycles = Math.ceil((securityLevel - serverMap.servers[bestTarget].minSecurityLevel) / hackingParameters.changes.weaken)
          growCycles -= weakenCycles
          growCycles = Math.max(0, growCycles)
  
          weakenCycles += weakenCyclesForGrow(growCycles)
          growCycles -= weakenCyclesForGrow(growCycles)
          growCycles = Math.max(0, growCycles)
        } else {
          growCycles = 0
        }
  
        ns.tprint(
          `[${localeHHMMSS()}] Cycles ratio: ${growCycles} grow cycles; ${weakenCycles} weaken cycles; expected security reduction: ${
            Math.floor(hackingParameters.changes.weaken * weakenCycles * 1000) / 1000
          }`
        )
  
        for (let i = 0; i < hackableServers.length; i++) {
          const server = serverMap.servers[hackableServers[i]]
          let cyclesFittable = Math.max(0, Math.floor(server.ram / growScriptRam))
          const cyclesToRun = Math.max(0, Math.min(cyclesFittable, growCycles))
          
          await copyScripts(ns, server.host)
          if (growCycles) {
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the grow script requires ` + growScriptRam + `. Executing ` + cyclesToRun + ` threads of grow on ` + server.host)
            }
            await ns.exec('grow.js', server.host, cyclesToRun, bestTarget, cyclesToRun, growDelay, createUUID())
            growCycles -= cyclesToRun
            cyclesFittable -= cyclesToRun
          }
  
          if (cyclesFittable) {
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the weaken script requires ` + weakenScriptRam + `. Executing ` + cyclesFittable + ` threads of weaken on ` + server.host)
            }
            await ns.exec('weaken.js', server.host, cyclesFittable, bestTarget, cyclesFittable, 0, createUUID())
            weakenCycles -= cyclesFittable
          }
        }
      } else if (action === 'grow') {
        weakenCycles = weakenCyclesForGrow(growCycles)
        growCycles -= weakenCycles
  
        ns.tprint(`[${localeHHMMSS()}] Cycles ratio: ${growCycles} grow cycles; ${weakenCycles} weaken cycles`)
  
        for (let i = 0; i < hackableServers.length; i++) {
          const server = serverMap.servers[hackableServers[i]]
          let cyclesFittable = Math.max(0, Math.floor(server.ram / growScriptRam))
          const cyclesToRun = Math.max(0, Math.min(cyclesFittable, growCycles))
  
          if (growCycles) {
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the grow script requires ` + growScriptRam + `. Executing ` + cyclesToRun ` threads of grow on ` + server.host)
            }
            await ns.exec('grow.js', server.host, cyclesToRun, bestTarget, cyclesToRun, growDelay, createUUID())
            growCycles -= cyclesToRun
            cyclesFittable -= cyclesToRun
          }
  
          if (cyclesFittable) {
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the weaken script requires ` + weakenScriptRam + `. Executing ` + cyclesFittable ` threads of weaken on ` + server.host)
            }
            await ns.exec('weaken.js', server.host, cyclesFittable, bestTarget, cyclesFittable, 0, createUUID())
            weakenCycles -= cyclesFittable
          }
        }
      } else {
        if (hackCycles > serverExtraData[bestTarget].fullHackCycles) {
          hackCycles = serverExtraData[bestTarget].fullHackCycles
  
          if (hackCycles * 100 < growCycles) {
            hackCycles *= 10
          }
  
          growCycles = Math.max(0, growCycles - Math.ceil((hackCycles * 1.7) / 1.75))
  
          weakenCycles = weakenCyclesForGrow(growCycles) + weakenCyclesForHack(hackCycles)
          growCycles -= weakenCycles
          hackCycles -= Math.ceil((weakenCyclesForHack(hackCycles) * 1.75) / 1.7)
  
          growCycles = Math.max(0, growCycles)
        } else {
          growCycles = 0
          weakenCycles = weakenCyclesForHack(hackCycles)
          hackCycles -= Math.ceil((weakenCycles * 1.75) / 1.7)
        }
  
        ns.tprint(`[${localeHHMMSS()}] Cycles ratio: ${hackCycles} hack cycles; ${growCycles} grow cycles; ${weakenCycles} weaken cycles`)
  
        for (let i = 0; i < hackableServers.length; i++) {
          const server = serverMap.servers[hackableServers[i]]
          let cyclesFittable = Math.max(0, Math.floor(server.ram / hackScriptRam))
          const cyclesToRun = Math.max(0, Math.min(cyclesFittable, hackCycles))
          
          if (hackCycles) {
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the hack script requires ` + hackScriptRam + `. Executing ` + cyclesToRun + ` threads of hack on ` + server.host + ' with delay of ' + hackDelay)
            }
            await ns.exec('hack.js', server.host, cyclesToRun, bestTarget, cyclesToRun, hackDelay, createUUID())
            hackCycles -= cyclesToRun
            cyclesFittable -= cyclesToRun
          }
  
          const freeRam = server.ram - (cyclesToRun * hackScriptRam)
          cyclesFittable = Math.max(0, Math.floor(freeRam / growScriptRam))
  
          if (cyclesFittable && growCycles) {
            const growCyclesToRun = Math.min(growCycles, cyclesFittable)
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the grow script requires ` + growScriptRam + `. Executing ` + growCyclesToRun + ` threads of hack on ` + server.host + ' with delay of ' + growDelay)
            }
            await ns.exec('grow.js', server.host, growCyclesToRun, bestTarget, growCyclesToRun, growDelay, createUUID())
            growCycles -= growCyclesToRun
            cyclesFittable -= growCyclesToRun
          }
  
          if (cyclesFittable) {
            if (logDebug) {
              ns.tprint(`[${localeHHMMSS()}] ` + server.host + ` has ` + server.ram + ` RAM available and the weaken script requires ` + weakenScriptRam + `. Executing ` + cyclesFittable + ` threads of hack on ` + server.host)
            }
            await ns.exec('weaken.js', server.host, cyclesFittable, bestTarget, cyclesFittable, 0, createUUID())
            weakenCycles -= cyclesFittable
          }
        }
      }
      const sleepTime = weakenTime + .0300 
      ns.tprint(`[${localeHHMMSS()}] Sleeping for ${sleepTime} seconds.`)
      await ns.sleep(sleepTime * 1000)
    }
  }