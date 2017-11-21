const queryObjectValidator = require('../queryObject');
const { deleteBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const deleteOne = async (queryObject) => {
  const error = queryObjectValidator.validator(queryObject);
  if (!error) {
    const query = deleteBuilder(queryObject);
    const res = await resolver(query.statement + ' LIMIT 1', query.statementParams, {}, false);
    return res;
  } else {
    console.error('deleteOne', error);
    return false;
  }
};

module.exports = deleteOne;
