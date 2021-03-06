const OrientDB = require('orientjs');
const _ = require('lodash');

const findOne = require('./operations/findOne');
const findEdge = require('./operations/findEdge');
const find = require('./operations/find');
const updateOne = require('./operations/updateOne');
const update = require('./operations/update');
const deleteOne = require('./operations/deleteOne');
const deleteEdge = require('./operations/deleteEdge');
const del = require('./operations/del');
const insertOne = require('./operations/insertOne');
const insertMany = require('./operations/insertMany');
const insertEdges = require('./operations/insertEdge');
const updateEdge = require('./operations/updateEdge');
const execute = require('./operations/execute');

const connect = (dbConfig, cb) => {
  global.logging = dbConfig.logging;
  const server = OrientDB({
    username: dbConfig.username,
    password: dbConfig.password,
    servers: dbConfig.servers,
    host: dbConfig.host || _.first(dbConfig.servers).host,
    pool: {
      max: 4,
    },
  });
  global.server = server;

  server.transport.pool.on('event', error => {
    if (global.logging) {
      console.log('GOLDMINE API: socket event %s', error.code);
    }
  });

  const db = server.use({
    name: dbConfig.databaseName,
    username: dbConfig.username,
    password: dbConfig.password,
  });

  db.on('endQuery', obj => {
    if (global.logging === 'all') {
      console.log(`
        ${obj.perf.query > 500 && 'LONG QUERY!'}
        Duration: ${obj.perf.query}ms
        Query: ${obj.input.query}
        Params: ${obj.input.params}
      `);
    } else if (global.logging && obj.perf.query > 500) {
      console.log(`
        Reason: long query
        Duration: ${obj.perf.query}ms
        Query: ${obj.input.query}
        Params: ${obj.input.params}
      `);
    }
  });
  if (dbConfig.fast === true) {
    db.alwaysFast = true;
  }

  db.findOne = findOne.bind(null, db);
  db.find = find.bind(null, db);
  db.findEdge = findEdge.bind(null, db);
  db.updateOne = updateOne.bind(null, db);
  db.updateEdge = updateEdge.bind(null, db);
  db.update = update.bind(null, db);
  db.deleteOne = deleteOne.bind(null, db);
  db.delete = del.bind(null, db);
  db.deleteEdge = deleteEdge.bind(null, db);
  db.insertOne = insertOne.bind(null, db);
  db.insertMany = insertMany.bind(null, db);
  db.insertEdges = insertEdges.bind(null, db);
  db.execute = execute.bind(null, db);

  // ---------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------

  // Keeps connection open with OrientDB.

  setInterval(() => {
    db.query('SELECT _id FROM V LIMIT 1').catch(() => {
      console.error("GOLDMINE API: Couldn't keep database connection alive!");
    });
  }, 60 * 1000);

  // ---------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------

  cb(db);
};

module.exports = { connect };
