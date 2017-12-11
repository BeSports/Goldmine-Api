const queryObjectValidator = require('../queryObject');
const { updateEdgeBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const updateEdge = async (db, queryObject, mergeObject, logQuery) => {
  const query = updateEdgeBuilder(queryObject, mergeObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query.statement, query.statementParams, {}, false, logQuery);
  return res;
};

module.exports = updateEdge;
