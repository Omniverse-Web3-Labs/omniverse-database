const log4js = require('log4js');
const defaultConfig = require('../../config/default.json').networks;

let configure = {
	appenders: {
		fileout: { type: 'file', filename: 'logs/main.log' },
		consoleout: { type: 'stdout' }
	},
	categories: {
		default: { appenders: ['consoleout'], level: 'off' },
		main: { appenders: ['fileout', 'consoleout'], level: 'all' }
	}
};

for (let chainName in defaultConfig) {
	chainName = chainName.toLowerCase();
	configure.appenders[chainName] = { type: 'file', filename: `logs/${chainName}.log` };
	configure.categories[chainName] = { appenders: ['consoleout', chainName], level: 'all' }
}

log4js.configure(configure);
// console.log(log4js.getLogger)

module.exports = log4js;