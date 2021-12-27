import { localeHHMMSS } from 'common.js'

const logDebug = false

export async function main(ns) {
  ns.tprint(`[${localeHHMMSS()}] Starting the hack`)

  let hostname = ns.getHostname()

  if (hostname !== 'home') {
    throw new Exception('Run the script from home')
  }

  const homeRam = ns.getServerMaxRam('home').shift() // returns total RAM

  if (homeRam >= 32) {
    ns.tprint(`[${localeHHMMSS()}] Spawning spider`)
    await ns.run('spider.js', 1, 'mainHack.ns')
    await ns.sleep(3000)
    ns.tprint(`[${localeHHMMSS()}] Spawning player servers`)
    ns.spawn('playerServers.js', 1)
  } else {
    ns.tprint(`[${localeHHMMSS()}] Spawning spider`)
    ns.spawn('spider.js', 1, '') 
  }
}