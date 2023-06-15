'use strict';

const { ApiPromise, WsProvider } = require('@polkadot/api');
const config = require('config');
const utils = require('../../utils/utils.js');
const logger = require('../../utils/logger.js');

class SubstrateHandler {
  constructor(chainName) {
    this.chainName = chainName;
    this.logger = logger.getLogger(chainName.toLowerCase());
  }

  async init() {
    this.logger.info(
      utils.format(
        'Init handler: {0}, compatible chain: {1}',
        this.chainName,
        'substrate'
      )
    );
    this.network = config.get('networks.' + this.chainName);
    this.omniverseChainId = config.get(
      'networks.' + this.chainName + '.omniverseChainId'
    );
    const wsProvider = new WsProvider(this.network.nodeAddress);
    this.api = await ApiPromise.create({ provider: wsProvider });
    this.tokenId = config.get('networks.' + this.chainName + '.tokenId');
    this.pallets = config.get('networks.' + this.chainName + '.pallets');
  }

  async getOmniverseEvent(blockHash, chainCount) {
    const apiAt = await this.api.at(blockHash);
    const blockNumber = (await apiAt.query.system.number()).toJSON();
    await apiAt.query.system.events((events) => {
      events.forEach(async (record) => {
        // Extract the phase, event and the event types
        const { event } = record;
        // Show what we are busy with
        this.pallets.forEach(async (palletName) => {
          if (event.section == palletName) {
            if (event.method == 'TransactionSent') {
              let pk = event.data[0].toHuman();
              let tokenId = event.data[1].toHuman();
              if (!this.tokenId.includes(tokenId)) {
                return;
              }
              let nonce = event.data[2].toHuman();
              let m = [pk, this.chainName, nonce, blockNumber, tokenId];
              this.logger.info(
                `pk: ${pk}, nonce: ${nonce}, chainName: ${this.chainName}, blockNumber: ${blockNumber}`
              );
              await Database.insert(m, chainCount, this.logger);
              StateDB.setValue(this.chainName, event.blockNumber + 1);
            } else if (event.method == 'TransactionExecuted') {
              this.logger.debug(
                'TransactionExecuted event',
                event.data.toJSON()
              );
            }
          }
        });
      });
    });
  }

  async processPastOmniverseEvent(startBlock, currentBlockNumber, chainCount) {
    for (; startBlock < currentBlockNumber; ++startBlock) {
      let hash = await this.api.rpc.chain.getBlockHash(startBlock);
      await this.getOmniverseEvent(hash, chainCount);
    }
  }

  async start(chainCount) {
    let fromBlock = StateDB.getValue(this.chainName);
    let currentBlock = await this.api.rpc.chain.getBlock();
    let currentBlockNumber = currentBlock.block.header.number.toJSON();
    if (fromBlock && currentBlockNumber - fromBlock < 256) {
      await this.processPastOmniverseEvent(
        fromBlock,
        currentBlockNumber,
        chainCount
      );
    }
    await this.api.rpc.chain.subscribeNewHeads(async (header) => {
      let hash = await this.api.rpc.chain.getBlockHash(
        header.number.toNumber()
      );
      await this.getOmniverseEvent(hash, chainCount);
    });
  }

  async update() {
    let currentBlock = await this.api.rpc.chain.getBlock();
    let currentBlockNumber = currentBlock.block.header.number.toJSON();
    StateDB.setValue(this.chainName, currentBlockNumber);
  }

  getProvider() {
    return this.api;
  }
}

module.exports = SubstrateHandler;
