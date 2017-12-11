const queryObjectValidator = require('../queryObject');
const { deleteEdge } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const deleteOne = async (db, queryObject, logQuery) => {
  const query = deleteEdge(queryObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query.statement, query.statementParams, {}, false, logQuery);
  return res;
};

module.exports = deleteOne;
