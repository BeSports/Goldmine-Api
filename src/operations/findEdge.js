const queryObjectValidator = require('../queryObject');
const { edgeFinder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const findEdge = async (db, queryObject, logQuery) => {
  const query = edgeFinder(queryObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query.statement, { class: 's' }, {}, false, logQuery);
  return res;
};

module.exports = findEdge;
