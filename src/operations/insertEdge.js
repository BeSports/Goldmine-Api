const { pureEdgesBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const insertEdge = async (db, edgesObject, logQuery) => {
  const query = pureEdgesBuilder(edgesObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query, { class: 's' }, {}, true, logQuery);
  return _.first(res);
};

module.exports = insertEdge;
