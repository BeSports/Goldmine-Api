'use strict';

var _ = require('lodash');
var tempParams = [];
var ObjectID = require('bson').ObjectID;

var selectBuilder = function selectBuilder(template, noClear) {
  if (!noClear) {
    tempParams = [];
  }
  var statement = void 0;
  if (typeof template === 'string') {
    return {
      statement: template,
      statementParams: {}
    };
  } else if (template.fast) {
    return {
      statement: newFastBuilder(template),
      statementParams: { class: 's' }
    };
  } else {
    if (!template.collection && global.logging) {
      console.log('No collection name was provided to ' + template);
    }

    var selectStmt = null;
    var fromStmt = null;
    var whereStmt = null;
    var orderByStmt = null;
    var paginationStmt = null;

    // TOP LEVEL
    // select statement
    selectStmt = buildSelectStmt(template);

    if (template.extend) {
      var extendFields = buildExtends(template.extend, '');
      selectStmt += (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' ') + ' ' + extendFields.selectStmt;
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ' AND ' + extendFields.whereStmt;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // from statement
    fromStmt = template.collection;

    // where statement
    whereStmt = buildWhereStmt(template);

    // order by statement
    orderByStmt = buildOrderByStmt(template);

    // pagination statement
    paginationStmt = buildPaginationStmt(template);

    // EXTENDS
    if (template.extend) {
      var _extendFields = buildExtends(template.extend, '');
      selectStmt += (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(_extendFields.selectStmt)) !== 0 ? ', ' : ' ') + ' ' + _extendFields.selectStmt;
      if (_.size(whereStmt) !== 0) {
        if (_.size(_extendFields.whereStmt) !== 0) {
          whereStmt += ' AND ' + _extendFields.whereStmt;
        }
      } else {
        whereStmt = _extendFields.whereStmt;
      }
    }

    // Add statement
    statement = 'SELECT ' + selectStmt + ' FROM `' + fromStmt + '` ' + (whereStmt ? 'WHERE ' + whereStmt : '') + ' ' + (orderByStmt ? 'ORDER BY ' + orderByStmt : '') + ' ' + (paginationStmt ? paginationStmt : '');
  }

  return {
    statement: statement,
    statementParams: tempParams.reduce(function (acc, cur, i) {
      acc['goldmine' + i] = cur;
      return acc;
    }, {})
  };
};

