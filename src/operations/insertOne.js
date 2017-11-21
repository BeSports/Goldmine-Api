const { insertBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');
const ObjectID = require('bson').ObjectID;
const insertOne = async insertObject => {
  if (!_.has(insertObject, 'value._id')) {
    const id = new ObjectID().toHexString();
    _.set(insertObject, 'value._id', id);
  }
  const query = insertBuilder(insertObject);
  const res = await resolver(query, { class: 's' }, {}, true);
  return _.first(res);
};

module.exports = insertOne;