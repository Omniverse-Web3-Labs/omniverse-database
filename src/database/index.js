const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbService = require('./db-service');
// console.log(__dirname);
// const fs = require('fs');

class Database {
  constructor() {
    this.database = {};
    this.path;
  }

  init(path) {
    this.path = path;
    this.database = new sqlite3.Database(path);
    // check the table
    this.database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pendingTransactions'",
      (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        if (row) {
          console.log('Table exists!');
        } else {
          this.database.run(
            `
                    CREATE TABLE IF NOT EXISTS pendingTransactions (
                        pk varchar(64) NOT NULL,
                        chainName varchar(256) NOT NULL,
                        nonce int(128) NOT NULL,
                        blockNumber int(64) NOT NULL
                  )`,
            (err) => {
              if (err) {
                return console.error(err);
              }
              console.log('Table created successfully!');
            }
          );
          this.database.serialize(() => {
            this.database.run('CREATE INDEX pk_index ON pendingTransactions (pk)');
            this.database.run('CREATE INDEX chainName_index ON pendingTransactions (chainName)');
            this.database.run('CREATE INDEX nonce_index ON pendingTransactions (nonce)');
            this.database.run('CREATE INDEX blockNumber_index ON pendingTransactions (blockNumber)');
          });
        }
      }
    );
    
    this.database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='settlementTransactions'",
      (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        if (row) {
          console.log('Table exists!');
        } else {
          this.database.run(
            `
                    CREATE TABLE IF NOT EXISTS pendingTransactions (
                        pk varchar(64) NOT NULL,
                        chainName varchar(256) NOT NULL,
                        nonce int(128) NOT NULL,
                        blockNumber int(64) NOT NULL
                  )`,
            (err) => {
              if (err) {
                return console.error(err);
              }
              console.log('settlement transactions table created successfully!');
            }
          );
          this.database.serialize(() => {
            this.database.run('CREATE INDEX pk_index ON settlementTransactions (pk)');
            this.database.run('CREATE INDEX chainName_index ON settlementTransactions (chainName)');
            this.database.run('CREATE INDEX nonce_index ON settlementTransactions (nonce)');
            this.database.run('CREATE INDEX blockNumber_index ON settlementTransactions (blockNumber)');
          });
        }
      }
    );

    dbService(this.database);
  }

  getValue(sql, statement) {
    let result;
    this.database.all(sql, statement, (err, rows) => {
      if (err) {
        console.log(err.message);
      } else {
        result = rows;
      }
    });
    return result;
  }

  setValue(value, chainCount) {
    // this.state[key] = value;
    this.database.run('INSERT INTO pendingTransaction (pk, chainName, nonce, blockNumber) VALUES (?, ?, ?, ?)', message, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Data inserted successfully.');
      }
    });
    // add.finalize();
    this.database.all('SELECT * FROM pendingTransactions WHERE pk = ? AND nonce = ?', [value[0], value[3]], (err, rows) => {
      if (err) {
        console.log(err.message);
      } else {

        // move database from penddingTransactons table to settlementTransactions table
        if (rows.length == chainCount) {
          // insert to settlementTransactions table
          let stmt = this.database.prepare('INSERT INTO settlementTransactions (pk, chainName, nonce, blockNumber) VALUES (?, ?, ?, ?)');
          for (let row of rows) {
            stmt.run(row, (err) => {
              if (err) {
                console.error(err.message);
              }
            });
          }
          stmt.finalize();

          // remove from pendingTransactions table
          stmt = this.database.prepare('DELETE FROM pendingTransactions WHERE WHERE pk = ? AND nonce = ?');
          stmt.run([value[0], value[3]], (err) => {
            if (err) {
              console.error(err.message);
            }
          });
          stmt.finalize();
        }
      }
    });
    // fs.writeFileSync(this.path, JSON.stringify(this.state, null, '\t'));
  }
}

module.exports = new Database();