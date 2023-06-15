module.exports = async function (app) {
  app.get('/omniverse/v1/pending', async function (req, res) {
    try {
      let chainName = req.query.chainName;
      let pk = req.query.pk;
      let rows;
      if (pk) {
        rows = await Database.getValue(
          'SELECT * FROM pendingTransactions WHERE pk = ?',
          [pk]
        );
      } else {
        rows = await Database.getValue('SELECT * FROM pendingTransactions');
      }
      let result = [];
      for (let row of rows) {
        let parsedChains = JSON.parse(row.chains);
        let chains = new Map(parsedChains);
        if (!chains.has(chainName)) {
          let obj = {
            tokenId: row.tokenId,
            pk: row.pk,
            nonce: row.nonce,
            chains: parsedChains,
          };
          result.push(obj);
        }
      }
      res.send({ code: 0, message: result });
    } catch (err) {
      res.send({ code: -1, message: err.message });
    }
  });
  app.get('/omniverse/v1/settlement', async function (req, res) {
    try {
      let pk = req.query.pk;
      let rows;
      if (pk) {
        rows = await Database.getValue(
          'SELECT * FROM settlementTransactions WHERE pk = ?',
          [pk]
        );
      } else {
        rows = await Database.getValue('SELECT * FROM settlementTransactions');
      }
      let result = [];
      for (let row of rows) {
        let parsedChains = JSON.parse(row.chains);
        result.push({
          tokenId: row.tokenId,
          pk: row.pk,
          nonce: row.nonce,
          chains: parsedChains,
        });
      }
      res.send({ code: 0, message: result });
    } catch (err) {
      res.send({ code: -1, message: err.message });
    }
  });
};
