const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');

const find = async queryObject => {
  const query = selectBuilder(queryObject);
  const res = await resolver(query.statement, query.statementParams, queryObject, true);
  return res;
};

module.exports = find;
