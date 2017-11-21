const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async queryObject => {
  const query = selectBuilder(queryObject);
  const res = await resolver(
    query.statement + ' LIMIT 1',
    query.statementParams,
    queryObject,
    true,
  );
  return _.first(res);
};

module.exports = findOne;
