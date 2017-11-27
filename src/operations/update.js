const queryObjectValidator = require('../queryObject');
const { updateBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const update = async (queryObject, mergeObject, logQuery) => {
  const query = updateBuilder(queryObject, mergeObject);
  if (logQuery) {
    console.log(query);
  }
  const res = await resolver(query.statement, query.statementParams, queryObject, false);
  return _.first(res);
};

module.exports = update;
