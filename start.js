/** @param {NS} ns **/

// Initiate scripts

export async function main(ns) {
  if (ns.getHostname() !== "home") {
    throw new Exception("Run the script from home");
  }

  await ns.wget(
    `https://raw.githubusercontent.com/digitalcraig/bitburner-scripts/master/src/init.js?ts=${new Date().getTime()}`,
    "init.js"
  );
  ns.spawn("init.js", 1);
}