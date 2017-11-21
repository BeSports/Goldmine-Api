const queryObjectValidator = require('../queryObject');
const { updateBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const update = async (queryObject, mergeObject) => {
  const query = updateBuilder(queryObject, mergeObject);
  const res = await resolver(query.statement, query.statementParams, queryObject, false);
  return _.first(res);
};

module.exports = update;
