const { insertBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');
const ObjectID = require('bson').ObjectID;
const insertOne = async (db, insertObject, logQuery) => {
  if (!_.has(insertObject, 'value._id')) {
    const id = new ObjectID().toHexString();
    _.set(insertObject, 'value._id', id);
  }
  const query = insertBuilder(insertObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query, { class: 's' }, {}, true, logQuery);
  return _.first(res);
};

module.exports = insertOne;
