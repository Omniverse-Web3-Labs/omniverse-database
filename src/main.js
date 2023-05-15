const chainHandlerMgr = require('./basic/chainHandlerMgr');
global.config = require('config');
global.logger = require('./utils/logger');
global.MainLogger = require('./utils/logger').getLogger('main');
global.utils = require('./utils/utils');
global.Database = require('./database');
global.StateDB = require('./utils/stateDB');

async function init() {
  // await chainHandlerMgr.init();
  Database.init(config.get('database'));
  StateDB.init(config.get('stateDB'));
}

async function main() {
  // var lg = global.logger.
  // console.log(logger.)
  // console.log(logger.getLogger('GOERLI'))
  // let logger = logger.getLogger('')
  MainLogger.info("Launch omniverse database ...");
  await init();
  // await chainHandlerMgr.run();
  while (true) {
    await chainHandlerMgr.loop();
    logger.info(utils.format('Waiting for {0} seconds...', config.get('scanInterval')));
    await utils.sleep(config.get('scanInterval'));
  }
}

main();