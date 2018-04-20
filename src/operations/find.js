const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');

const find = async (db, queryObject, logQuery) => {
  const query = selectBuilder(queryObject);
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
  return res;
};

module.exports = find;
