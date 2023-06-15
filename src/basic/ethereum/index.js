'use strict';

const Web3 = require('web3');
const config = require('config');
const ethereum = require('./ethereum.js');
const fs = require('fs');
const utils = require('../../utils/utils.js');
const logger = require('../../utils/logger.js');

const OMNIVERSE_TOKEN_TRANSFER = 'OmniverseTokenTransfer';

class EthereumHandler {
  constructor(chainName) {
    this.chainName = chainName;
    this.logger = logger.getLogger(chainName.toLowerCase());
  }

  async init() {
    this.logger.info(
      utils.format(
        'Init handler: {0}, compatible chain: {1}',
        this.chainName,
        'ethereum'
      )
    );
    // Enable auto reconnection
    const options = {
      reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 10,
        onTimeout: false,
      },
    };
    this.messageBlockHeights = [];
    let provider = new Web3.providers.WebsocketProvider(
      config.get('networks.' + this.chainName + '.nodeAddress'),
      options
    );
    this.web3 = new Web3(provider);
    this.web3.eth.handleRevert = true;
    // omniverseContract
    let omniverseContractAddress = config.get(
      'networks.' + this.chainName + '.omniverseContractAddress'
    );
    let omniverseContractRawData = fs.readFileSync(
      config.get('networks.' + this.chainName + '.omniverseContractAbiPath')
    );
    this.omniverseContractContract = {};
    let omniverseContractAbi = JSON.parse(omniverseContractRawData).abi;
    for (let tokenId in omniverseContractAddress) {
      let contract = new this.web3.eth.Contract(
        omniverseContractAbi,
        omniverseContractAddress[tokenId]
      );
      this.omniverseContractContract[tokenId] = contract;
    }
    this.chainId = config.get('networks.' + this.chainName + '.chainId');
    this.omniverseChainId = config.get(
      'networks.' + this.chainName + '.omniverseChainId'
    );
    this.payloadCfg = config.get('payload');
    this.messages = [];

    for (let i = 0; i < omniverseContractAbi.length; i++) {
      if (
        omniverseContractAbi[i].type == 'event' &&
        omniverseContractAbi[i].name == OMNIVERSE_TOKEN_TRANSFER
      ) {
        this.eventOmniverseTokenTransfer = omniverseContractAbi[i];
        this.eventOmniverseTokenTransfer.signature =
          this.web3.eth.abi.encodeEventSignature(
            this.eventOmniverseTokenTransfer
          );
      }
    }
  }

  async update() {
    let blockNumber = await this.web3.eth.getBlockNumber();
    StateDB.setValue(this.chainName, blockNumber);
  }

  async start(chainCount) {
    let fromBlock = StateDB.getValue(this.chainName);
    let blockNumber = await this.web3.eth.getBlockNumber();
    if (!fromBlock) {
      fromBlock = 'latest';
    } else {
      if (blockNumber - fromBlock > 5000) {
        this.logger.info('Exceed max log range, subscribe from the latest');
        fromBlock = 'latest';
      }
    }
    this.logger.info(this.chainName, 'Block height', fromBlock);
    if (!fromBlock) {
      fromBlock = 'latest';
    } else {
      if (blockNumber - fromBlock > 5000) {
        this.logger.info('Exceed max log range, subscribe from the latest');
        fromBlock = 'latest';
      }
    }
    this.logger.info(this.chainName, 'Block height', fromBlock);
    for (let tokenId in this.omniverseContractContract) {
      let contract = this.omniverseContractContract[tokenId];
      contract.events
        .TransactionSent({
          fromBlock: fromBlock,
        })
        .on('connected', (subscriptionId) => {
          this.logger.info('TransactionSent connected', subscriptionId);
        })
        .on('data', async (event) => {
          this.logger.debug('TransactionSent event', event);
          // to be continued, decoding is needed here for omniverse
          let message = await ethereum.contractCall(
            contract,
            'transactionCache',
            [event.returnValues.pk]
          );
          if (
            message.timestamp != 0 &&
            event.returnValues.nonce == message.txData.nonce
          ) {
            this.logger.warn('Got cached transaction', this.chainName);
          } else {
            let messageCount = await ethereum.contractCall(
              contract,
              'getTransactionCount',
              [event.returnValues.pk]
            );
            if (messageCount > event.returnValues.nonce) {
              message = await ethereum.contractCall(
                contract,
                'getTransactionData',
                [event.returnValues.pk, event.returnValues.nonce]
              );
            } else {
              this.logger.warn('No transaction got', this.chainName);
              return;
            }
          }
          let m = [
            message.txData.from,
            this.chainName,
            message.txData.nonce,
            event.blockNumber,
            tokenId,
          ];

          this.logger.info(
            `pk: ${message.txData.from}, nonce: ${message.txData.nonce}, chainName: ${this.chainName}, blockNumber: ${event.blockNumber}`
          );
          await Database.insert(m, chainCount, this.logger);
          StateDB.setValue(this.chainName, event.blockNumber + 1);
        })
        .on('changed', (event) => {
          // remove event from local database
          this.logger.info('TransactionSent changed');
          this.logger.debug(event);
        })
        .on('error', (error, receipt) => {
          // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
          this.logger.error('TransactionSent error', this.chainName, error);
          this.logger.info('TransactionSent receipt', receipt);
        });
    }
  }

  getProvider() {
    return this.web3;
  }
}

module.exports = EthereumHandler;
