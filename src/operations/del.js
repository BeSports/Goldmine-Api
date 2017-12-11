const queryObjectValidator = require('../queryObject');
const { deleteBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async (db, queryObject, logQuery) => {
  const query = deleteBuilder(queryObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query.statement, query.statementParams, queryObject, false, logQuery);
  return _.first(res);
};

module.exports = findOne;
