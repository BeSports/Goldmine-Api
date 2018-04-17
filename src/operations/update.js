const queryObjectValidator = require('../queryObject');
const { updateBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const update = async (db, queryObject, mergeObject, logQuery) => {
  const query = updateBuilder(queryObject, mergeObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query.statement + ';', query.statementParams, queryObject, false, logQuery);
  return res;
};

module.exports = update;
