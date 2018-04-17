'use strict';

var OrientDB = require('orientjs');
var _ = require('lodash');

var findOne = require('./operations/findOne');
var findEdge = require('./operations/findEdge');
var find = require('./operations/find');
var updateOne = require('./operations/updateOne');
var update = require('./operations/update');
var deleteOne = require('./operations/deleteOne');
var deleteEdge = require('./operations/deleteEdge');
var del = require('./operations/del');
var insertOne = require('./operations/insertOne');
var insertMany = require('./operations/insertMany');
var insertEdges = require('./operations/insertEdge');
var updateEdge = require('./operations/updateEdge');
var execute = require('./operations/execute');

var connect = function connect(dbConfig, cb) {
  global.logging = dbConfig.logging;
  var server = OrientDB({
    username: dbConfig.username,
    password: dbConfig.password,
    servers: dbConfig.servers,
    host: dbConfig.host || _.first(dbConfig.servers).host,
    pool: {
      max: 4
    }
  });
  global.server = server;

  server.transport.pool.on('event', function (error) {
    if (global.logging) {
      console.log('GOLDMINE API: socket event %s', error.code);
    }
  });

  var db = server.use({
    name: dbConfig.databaseName,
    username: dbConfig.username,
    password: dbConfig.password
  });

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

  setInterval(function () {
    db.query('SELECT _id FROM V LIMIT 1').catch(function () {
      console.error("GOLDMINE API: Couldn't keep database connection alive!");
    });
  }, 60 * 1000);

  // ---------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------

  cb(db);
};

module.exports = { connect: connect };