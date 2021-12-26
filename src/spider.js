/** @param {NS} ns **/
import { hackPrograms, settings, setItem, localeHHMMSS, getPlayerDetails, allHacks } from 'common.js'

export async function main(ns) {
  ns.tprint(`[${localeHHMMSS()}] Starting spider`)

  const scriptToRunAfter = ns.args[0]

  let hostname = ns.getHostname()

  if (hostname !== 'home') {
    throw new Exception('Run the script from home')
  }

  const serverMap = { servers: {}, lastUpdate: new Date().getTime() }
  const scanArray = ['home']

  while (scanArray.length) {
    const host = scanArray.shift()

    ns.tprint(`[${localeHHMMSS()}] Getting details of ` + host)

    serverMap.servers[host] = {
      host,
      ports: ns.getServerNumPortsRequired(host),
      hackingLevel: ns.getServerRequiredHackingLevel(host),
      maxMoney: ns.getServerMaxMoney(host),
      growth: ns.getServerGrowth(host),
      weakenTime: ns.getWeakenTime(host) / 1000,
      growTime: ns.getGrowTime(host) / 1000,
      hackTime: ns.getHackTime(host) / 1000,
      minSecurityLevel: ns.getServerMinSecurityLevel(host),
      baseSecurityLevel: ns.getServerBaseSecurityLevel(host),
      ram: ns.getServerRam(host)[0],
      files: ns.ls(host),
    }

    const playerDetails = getPlayerDetails(ns)

    if (!ns.hasRootAccess(host)) {
      if (serverMap.servers[host].ports <= playerDetails.portHacks && serverMap.servers[host].hackingLevel <= playerDetails.hackingLevel) {
        hackPrograms.forEach((hackProgram) => {
          if (ns.fileExists(hackProgram, 'home')) {
            ns.tprint(`[${localeHHMMSS()}] Executing hack ` + hackProgram + ' against ' + host)
            ns[hackProgram.split('.').shift().toLocaleLowerCase()](host)
          }
        })
        ns.tprint(`[${localeHHMMSS()}] Executing nuke against ` + host)
        ns.nuke(host)
      }
    }

    // Save host's connections into server map
    ns.tprint(`[${localeHHMMSS()}] Mapping ` + host + ` connections.`)
    const connections = ns.scan(host) || ['home']
    serverMap.servers[host].connections = connections

    connections.filter((hostname) => !serverMap.servers[hostname]).forEach((hostname) => scanArray.push(hostname))
  }

  let hasAllParents = false

  ns.tprint(`[${localeHHMMSS()}] Checking parent connections`)
  while (!hasAllParents) {
    hasAllParents = true

    Object.keys(serverMap.servers).forEach((hostname) => {
      const server = serverMap.servers[hostname]

      if (!server.parent) hasAllParents = false

      if (hostname === 'home') {
        server.parent = 'home'
        server.children = server.children ? server.children : []
      }

      if (hostname.includes('pserv-')) {
        server.parent = 'home'
        server.children = []

        if (serverMap.servers[server.parent].children) {
          serverMap.servers[server.parent].children.push(hostname)
        } else {
          serverMap.servers[server.parent].children = [hostname]
        }
      }

      if (!server.parent) {
        if (server.connections.length === 1) {
          server.parent = server.connections[0]
          server.children = []

          if (serverMap.servers[server.parent].children) {
            serverMap.servers[server.parent].children.push(hostname)
          } else {
            serverMap.servers[server.parent].children = [hostname]
          }
        } else {
          if (!server.children) {
            server.children = []
          }

          if (server.children.length) {
            const parent = server.connections.filter((hostname) => !server.children.includes(hostname))

            if (parent.length === 1) {
              server.parent = parent.shift()

              if (serverMap.servers[server.parent].children) {
                serverMap.servers[server.parent].children.push(hostname)
              } else {
                serverMap.servers[server.parent].children = [hostname]
              }
            }
          }
        }
      }
    })
  }

  ns.tprint(`[${localeHHMMSS()}] Saving server map`)
  setItem(settings().keys.serverMap, serverMap)

  if (!scriptToRunAfter) {
    ns.tprint(`[${localeHHMMSS()}] Spawning hackingcontroller.js`)
    ns.spawn('hackingcontroller.js', 1)
  } else {
    ns.tprint(`[${localeHHMMSS()}] Spawning ${scriptToRunAfter}`)
    ns.spawn(scriptToRunAfter, 1)
  }
}
