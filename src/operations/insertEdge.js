const { pureEdgesBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');

const insertEdge = async edgesObject => {
  const query = pureEdgesBuilder(edgesObject);
  console.log(query);
  const res = await resolver(query, { class: 's' }, {}, true);
  return _.first(res);
};

module.exports = insertEdge;