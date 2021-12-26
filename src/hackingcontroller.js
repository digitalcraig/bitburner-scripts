/** @param {NS} ns **/
import { getItem, getPlayerDetails, localeHHMMSS, hackScripts, hackPrograms, numberWithCommas, convertMSToHHMMSS, createUUID } from 'common.js'

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

function weakenCyclesForGrow(growCycles) {
    return Math.max(0, Math.ceil(growCycles * (hackingParameters.changes.grow / hackingParameters.changes.weaken)))
  }
  
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
  
    ns.tprint(`[${localeHHMMSS()}] Calculating server targets from server list: ` + serversList)
    // Debug
    serversList.forEach((server) => {
      ns.tprint(`[${localeHHMMSS()}] Server details ` + JSON.stringify(servers[server], null, 2))
      ns.tprint(`[${localeHHMMSS()}] Server details ` + ns.getWeakenTime(server))
    })

    serversList = serversList
      .filter((hostname) => servers[hostname].hackingLevel <= playerDetails.hackingLevel)
      .filter((hostname) => servers[hostname].maxMoney)
      .filter((hostname) => hostname !== 'home')
      .filter((hostname) => ns.getWeakenTime(hostname) < hackingParameters.maxWeakenTime)
      
    let weightedServers = serversList.map((hostname) => {
      const fullHackCycles = Math.ceil(100 / Math.max(0.00000001, ns.hackAnalyze(hostname)))
  
      serverExtraData[hostname] = {
        fullHackCycles,
      }
  
      const serverValue = servers[hostname].maxMoney * (hackingParameters.minSecurityWeight / (servers[hostname].minSecurityLevel + ns.getServerSecurityLevel(hostname)))
  
      return {
        hostname,
        serverValue,
        minSecurityLevel: servers[hostname].minSecurityLevel,
        securityLevel: ns.getServerSecurityLevel(hostname),
        maxMoney: servers[hostname].maxMoney,
      }
    })
  
    weightedServers.sort((a, b) => b.serverValue - a.serverValue)
/*    
    ns.tprint(`[${localeHHMMSS()}] Weighted servers are: ` + JSON.stringify(weightedServers, null, 2))
*/
    return weightedServers.map((server) => server.hostname)
  }

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
  
      ns.tprint(`[${localeHHMMSS()}] Getting Hack time for: ` + bestTarget)
      const hackTime = ns.getHackTime(bestTarget) * 1000
      const growTime = ns.getGrowTime(bestTarget) * 1000
      const weakenTime = ns.getWeakenTime(bestTarget) * 1000
  
      const growDelay = Math.max(0, weakenTime - growTime - 15 * 1000)
      const hackDelay = Math.max(0, growTime + growDelay - hackTime - 15 * 1000)
  
      const securityLevel = ns.getServerSecurityLevel(bestTarget)
      const money = ns.getServerMoneyAvailable(bestTarget)
  
      let action = 'weaken'
      if (securityLevel > serverMap.servers[bestTarget].minSecurityLevel + hackingParameters.minSecurityLevelOffset) {
        action = 'weaken'
      } else if (money < serverMap.servers[bestTarget].maxMoney * hackingParameters.maxMoneyMultiplayer) {
        action = 'grow'
      } else {
        action = 'hack'
      }
  
      let hackCycles = 0
      let growCycles = 0
      let weakenCycles = 0
  
      for (let i = 0; i < hackableServers.length; i++) {
        const server = serverMap.servers[hackableServers[i]]
        hackCycles += Math.floor(server.ram / 1.7)
        growCycles += Math.floor(server.ram / 1.75)
      }
      weakenCycles = growCycles
  
      ns.tprint(
        `[${localeHHMMSS()}] Selected ${bestTarget} for a target. Planning to ${action} the server. Will wake up around ${localeHHMMSS(
          new Date().getTime() + weakenTime + 300
        )}`
      )
      ns.tprint(
        `[${localeHHMMSS()}] Stock values: baseSecurity: ${serverMap.servers[bestTarget].baseSecurityLevel}; minSecurity: ${
          serverMap.servers[bestTarget].minSecurityLevel
        }; maxMoney: $${numberWithCommas(parseInt(serverMap.servers[bestTarget].maxMoney, 10))}`
      )
      ns.tprint(`[${localeHHMMSS()}] Current values: security: ${Math.floor(securityLevel * 1000) / 1000}; money: $${numberWithCommas(parseInt(money, 10))}`)
      ns.tprint(
        `[${localeHHMMSS()}] Time to: hack: ${convertMSToHHMMSS(hackTime)}; grow: ${convertMSToHHMMSS(growTime)}; weaken: ${convertMSToHHMMSS(weakenTime)}`
      )
      ns.tprint(`[${localeHHMMSS()}] Delays: ${convertMSToHHMMSS(hackDelay)} for hacks, ${convertMSToHHMMSS(growDelay)} for grows`)
  
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
          let cyclesFittable = Math.max(0, Math.floor(server.ram / 1.75))
          const cyclesToRun = Math.max(0, Math.min(cyclesFittable, growCycles))
          
          await copyScripts(ns, server.host)
          if (growCycles) {
            await ns.exec('grow.js', server.host, cyclesToRun, bestTarget, cyclesToRun, growDelay, createUUID())
            growCycles -= cyclesToRun
            cyclesFittable -= cyclesToRun
          }
  
          if (cyclesFittable) {
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
          let cyclesFittable = Math.max(0, Math.floor(server.ram / 1.75))
          const cyclesToRun = Math.max(0, Math.min(cyclesFittable, growCycles))
  
          if (growCycles) {
            await ns.exec('grow.js', server.host, cyclesToRun, bestTarget, cyclesToRun, growDelay, createUUID())
            growCycles -= cyclesToRun
            cyclesFittable -= cyclesToRun
          }
  
          if (cyclesFittable) {
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
          let cyclesFittable = Math.max(0, Math.floor(server.ram / 1.7))
          const cyclesToRun = Math.max(0, Math.min(cyclesFittable, hackCycles))
          
          if (hackCycles) {
            await ns.exec('hack.js', server.host, cyclesToRun, bestTarget, cyclesToRun, hackDelay, createUUID())
            hackCycles -= cyclesToRun
            cyclesFittable -= cyclesToRun
          }
  
          const freeRam = server.ram - cyclesToRun * 1.7
          cyclesFittable = Math.max(0, Math.floor(freeRam / 1.75))
  
          if (cyclesFittable && growCycles) {
            const growCyclesToRun = Math.min(growCycles, cyclesFittable)
  
            await ns.exec('grow.js', server.host, growCyclesToRun, bestTarget, growCyclesToRun, growDelay, createUUID())
            growCycles -= growCyclesToRun
            cyclesFittable -= growCyclesToRun
          }
  
          if (cyclesFittable) {
            await ns.exec('weaken.js', server.host, cyclesFittable, bestTarget, cyclesFittable, 0, createUUID())
            weakenCycles -= cyclesFittable
          }
        }
      }
      const sleepTime = weakenTime + 300 / 1000
      ns.tprint(`[${localeHHMMSS()}] Sleeping for ${sleepTime} seconds.`)
      await ns.sleep(weakenTime + 300)
    }
  }