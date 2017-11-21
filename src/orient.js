const OrientDB = require('orientjs');

const findOne = require('./operations/findOne');
const findEdge = require('./operations/findEdge');
const find = require('./operations/find');
const updateOne = require('./operations/updateOne');
const update = require('./operations/update');
const deleteOne = require('./operations/deleteOne');
const deleteEdge = require('./operations/deleteEdge');
const del = require('./operations/del');
const insertOne = require('./operations/insertOne');
const insertEdges = require('./operations/insertEdge');
const updateEdge = require('./operations/updateEdge');
const execute = require('./operations/execute');

const connect = (dbConfig, cb) => {
  global.logging = dbConfig.logging;
  const server = OrientDB({
    username: dbConfig.username,
    password: dbConfig.password,
    servers: dbConfig.servers
  });

  server.transport.connection.on('event', (error) => {
    if (global.logging) {
      console.log('GOLDMINE API: socket event %s', error.code);
    }
  });

  const db = server.use({
    name: dbConfig.databaseName,
    username: dbConfig.username,
    password: dbConfig.password
  });

  db.findOne = findOne;
  db.find = find;
  db.findEdge = findEdge;
  db.updateOne = updateOne;
  db.updateEdge = updateEdge;
  db.update = update;
  db.deleteOne = deleteOne;
  db.delete = del;
  db.deleteEdge = deleteEdge;
  db.insertOne = insertOne;
  db.insertEdges = insertEdges;
  db.execute = execute;


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
