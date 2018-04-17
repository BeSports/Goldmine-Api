const queryObjectValidator = require('../queryObject');
const { updateBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async (db, queryObject, mergeObject, logQuery) => {
  const query = updateBuilder(queryObject, mergeObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(
    db,
    query.statement + ' LIMIT 1;',
    query.statementParams,
    queryObject,
    false,
    logQuery,
  );
  return _.first(res);
};

module.exports = findOne;