var updateBuilder = function updateBuilder(template, mergeObject) {
  tempParams = [];
  var statement = void 0;
  if (typeof template === 'string') {
    return template;
  } else {
    var fromStmt = null;
    var whereStmt = null;
    // TOP LEVEL
    // from statement
    fromStmt = template.collection;

    // where statement
    whereStmt = buildWhereStmt(template);

    // EXTENDS
    if (template.extend) {
      var extendFields = buildExtends(template.extend, '');
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ' AND ' + extendFields.whereStmt;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // Add statement
    statement = 'UPDATE `' + fromStmt + '` ' + buildContent(mergeObject) + ' ' + (whereStmt ? 'WHERE ' + whereStmt : '') + ' ';
  }

  return {
    statement: statement,
    statementParams: tempParams.reduce(function (acc, cur, i) {
      acc['goldmine' + i] = cur;
      return acc;
    }, {})
  };
};

var deleteBuilder = function deleteBuilder(template) {
  tempParams = [];
  var statement = void 0;
  if (typeof template === 'string') {
    return template;
  } else {
    var fromStmt = null;
    var whereStmt = null;
    // TOP LEVEL
    // from statement
    fromStmt = template.collection;

    // where statement
    whereStmt = buildWhereStmt(template);

    // EXTENDS
    if (template.extend) {
      var extendFields = buildExtends(template.extend, '');
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ' AND ' + extendFields.whereStmt;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // Add statement
    statement = 'DELETE VERTEX `' + fromStmt + '` ' + (whereStmt ? 'WHERE ' + whereStmt : '') + ' ';
  }

  return {
    statement: statement,
    statementParams: tempParams.reduce(function (acc, cur, i) {
      acc['goldmine' + i] = cur;
      return acc;
    }, {})
  };
};

var insertBuilder = function insertBuilder(insertObject) {
  var query = 'begin\n';
  query += insertObjectBuilder(insertObject);
  query += 'commit \nreturn $vert0\n';
  return query;
};

var insertObjectBuilder = function insertObjectBuilder(insertObject) {
  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  tempParams = [];
  return 'let $vert' + offset + ' = CREATE VERTEX `' + insertObject.collection + '` CONTENT ' + JSON.stringify(insertObject.value) + '\n  ' + edgesBuilder(insertObject.edges, insertObject.collection, offset);
};

var insertManyBuilder = function insertManyBuilder(insertObjects) {
  var query = 'begin\n';
  query += _.join(_.map(insertObjects, function (insertObject, offset) {
    if (!_.has(insertObject, 'value._id')) {
      var id = new ObjectID().toHexString();
      _.set(insertObject, 'value._id', id);
    }
    return insertObjectBuilder(insertObject, offset * 100);
  }), '; \n');
  query += 'commit \nreturn true\n';
  return query;
};

var edgesBuilder = function edgesBuilder(edgesObject, extraCollection) {
  var offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  var query = '';
  _.map(edgesObject, function (eo, i) {
    // EXTENDS
    var fromWhere = void 0;
    var fromFast = void 0;
    if (eo.from) {
      if (eo.from.fast) {
        fromFast = fastQuerryBuilder(eo.from);
      } else {
        fromWhere = buildWhereStmt(eo.from);
        if (eo.from.extend) {
          var extendFromBuild = buildExtends(eo.from.extend, '');
          if (_.size(fromWhere) !== 0) {
            if (_.size(extendFromBuild.whereStmt) !== 0) {
              fromWhere += ' AND ' + extendFromBuild.whereStmt;
            }
          } else {
            fromWhere = extendFromBuild.whereStmt;
          }
        }
      }
    }

    var toWhere = void 0;
    var toFast = void 0;
    if (eo.to) {
      if (eo.to.fast) {
        toFast = fastQuerryBuilder(eo.to);
      }
      toWhere = buildWhereStmt(eo.to);
      if (eo.to.extend) {
        var extendToBuild = buildExtends(eo.to.extend, '');
        if (_.size(toWhere) !== 0) {
          if (_.size(extendToBuild.whereStmt) !== 0) {
            toWhere += ' AND ' + extendToBuild.whereStmt;
          }
        } else {
          toWhere = extendToBuild.whereStmt;
        }
      }
    }

    var edgeQuery = 'let $' + (i + offset) + ' = CREATE edge ' + (eo.edge || _.get(eo, 'from.collection', extraCollection) + '_' + _.get(eo, 'to.collection', extraCollection)) + ' from ' + (fromFast ? '(' + fromFast + ')' : eo.from ? '(select from `' + eo.from.collection + '` WHERE ' + fromWhere + ' ' + (buildOrderByStmt(eo.from) ? 'ORDER BY ' + buildOrderByStmt(eo.from) : '') + ' ' + buildPaginationStmt(eo.from) + ')' : '$vert' + offset) + ' TO ' + (toFast ? '(' + toFast + ')' : eo.to ? '(select from `' + eo.to.collection + '` WHERE ' + toWhere + ' ' + (buildOrderByStmt(eo.to) ? 'ORDER BY ' + buildOrderByStmt(eo.to) : '') + ' ' + buildPaginationStmt(eo.to) + ')' : '$vert' + offset) + (eo.content ? ' CONTENT ' + JSON.stringify(eo.content) : '') + ';\n';
    query += edgeQuery;
  });
  _.map(tempParams, function (value, property) {
    query = _.replace(query, ':goldmine' + property, typeof value === 'string' ? '\'' + value + '\'' : JSON.stringify(value));
  });
  return query;
};

var pureEdgesBuilder = function pureEdgesBuilder(edgeObject) {
  tempParams = [];
  var query = 'begin\n';
  query += edgesBuilder(edgeObject);
  query += 'commit \nreturn $0\n';
  return query;
};

var newFastBuilder = function newFastBuilder(template) {
  var result = '';

  tempParams = [];
  if (typeof template === 'string') {
    result = template;
  } else if (template.query) {
    var query = template.query;
    result = query;
  } else {
    if (!template.collection) {
      console.log('No collection name was provided to ' + template);
    }
    var orderByStmt = null;
    var paginationStmt = null;

    // TOP LEVEL
    // select statement
    var selectStmt = buildSelectStmt(template);

    // where statement
    var whereStmts = createWherePaths(template);

    // order by statement
    orderByStmt = buildOrderByStmt(template);

    // pagination statement
    paginationStmt = buildPaginationStmt(template);

    // EXTENDS
    if (template.extend) {
      var extendFields = buildExtends(template.extend, '');
      selectStmt += (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' ') + ' ' + extendFields.selectStmt;
    }

    // Add statement
    result = '\n          begin\n          ' + '\n          ' + _.join(_.map(whereStmts, function (whereStmt, i) {
      return 'let $' + (i + 1) + ' = ' + whereStmt;
    }), ' ;') + '\n          ' + '\n          ' + (_.size(whereStmts) === 1 ? 'let $inter = select intersect($1,$1);' : 'let $inter = select intersect(' + _.join(_.times(_.size(whereStmts), function (i) {
      return '$' + (i + 1);
    }), ', ') + ')') + '\n          ' + '\n          let $result = select ' + selectStmt + ' from $inter.intersect  ' + (orderByStmt ? 'ORDER BY ' + orderByStmt : '') + ' ' + (paginationStmt ? paginationStmt : '') + ';\n          return $result\n          ';
    _.map(tempParams, function (value, property) {
      result = _.replace(result, new RegExp(':goldmine' + property, 'g'), typeof value === 'string' ? "'" + value + "'" : JSON.stringify(value));
    });
  }
  return result;
};

var createWherePaths = function createWherePaths(template) {
  var paths = [];
  var ownParams = '';
  var optionalPaths = [];
  var relationString = '';
  if (template.extend && _.isArray(template.extend) && _.size(template.extend) > 0) {
    optionalPaths = _.flatten(_.filter(_.map(template.extend, function (ext) {
      return createWherePaths(ext);
    }), function (r) {
      return r !== null;
    }));
  }
  // string of the current extend its where clauses
  if (template.params) {
    ownParams = buildObject(template.params, '');
  }
  if (template.relation) {
    relationString = 'expand(' + (template.direction ? buildWhereDirection(template.direction) : 'both') + '(\'' + template.relation + '\')) ';
  }
  if (_.size(optionalPaths) > 0) {
    return _.map(optionalPaths, function (path) {
      return 'select ' + (relationString !== '' ? relationString : '') + ' from ( ' + path + ' ) ' + (ownParams !== '' ? 'WHERE' + ownParams : '');
    });
  } else if (ownParams !== '' || !template.relation) {
    return ['select ' + (relationString !== '' ? relationString : '') + '  from `' + template.collection + '` ' + (ownParams !== '' ? 'WHERE' + ownParams : '')];
  }
  return null;
};

var buildWhereDirection = function buildWhereDirection(direction) {
  return direction ? _.toLower(direction) === 'in' ? 'in' : 'out' : 'both';
};

var fastQuerryBuilder = function fastQuerryBuilder(template) {
  var selectStmt = buildSelectStmt(template);
  if (template.extend) {
    var extendFields = buildExtends(template.extend, '');
    selectStmt += (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' ') + ' ' + extendFields.selectStmt;
  }
  var query = 'select ' + selectStmt + ' from (';
  query += 'select expand(both(\'' + template.extend[0].relation + '\')) from `' + template.extend[0].collection + '` where ' + buildWhereStmt(_.pick(template.extend[0], ['collection', 'params']), '') + ')';
  query + ')';
  return query;
};

var buildExtends = function buildExtends(extend, parent) {
  // select statement
  var selectStmt = '';
  var whereStmt = '';
  _.map(extend, function (e) {
    var buildSelect = buildSelectStmt(e, parent);
    selectStmt += '' + (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(buildSelect)) !== 0 ? ', ' : '') + buildSelect;
    var tempWhereStmt = buildWhereStmt(e, parent);
    if (e.extend) {
      var extendFields = buildExtends(e.extend, (parent ? parent + '.' : '') + buildEdge(e.relation, e.direction));
      selectStmt += '' + (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : '') + extendFields.selectStmt;
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ' AND ' + extendFields.whereStmt;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }
    if (_.size(whereStmt) !== 0) {
      if (_.size(tempWhereStmt) !== 0) {
        whereStmt += ' AND ' + tempWhereStmt;
      }
    } else {
      whereStmt = tempWhereStmt;
    }
  });

  return {
    selectStmt: selectStmt,
    whereStmt: whereStmt
  };
};

var setNextParamAvailable = function setNextParamAvailable(value) {
  tempParams.push(value);
  return _.size(tempParams) - 1;
};

var buildSelectStmt = function buildSelectStmt(template, parent) {
  var res = '';
  //extends
  if (template.target !== undefined) {
    var edge = (parent ? parent + '.' : '') + buildEdge(template.relation, template.direction);
    if (template.fields !== null) {
      res += edge + '["_id"] AS `' + _.replace(template.target, '.', '§') + '\xA7_id`';

      _.forEach(template.fields, function (field) {
        if (field === '_id') {
          return;
        }
        var tempEdge = edge;
        var tempField = field;
        res += ', ' + tempEdge + '.' + tempField + ' AS `' + _.replace(template.target, '.', '§') + '\xA7' + tempField + '`';
      });
    }
    if (template.edgeFields) {
      _.forEach(template.edgeFields, function (field) {
        res += (template.fields === null ? '' : ', ') + ' ' + (parent ? parent + '.' : '') + 'bothE("' + template.relation + '").' + field + ' AS `' + _.replace(template.target, '.', '§') + '\xA7' + field + '`';
      });
    }
    // main class subscribed on
  } else {
    var size = _.size(template.fields);

    if (size !== 0) {
      res += '_id';

      _.forEach(template.fields, function (field) {
        res += ', ' + field;
      });
    } else {
      res += '*';
    }
  }

  return res;
};

var buildWhereStmt = function buildWhereStmt(template, parent) {
  var edge = '';
  if (template.target !== undefined) {
    edge = (parent ? parent + '.' : '') + '' + buildEdge(template.relation, template.direction);
  }
  var res = '';
  if (_.isArray(template.params)) {
    _.forEach(template.params, function (param, key) {
      res += buildObject(param, edge) + (_.size(template.params) - 1 > key ? ' OR' : '');
    });
  } else if (_.isObject(template.params)) {
    res = buildObject(template.params, edge);
  } else if (typeof template.params === 'string') {
    res += buildPropertyValuePair('_id', template.params, '=', edge);
  }
  return res;
};

var buildObject = function buildObject(paramsObject, edge) {
  var objectRes = '(';
  var counter = 0;
  if (_.isString(paramsObject)) {
    return buildPropertyValuePair('_id', paramsObject, '=', edge);
  }
  _.forEach(paramsObject, function (value, property) {
    objectRes += buildProperty(value, property, edge) + (_.size(paramsObject) - 1 > counter ? ' AND' : ' )');
    counter++;
  });
  return objectRes;
};

var buildProperty = function buildProperty(value, property, edge) {
  if (_.isArray(value)) {
    var res = '(';
    _.forEach(value, function (v, i) {
      res += buildPropertyObject(property, v, edge) + (_.size(value) - 1 > i ? ' OR' : ' )');
    });
    return res;
  }
  if (_.isObject(value)) {
    return buildPropertyObject(property, value, edge);
  }
  return buildPropertyValuePair(property, value, '=', edge);
};

var buildPropertyObject = function buildPropertyObject(propertyName, propertyObject, edge) {
  if (typeof propertyObject === 'string') {
    return buildPropertyValuePair(propertyName, propertyObject, '=', edge);
  } else if (propertyObject.value !== undefined && propertyObject.operator !== undefined) {
    return buildPropertyValuePair(propertyName, propertyObject.value, propertyObject.operator, edge, propertyObject.method);
  } else if (propertyObject.value !== undefined) {
    return buildPropertyValuePair(propertyName, propertyObject.value, '=', edge, propertyObject.method);
  } else if (propertyObject.operator !== undefined) {
    return buildPropertyValuePair(propertyName, null, propertyObject.operator, edge, propertyObject.method);
  }
  return '';
};

// preset goldmine since number are not recognized as params by orientjs
var buildPropertyValuePair = function buildPropertyValuePair(property, value, operator, edge, method) {
  var tempParamIndex = setNextParamAvailable(value);
  if (value === null) {
    if (edge) {
      return ' ' + edge + '["' + property + '"] ' + operator;
    }
    return ' `' + property + '` ' + operator;
  }
  if (edge) {
    return ' ' + edge + '["' + property + '"]' + (method ? '.' + method : '') + ' ' + (operator || '=') + ' :goldmine' + tempParamIndex;
  }
  if (_.indexOf(property, '(') !== -1) {
    return ' ' + property + ' ' + (operator || '=') + ' :goldmine' + tempParamIndex;
  }
  return ' `' + property + '`' + (method ? '.' + method : '') + ' ' + (operator || '=') + ' :goldmine' + tempParamIndex;
};

var buildOrderByStmt = function buildOrderByStmt(template) {
  var res = '';

  if (template.orderBy === undefined) {
    return res;
  }

  var orderBySize = _.size(template.orderBy);

  _.forEach(template.orderBy, function (value, key) {
    if (typeof value === 'string') {
      res += value + ' ' + OrderTypes.ASCENDING;
    } else {
      res += value.field + ' ' + value.direction;
    }

    if (orderBySize - 1 > key) {
      res += ', ';
    }
  });

  return res;
};

var buildPaginationStmt = function buildPaginationStmt(template) {
  var res = '';

  if (template.skip !== undefined) {
    res += 'SKIP :' + template.skip;
  }

  if (template.limit !== undefined) {
    if (_.size(res) !== 0) {
      res += ' ';
    }

    var limit = template.limit;

    if (isNaN(template.limit)) {
      limit = ':' + limit;
    }

    res += 'LIMIT ' + limit;
  }

  return res;
};

var buildDirection = function buildDirection(direction) {
  return direction ? _.toLower(direction) === 'in' ? 'out' : 'in' : 'both';
};

var buildEdge = function buildEdge(relation, direction) {
  var isEdge = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  direction = buildDirection(direction);

  return '' + direction + (isEdge ? 'e' : '') + '("' + relation + '")';
};

var buildContent = function buildContent(mergeObject) {
  if (_.find(_.keys(mergeObject), function (k) {
    return _.startsWith(k, '$');
  })) {
    return '' + (mergeObject.$increment ? ' INCREMENT' + obejctToCommaEquals(mergeObject.$increment) : '') + ('' + (mergeObject.$set ? ' SET' + obejctToCommaEquals(mergeObject.$set) : '')) + ('' + (mergeObject.$add ? ' ADD' + obejctToCommaEquals(mergeObject.$add) : '')) + ('' + (mergeObject.$remove ? _.join(_.map(mergeObject.$remove, function (value, key) {
      return ' REMOVE ' + key + ' ';
    }), ' ') : '')) + ('' + (mergeObject.$put ? ' PUT' + obejctToCommaEquals(mergeObject.$put) : '')) + ('' + (mergeObject.$return ? ' RETURN ' + mergeObject.$return + ' ' : ''));
  }
  return mergeObject ? ' MERGE ' + JSON.stringify(mergeObject) : '';
};

var obejctToCommaEquals = function obejctToCommaEquals(object) {
  return _.join(_.map(object, function (value, key) {
    var tempParamIndex = setNextParamAvailable(value);
    return ' ' + key + ' = :goldmine' + tempParamIndex + ' ';
  }), ', ');
};

var updateEdgeBuilder = function updateEdgeBuilder(edgeObject, mergeObject) {
  tempParams = [];
  var edgeToUpdate = edgeObject.edge;
  var whereStmt = '' + buildWhereStmt(edgeObject, '');
  if (edgeObject.from) {
    if (whereStmt !== '') {
      whereStmt += ' AND ';
    }
    whereStmt += edgeWhereBuilder(edgeObject.from, 'out');
  }
  if (edgeObject.to) {
    if (whereStmt !== '') {
      whereStmt += ' AND ';
    }
    whereStmt += edgeWhereBuilder(edgeObject.to, 'in');
  }
  if (whereStmt === '' && edgeObject.rid) {
    edgeToUpdate = edgeObject.rid;
  }

  var statement = 'UPDATE edge ' + (_.isArray(edgeToUpdate) ? '[ ' + edgeToUpdate + ' ]' : '' + edgeToUpdate) + ' ' + buildContent(mergeObject) + ' ' + (whereStmt ? 'WHERE ' + whereStmt : '');

  return {
    statement: statement,
    statementParams: tempParams.reduce(function (acc, cur, i) {
      acc['goldmine' + i] = cur;
      return acc;
    }, {})
  };
};

var edgeWhereBuilder = function edgeWhereBuilder(template, direction) {
  var edge = '' + direction;
  var res = '';
  if (template.params instanceof Object) {
    res = buildObject(template.params, edge);
  } else if (template.params instanceof Array) {
    _.forEach(template.params, function (param, key) {
      res += buildObject(param, edge) + (_.size(template.params) - 1 > key ? ' OR' : '');
    });
  } else if (typeof template.params === 'string') {
    res += buildPropertyValuePair('_id', template.params, '=', edge);
  }
  return res;
};

var deleteEdge = function deleteEdge(edgeObject) {
  tempParams = [];
  var statement = void 0;
  if (!edgeObject.edge && global.logging) {
    console.log('No edge name was provided to ' + edgeObject);
  }
  var collectionStmt = null;
  collectionStmt = edgeObject.edge;
  var whereStmt = ' @class = \'' + collectionStmt + '\' ';
  var fromStmt = '';
  var toStmt = '';
  // pagination statement
  var paginationStmt = buildPaginationStmt(edgeObject);
  // TOP LEVEL
  // from statement

  // create from, to and where statements
  if (edgeObject.from) {
    fromStmt += selectBuilder(edgeObject.from, true).statement;
  }
  if (edgeObject.to) {
    toStmt += selectBuilder(edgeObject.to, true).statement;
  }
  if (edgeObject.params) {
    fromStmt += buildWhereStmt(edgeObject, '');
  }

  // Add statement
  if (fromStmt === '' && toStmt === '' && edgeObject.rid) {
    statement = 'DELETE EDGE  ' + (_.isArray(edgeObject.rid) ? '[ ' + edgeObject.rid + ' ]' : '' + edgeObject.rid);
  } else {
    statement = 'DELETE EDGE  ' + (fromStmt ? 'FROM (' + fromStmt + ') ' : '') + ' ' + (toStmt ? 'TO (' + toStmt + ') ' : '') + '  ' + (whereStmt ? 'WHERE ' + whereStmt : '') + ' ' + (paginationStmt || '') + ';';
  }

  return {
    statement: statement,
    statementParams: tempParams.reduce(function (acc, cur, i) {
      acc['goldmine' + i] = cur;
      return acc;
    }, {})
  };
};

var edgeFinder = function edgeFinder(edgeObject) {
  tempParams = [];
  var statement = void 0;
  if (!edgeObject.edge && global.logging) {
    console.log('No edge name was provided to ' + edgeObject);
  }

  var selectStmt = '' + buildSelectStmt(edgeObject);
  var whereStmt = '';
  var fromStmt = '';
  // TOP LEVEL
  // from statement
  fromStmt = edgeObject.edge;

  // where statement
  if (edgeObject.from) {
    whereStmt += edgeWhereBuilder(edgeObject.from, 'outV()');
  }
  if (_.has(edgeObject, 'from.extend')) {
    var extendFields = buildExtends(edgeObject.from.extend, 'outV()');
    selectStmt += (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' ') + ' ' + extendFields.selectStmt;
    if (_.size(whereStmt) !== 0) {
      if (_.size(extendFields.whereStmt) !== 0) {
        whereStmt += ' AND ' + extendFields.whereStmt;
      }
    } else {
      whereStmt = extendFields.whereStmt;
    }
  }
  if (edgeObject.to) {
    if (whereStmt !== '') {
      whereStmt += ' AND ';
    }
    whereStmt += edgeWhereBuilder(edgeObject.to, 'inV()');
  }

  if (_.has(edgeObject, 'to.extend')) {
    var _extendFields2 = buildExtends(edgeObject.to.extend, 'inV()');
    selectStmt += (_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(_extendFields2.selectStmt)) !== 0 ? ', ' : ' ') + ' ' + _extendFields2.selectStmt;
    if (_.size(whereStmt) !== 0) {
      if (_.size(_extendFields2.whereStmt) !== 0) {
        whereStmt += ' AND ' + _extendFields2.whereStmt;
      }
    } else {
      whereStmt = _extendFields2.whereStmt;
    }
  }

  // Add statement
  statement = 'SELECT ' + selectStmt + ' FROM `' + fromStmt + '` ' + (whereStmt ? 'WHERE ' + whereStmt : '') + ' ' + (edgeObject.limit ? 'LIMIT ' + edgeObject.limit : '');

  return {
    statement: statement,
    statementParams: tempParams.reduce(function (acc, cur, i) {
      acc['goldmine' + i] = cur;
      return acc;
    }, {})
  };
};

module.exports = {
  selectBuilder: selectBuilder,
  updateBuilder: updateBuilder,
  deleteBuilder: deleteBuilder,
  insertBuilder: insertBuilder,
  insertManyBuilder: insertManyBuilder,
  pureEdgesBuilder: pureEdgesBuilder,
  updateEdgeBuilder: updateEdgeBuilder,
  edgeFinder: edgeFinder,
  deleteEdge: deleteEdge
};