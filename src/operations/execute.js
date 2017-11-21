const queryObjectValidator = require('../queryObject');
const { selectBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');

const execute = async (query, params) => {
  const res = await resolver(query, params, {}, false);
  return res;
};

module.exports = execute;
