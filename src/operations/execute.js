const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');

const execute = async (db, query, params) => {
  const res = await resolver(db, query, params, {}, false);
  return res;
};

module.exports = execute;
