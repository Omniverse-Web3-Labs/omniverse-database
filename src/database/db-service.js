const express = require('express');
const compression = require('compression');
//操作日期的插件
const moment = require('moment');
const cookieParser = require('cookie-parser');

async function dbService() {
  var app = express();
  app.use(compression());
  app.use(cookieParser());

  // 自动将body请求数据格式转成json
  // parse application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: false }));
  // parse application/json
  app.use(express.text());
  app.use(express.json());

  app.use(function (req, res, next) {
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });
  require('./router')(app);
  var port = 8866;
  //监听端口
  app.listen(port);

  MainLogger.info(
    '%s | omniverse database server initializing | listening on port %s | process id %s',
    moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
    port,
    process.pid
  );
}

module.exports = dbService;
