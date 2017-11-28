const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async (db, queryObject, logQuery) => {
  const query = selectBuilder(queryObject);
  if (logQuery) {
    console.log(query);
  }
  const res = await resolver(
    db,
    query.statement + ' LIMIT 1',
    query.statementParams,
    queryObject,
    true,
  );
  return _.first(res);
};

module.exports = findOne;
