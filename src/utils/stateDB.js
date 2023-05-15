/*
 * @Description: 
 * @Author: kay
 * @Date: 2023-05-15 15:00:09
 * @LastEditTime: 2023-05-15 15:00:16
 * @LastEditors: kay
 */
const fs = require('fs');

class stateDB {
    constructor() {
        this.state = {};
        this.path;
    }

    init(path) {
        this.path = path;
        try {
            fs.accessSync(path, fs.constants.F_OK);
            this.state = JSON.parse(fs.readFileSync(path));
        }
        catch (e) {
            logger.info('File not exist');
            this.state = {};
        }
    }

    getValue(key, value = null) {
        return this.state[key] ? this.state[key] : value;
    }

    setValue(key, value) {
        this.state[key] = value;
        fs.writeFileSync(this.path, JSON.stringify(this.state, null, '\t'));
    }
}

module.exports = new stateDB();