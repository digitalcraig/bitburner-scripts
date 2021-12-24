# Bitburner scripts

Welcome to my collection of [Bitburner](https://danielyxie.github.io/bitburner/) scripts. They are written using the in-game language of NetscriptJS, which is a mutation of Javascript. The approach is inspired by [Mori](https://github.com/moriakaice/bitburner).

If you want to play the game itself - click on the name above.

## Disclaimer

I've made no attempt to make these scripts work for anyone else or be generally useful. They are likely to be broken or not be fit for any purpose at any time. They may evolve as my knowledge and experience grows or be abandoned because I got bored.

## Installation

1. Create a new script called `start.js` by issuing the following command: `nano start.js`. Make sure you're on your home server if you're not (you can quickly go home by running `home` in the console).
2. Paste the following content:

```javascript
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
  ns.spawn("initHacking.ns", 1);
}
```

3. Exit the nano and write in console: `run start.ns`
