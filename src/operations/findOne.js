const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findOne = async (db, queryObject, logQuery) => {
  const query = selectBuilder(_.merge(queryObject, { limit: 1 }));
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(
    db,
    query.statement,
    query.statementParams,
    queryObject,
    true,
    logQuery,
  );
  return _.first(res);
};

module.exports = findOne;
