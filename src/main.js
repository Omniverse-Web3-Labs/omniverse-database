const chainHandlerMgr = require('./basic/chainHandlerMgr');
const Db = require('./database');
global.Database = new Db();
global.config = require('config');
global.logger = require('./utils/logger');
global.MainLogger = require('./utils/logger').getLogger('main');
global.utils = require('./utils/utils');
global.StateDB = require('./utils/stateDB');

async function init() {
  await chainHandlerMgr.init();
  await Database.init(config.get('database'));
  StateDB.init(config.get('stateDB'));
}

async function main() {
  MainLogger.info("Launch omniverse database ...");
  await init();
  await chainHandlerMgr.run();
  while (true) {
    await chainHandlerMgr.loop();
    MainLogger.info(utils.format('Waiting for {0} seconds...', config.get('scanInterval')));
    await utils.sleep(config.get('scanInterval'));
  }
}

main();