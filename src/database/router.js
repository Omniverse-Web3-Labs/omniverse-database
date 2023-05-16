module.exports = async function (app) {
  app.get('/ominverse', async function (req, res) {
    try {
      console.log(req.query);
      let chainName = req.query.chainName;
      let pk = req.query.pk;
      console.log(Database)
      console.log(pk, chainName);
      let rows = await Database.getValue(
        'SELECT * FROM pendingTransactions WHERE pk = ?',
        [pk]
      );
      let result = [];
      console.log('rows', rows)
      for (let row of rows) {
        let parsedChains = JSON.parse(row.chains);
        console.log(parsedChains);
        let chains = new Map(parsedChains);
        if (!chains.has(chainName)) {
          result.push({
            pk: row.pk,
            nonce: row.nonce,
            chains: parsedChains,
          });
        }
      }
      res.send({ code: 0, message: result });
    } catch (err) {
      res.send({ code: -1, message: err.message });
    }
  });
};
