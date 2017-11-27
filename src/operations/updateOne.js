const queryObjectValidator = require('../queryObject');
const { updateBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async (queryObject, mergeObject, logQuery) => {
  const query = updateBuilder(queryObject, mergeObject);
  if (logQuery) {
    console.log(query);
  }
  const res = await resolver(
    query.statement + ' LIMIT 1',
    query.statementParams,
    queryObject,
    false,
  );
  return _.first(res);
};

module.exports = findOne;
