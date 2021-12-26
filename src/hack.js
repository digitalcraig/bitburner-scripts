/** @param {NS} ns **/

export function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime()
  }

  return new Date(ms).toLocaleTimeString()
}

export async function main(ns) {
    const target = ns.args[0]
    const threads = ns.args[1]
    const delay = ns.args[2] * 1000
  
    if (delay && delay > 0) {
      await ns.sleep(delay)
    }
  
    ns.tprint(`[${localeHHMMSS()}] Starting operation: hack on ${target} in ${threads} threads`)
    await ns.hack(target, { threads, stock: true })
    ns.exit()
  }