/** @param {NS} ns **/
import { getItem, setItem, localeHHMMSS, createUUID } from 'common.js'

const logDebug = false

const settings = {
    maxPlayerServers: 25,
    // gbRamCost: 55000,
    maxGbRam: 1048576,
    minGbRam: 64,
    totalMoneyAllocation: 0.9,
    actions: {
      BUY: 'buy',
      UPGRADE: 'upgrade',
    },
    keys: {
      serverMap: 'BB_SERVER_MAP',
    },
  }
  
  function updateServer(ns, serverMap, host) {
    serverMap.servers[host] = {
      host,
      ports: ns.getServerNumPortsRequired(host),
      hackingLevel: ns.getServerRequiredHackingLevel(host),
      maxMoney: ns.getServerMaxMoney(host),
      growth: ns.getServerGrowth(host),
      minSecurityLevel: ns.getServerMinSecurityLevel(host),
      baseSecurityLevel: ns.getServerBaseSecurityLevel(host),
      ram: ns.getServerMaxRam(host)[0],
      connections: ['home'],
      parent: 'home',
      children: [],
    }
  
    Object.keys(serverMap.servers).map((hostname) => {
      if (!ns.serverExists(hostname)) {
        delete serverMap.servers[hostname]
      }
    })
  
    setItem(settings.keys.serverMap, serverMap)
  }
  
  function getPurchasedServers(ns) {
    let purchasedServers = ns.getPurchasedServers()
    if (purchasedServers.length) {
      purchasedServers.sort((a, b) => {
        const totalRamA = ns.getServerMaxRam(a)
        const totalRamB = ns.getServerMaxRam(b)
  
        if (totalRamA === totalRamB) {
          return ns.getServerMaxRam(a) - ns.getServerMaxRam(b)
        } else {
          return totalRamA - totalRamB
        }
      })
    }
  
    return purchasedServers
  }
  
  export async function main(ns) {
    ns.tprint(`[${localeHHMMSS()}] Starting player servers`)
  
    settings.maxGbRam = ns.getPurchasedServerMaxRam()
    settings.maxPlayerServers = ns.getPurchasedServerLimit()
    let hostname = ns.getHostname()
  
    if (hostname !== 'home') {
      throw new Exception('Run the script from home')
    }
  
    while (true) {
      let didChange = false
  
      const serverMap = getItem(settings.keys.serverMap)
      let purchasedServers = getPurchasedServers(ns)
  
      let action = purchasedServers.length < settings.maxPlayerServers ? settings.actions.BUY : settings.actions.UPGRADE
  
      if (action == settings.actions.BUY) {
        let smallestCurrentServer = purchasedServers.length ? ns.getServerMaxRam(purchasedServers[0]) : 0
        let targetRam = Math.max(settings.minGbRam, smallestCurrentServer)
  
        if (targetRam === settings.minGbRam) {
          while (ns.getServerMoneyAvailable('home') * settings.totalMoneyAllocation >= ns.getPurchasedServerCost(targetRam) * settings.maxPlayerServers) {
            targetRam *= 2
          }
  
          targetRam /= 2
        }
  
        targetRam = Math.max(settings.minGbRam, targetRam)
        targetRam = Math.min(targetRam, settings.maxGbRam)
  
        if (ns.getServerMoneyAvailable('home') * settings.totalMoneyAllocation >= ns.getPurchasedServerCost(targetRam)) {
          let hostname = `pserv-${targetRam}-${createUUID()}`
          hostname = ns.purchaseServer(hostname, targetRam)
  
          if (hostname) {
            ns.tprint(`[${localeHHMMSS()}] Bought new server: ${hostname} (${targetRam} GB)`)
  
            updateServer(ns, serverMap, hostname)
            didChange = true
          }
        }
      } else {
        let smallestCurrentServer = Math.max(ns.getServerMaxRam(purchasedServers[0]), settings.minGbRam)
        let biggestCurrentServer = ns.getServerMaxRam(purchasedServers[purchasedServers.length - 1])
        let targetRam = biggestCurrentServer
  
        if (smallestCurrentServer === settings.maxGbRam) {
          ns.tprint(`[${localeHHMMSS()}] All servers maxxed. Exiting.`)
          ns.exit()
          return
        }
  
        if (smallestCurrentServer === biggestCurrentServer) {
          while (ns.getServerMoneyAvailable('home') * settings.totalMoneyAllocation >= ns.getPurchasedServerCost(targetRam)) {
            targetRam *= 4
          }
  
          targetRam /= 4
        }
  
        targetRam = Math.min(targetRam, settings.maxGbRam)
  
        purchasedServers = getPurchasedServers(ns)
        if (targetRam > ns.getServerMaxRam(purchasedServers[0])) {
          didChange = true
          while (didChange) {
            didChange = false
            purchasedServers = getPurchasedServers(ns)
  
            if (targetRam > ns.getServerMaxRam(purchasedServers[0])) {
              if (ns.getServerMoneyAvailable('home') * settings.totalMoneyAllocation >= ns.getPurchasedServerCost(targetRam)) {
                let hostname = `pserv-${targetRam}-${createUUID()}`
  
                await ns.killall(purchasedServers[0])
                await ns.sleep(10)
                const serverDeleted = await ns.deleteServer(purchasedServers[0])
                if (serverDeleted) {
                  hostname = await ns.purchaseServer(hostname, targetRam)
  
                  if (hostname) {
                    ns.tprint(`[${localeHHMMSS()}] Upgraded: ${purchasedServers[0]} into server: ${hostname} (${targetRam} GB)`)
  
                    updateServer(ns, serverMap, hostname)
                    didChange = true
                  }
                }
              }
            }
          }
        }
      }
  
      if (!didChange) {
        await ns.sleep(5123)
      }
    }
  }