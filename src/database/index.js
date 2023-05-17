const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const dbService = require('./db-service');

class Db {
  constructor() {
    this.database = {};
    this.path;
  }

  async init(path) {
    try {
      this.database = await sqlite.open({
        filename: path,
        driver: sqlite3.Database,
      });
      // check the table
      let pendingTable = await this.database.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='pendingTransactions'"
      );
      if (pendingTable) {
        MainLogger.info('Pending transactions table exists ...');
      } else {
        await this.database.run(
          `
                CREATE TABLE IF NOT EXISTS pendingTransactions (
                    pk text NOT NULL,
                    nonce int(128) NOT NULL,
                    chains text NOT NULL
              )`
        );
        await Promise.all([
          this.database.run(
            'CREATE INDEX pk_index ON pendingTransactions (pk)'
          ),
          this.database.run(
            'CREATE INDEX nonce_index ON pendingTransactions (nonce)'
          ),
        ]);
      }

      let settlementTable = await this.database.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='settlementTransactions'"
      );
      if (settlementTable) {
        MainLogger.info('Settlement transactions table exists ...');
      } else {
        await this.database.run(
          `
                CREATE TABLE IF NOT EXISTS settlementTransactions (
                    pk text NOT NULL,
                    nonce int(128) NOT NULL,
                    chains text NOT NULL
              )`
        );
        await Promise.all([
          this.database.run(
            'CREATE INDEX st_pk_index ON settlementTransactions (pk)'
          ),
          this.database.run(
            'CREATE INDEX st_nonce_index ON pendingTransactions (nonce)'
          ),
        ]);
      }
    } catch (err) {
      MainLogger.error('Failed to initialize the database: ', err.message);
    }
    // return;

    await dbService();
  }

  async getValue(sql, statement) {
    return this.database.all(sql, statement);
  }

  async insert(value, chainCount, logger) {
    let [pk, chainName, nonce, blockNumber] = value;
    logger = logger ? logger : MainLogger;
    let settled = await this.database.get(
      'SELECT * FROM settlementTransactions WHERE pk = ? AND nonce = ?',
      [pk, nonce]
    );
    if (settled) {
      logger.warn('pk: %s, nonce: %s already settlement', pk, nonce);
      return;
    }

    let pending = await this.database.get(
      'SELECT * FROM pendingTransactions WHERE pk = ? AND nonce = ?',
      [pk, nonce]
    );

    if (pending) {
      let parsedData = JSON.parse(pending.chains);
      let chains = new Map(parsedData);
      if (chains.has(value[1])) {
        logger.warn('pk: %s, nonce: %s already pending', pk, nonce);
      } else {
        chains.set(value[1], value[3]);
        let chainsData = JSON.stringify(Array.from(chains.entries()));
        if (chains.size == chainCount) {
          await Promise.all([
            this.database.run(
              'INSERT INTO settlementTransactions (pk, nonce, chains) VALUES (?, ?, ?)',
              [pk, nonce, chainsData]
            ),
            this.database.run(
              'DELETE FROM pendingTransactions WHERE pk = ? AND nonce = ?',
              [pk, nonce]
            ),
          ]);
          logger.info("settlemennt successfully ...");
        } else {
          await this.database.run(
            'INSERT INTO pendingTransactions (pk, nonce, chains) VALUES (?, ?, ?)',
            [pk, nonce, chainsData]
          );
        }
      }
    } else {
      let chains = new Map();
      chains.set(chainName, blockNumber);
      await this.database.run(
        'INSERT INTO pendingTransactions (pk, nonce, chains) VALUES (?, ?, ?)',
        [pk, nonce, JSON.stringify(Array.from(chains.entries()))]
      );
    }
    logger.info("Insert successfully ...");
  }
}

module.exports = Db;
