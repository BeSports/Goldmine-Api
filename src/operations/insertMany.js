const { insertManyBuilder } = require('../builders/OrientDbQueryBuilder');
const resolver = require('../resolvers/OrientDbQueryResolver');
const _ = require('lodash');
const insertMany = async (db, insertObject, logQuery) => {
  const query = insertManyBuilder(insertObject);
  if (logQuery === true) {
    console.log(query);
  }
  const res = await resolver(db, query, { class: 's' }, {}, true, logQuery);
  return _.first(res);
};

module.exports = insertMany;
