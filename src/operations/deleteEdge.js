const queryObjectValidator = require('../queryObject');
const { deleteEdge } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const deleteOne = async queryObject => {
  const query = deleteEdge(queryObject);
  const res = await resolver(query.statement, query.statementParams, {}, false);
  return res;
};

module.exports = deleteOne;
