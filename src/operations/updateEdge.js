const queryObjectValidator = require('../queryObject');
const { updateEdgeBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const updateEdge = async (queryObject, mergeObject) => {
  const query = updateEdgeBuilder(queryObject, mergeObject);
  const res =  await resolver(query.statement, query.statementParams, {}, false);
  return res;
};

module.exports = updateEdge;
