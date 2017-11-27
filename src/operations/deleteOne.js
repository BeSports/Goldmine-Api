const queryObjectValidator = require('../queryObject');
const { deleteBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const deleteOne = async (queryObject, logQuery) => {
  const query = deleteBuilder(queryObject);
  if (logQuery) {
    console.log(query);
  }
  const res = await resolver(query.statement + ' LIMIT 1', query.statementParams, {}, false);
  return res;
};

module.exports = deleteOne;
