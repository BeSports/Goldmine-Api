const queryObjectValidator = require('../queryObject');
const { edgeFinder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findEdge = async (db, queryObject, logQuery) => {
  const query = edgeFinder(queryObject);
  if (logQuery) {
    console.log(query);
  }
  const res = await resolver(db, query.statement, query.statementParams, {}, false);
  return res;
};

module.exports = findEdge;
