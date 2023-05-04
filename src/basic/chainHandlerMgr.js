'use strict';
const config = require('config');

class chainHandlerMgr {
    constructor() {
        this.chainHandlers = {};
        /* After a message is initiated, and transported across all the Omniverse DLT,
        we must trace the executing result on each chain
        */
        this.messageObserver = {};
    }

    async init() {
        MainLogger.info("Init chainHandlerMgr");
        let networks = config.get('networks');
        for (let i in networks) {
            let network = networks[i];
            let handler = require('./' + network['compatibleChain'] + '/index');
            let inst = new handler(i);
            this.chainHandlers[network.omniverseChainId] = inst;
            await inst.init();
        }
    }

    getHandlerByName(name_) {
        if (this.chainHandlers[name_] == null) {
            let stack = new Error().stack;
            MainLogger.error(utils.format('Chain handler {0} can not be found, {1}', name_, stack));
        }
        return this.chainHandlers[name_];
    }

    async run() {
        const chainCount = this.chainHandlers.length;
        for (let i in this.chainHandlers) {
            await this.chainHandlers[i].start(this, chainCount);
        }
    }

    async loop() {
        await this.update();
    }

    async update() {
        let updateRequest = [];
        for (let i in this.chainHandlers) {
            updateRequest.push(this.chainHandlers[i].update());
        }
        await Promise.all(updateRequest);
    }
}

let mgr = new chainHandlerMgr();
module.exports = mgr;