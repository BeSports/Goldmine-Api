const queryObjectValidator = require('../queryObject');
const { deleteBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const deleteOne = async (db, queryObject, logQuery) => {
  const query = deleteBuilder(queryObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(
    db,
    query.statement + ' LIMIT 1',
    query.statementParams,
    {},
    false,
    logQuery,
  );
  return res;
};

module.exports = deleteOne;
