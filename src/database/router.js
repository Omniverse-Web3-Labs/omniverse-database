/*
 * @Description: 
 * @Author: kay
 * @Date: 2023-05-15 18:08:22
 * @LastEditTime: 2023-05-16 10:26:35
 * @LastEditors: kay
 */
// const ethereum = require('./ethereum');
module.exports = function (app, database) {
  app.get('/ominverse', async function (req, res) {
    let chainName = req.query.chainName;
    let pk = req.query.pk;
    let rows = database.getValue(
      'SELECT * FROM pendingTransactions WHERE pk = ?',
      [pk]
    );
    res.send({ code: 0, message: rows });
  });
};