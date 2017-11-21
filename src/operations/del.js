const queryObjectValidator = require('../queryObject');
const { deleteBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async queryObject => {
  const query = deleteBuilder(queryObject);
  const res = await resolver(query.statement, query.statementParams, queryObject, false);
  return _.first(res);
};

module.exports = findOne;
