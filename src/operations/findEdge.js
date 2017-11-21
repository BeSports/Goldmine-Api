const queryObjectValidator = require('../queryObject');
const { edgeFinder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findEdge = async queryObject => {
  const query = edgeFinder(queryObject);
  const res = await resolver(
    query.statement,
    query.statementParams,
    {},
    false,
  );
  return res;
};

module.exports = findEdge;
