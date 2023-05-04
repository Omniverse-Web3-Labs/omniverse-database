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
