import { localeHHMMSS } from 'common.js'

export async function main(ns) {
    ns.tprint(`[${localeHHMMSS()}] Buying servers`)

    // How much RAM each purchased server will have. 
    var ram = 16;

    // Iterator we'll use for our loop
    var i = 0;

    // Continuously try to purchase servers until we've reached the maximum
    // amount of servers
    while ((i < getPurchasedServerLimit()) && (getServerMoneyAvailable("home") > getPurchasedServerCost(ram))) {
        // Check if we have enough money to purchase a server
        if (getServerMoneyAvailable("home") > getPurchasedServerCost(ram)) {
            // If we have enough money, then purchase the server
            var hostname = purchaseServer("pserv-" + i, ram);
            ++i;
        }
    }

    ns.tprint(`[${localeHHMMSS()}] Attempting to buy servers`)

    if (!scriptToRunAfter) {
        ns.tprint(`[${localeHHMMSS()}] Spawning hackingcontroller.js`)
        ns.spawn('hackingcontroller.js', 1)
    } else {
        ns.tprint(`[${localeHHMMSS()}] Spawning ${scriptToRunAfter}`)
        ns.spawn(scriptToRunAfter, 1)
    }
}
