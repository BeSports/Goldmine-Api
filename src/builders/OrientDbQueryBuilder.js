const _ = require('lodash');
let tempParams = [];
const ObjectID = require('bson').ObjectID;

const selectBuilder = (template, noClear) => {
  if (!noClear) {
    tempParams = [];
  }
  let statement;
  if (typeof template === 'string') {
    return {
      statement: template,
      statementParams: { class: 's' },
    };
  } else if (template.query) {
    return {
      statement: template.query,
      statementParams: { class: 's' },
    };
  } else if (template.fast || template.new) {
    return {
      statement: newFastBuilder(template),
      statementParams: { class: 's' },
    };
  } else {
    if (!template.collection && global.logging) {
      console.log(`No collection name was provided to ${template}`);
    }
    let selectStmt = null;
    let fromStmt = null;
    let whereStmt = null;
    let whereStmts = null;
    let orderByStmt = null;
    let paginationStmt = null;
    let whereSlowAddition = null;

    // TOP LEVEL
    // select statement
    selectStmt = buildSelectStmt(template);

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
      const extendFields = buildExtends(template.extend, '');
      selectStmt += `${
        _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0
          ? ', '
          : ' '
      } ${extendFields.selectStmt}`;
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ` AND ${extendFields.whereStmt}`;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // Add statement
    statement = `SELECT ${selectStmt} FROM \`${fromStmt}\` ${
      whereStmt ? 'WHERE ' + whereStmt : ''
    } ${orderByStmt ? 'ORDER BY ' + orderByStmt : ''} ${paginationStmt ? paginationStmt : ''}`;
  }

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

const updateBuilder = (template, mergeObject) => {
  tempParams = [];
  let statement;
  if (typeof template === 'string') {
    return template;
  } else {
    let fromStmt = null;
    let whereStmt = null;
    // TOP LEVEL
    // from statement
    fromStmt = template.collection;

    // where statement
    whereStmt = buildWhereStmt(template);

    // EXTENDS
    if (template.extend) {
      const extendFields = buildExtends(template.extend, '');
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ` AND ${extendFields.whereStmt}`;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // Add statement
    statement = `UPDATE \`${fromStmt}\` ${buildContent(mergeObject)} ${
      whereStmt ? 'WHERE ' + whereStmt : ''
    } `;
  }

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

const deleteBuilder = template => {
  tempParams = [];
  let statement;
  if (typeof template === 'string') {
    return template;
  } else {
    let fromStmt = null;
    let whereStmt = null;
    // TOP LEVEL
    // from statement
    fromStmt = template.collection;

    // where statement
    whereStmt = buildWhereStmt(template);

    // EXTENDS
    if (template.extend) {
      const extendFields = buildExtends(template.extend, '');
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ` AND ${extendFields.whereStmt}`;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // Add statement
    statement = `DELETE VERTEX \`${fromStmt}\` ${whereStmt ? 'WHERE ' + whereStmt : ''} `;
  }

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

const insertBuilder = insertObject => {
  let query = 'begin\n';
  query += insertObjectBuilder(insertObject);
  query += 'commit \nreturn $vert0\n';
  return query;
};

const insertObjectBuilder = (insertObject, offset = 0) => {
  tempParams = [];
  return `let $vert${offset} = CREATE VERTEX \`${
    insertObject.collection
  }\` CONTENT ${JSON.stringify(insertObject.value)}
  ${edgesBuilder(insertObject.edges, insertObject.collection, offset)}`;
};

const insertManyBuilder = insertObjects => {
  let query = 'begin\n';
  query += _.join(
    _.map(insertObjects, (insertObject, offset) => {
      if (!_.has(insertObject, 'value._id')) {
        const id = new ObjectID().toHexString();
        _.set(insertObject, 'value._id', id);
      }
      return insertObjectBuilder(insertObject, offset * 100);
    }),
    '; \n',
  );
  query += 'commit \nreturn true\n';
  return query;
};

const edgesBuilder = (edgesObject, extraCollection, offset = 0) => {
  let query = '';
  _.map(edgesObject, (eo, i) => {
    // EXTENDS
    let fromWhere;
    let fromFast;
    if (eo.from) {
      if (eo.from.fast) {
        fromFast = fastQuerryBuilder(eo.from);
      } else {
        fromWhere = buildWhereStmt(eo.from);
        if (eo.from.extend) {
          const extendFromBuild = buildExtends(eo.from.extend, '');
          if (_.size(fromWhere) !== 0) {
            if (_.size(extendFromBuild.whereStmt) !== 0) {
              fromWhere += ` AND ${extendFromBuild.whereStmt}`;
            }
          } else {
            fromWhere = extendFromBuild.whereStmt;
          }
        }
      }
    }

    let toWhere;
    let toFast;
    if (eo.to) {
      if (eo.to.fast) {
        toFast = fastQuerryBuilder(eo.to);
      }
      toWhere = buildWhereStmt(eo.to);
      if (eo.to.extend) {
        const extendToBuild = buildExtends(eo.to.extend, '');
        if (_.size(toWhere) !== 0) {
          if (_.size(extendToBuild.whereStmt) !== 0) {
            toWhere += ` AND ${extendToBuild.whereStmt}`;
          }
        } else {
          toWhere = extendToBuild.whereStmt;
        }
      }
    }

    let edgeQuery = `let $${i + offset} = CREATE edge ${eo.edge ||
      `${_.get(eo, 'from.collection', extraCollection)}_${_.get(
        eo,
        'to.collection',
        extraCollection,
      )}`} from ${
      fromFast
        ? `(${fromFast})`
        : eo.from
          ? `(select from \`${eo.from.collection}\` WHERE ${fromWhere} ${
              buildOrderByStmt(eo.from) ? 'ORDER BY ' + buildOrderByStmt(eo.from) : ''
            } ${buildPaginationStmt(eo.from)})`
          : `$vert${offset}`
    } TO ${
      toFast
        ? `(${toFast})`
        : eo.to
          ? `(select from \`${eo.to.collection}\` WHERE ${toWhere} ${
              buildOrderByStmt(eo.to) ? 'ORDER BY ' + buildOrderByStmt(eo.to) : ''
            } ${buildPaginationStmt(eo.to)})`
          : `$vert${offset}`
    }${eo.content ? ` CONTENT ${JSON.stringify(eo.content)}` : ''};\n`;
    query += edgeQuery;
  });
  _.map(tempParams, (value, property) => {
    query = _.replace(
      query,
      `:goldmine${property}`,
      typeof value === 'string' ? `'${value}'` : JSON.stringify(value),
    );
  });
  return query;
};

const pureEdgesBuilder = edgeObject => {
  tempParams = [];
  let query = 'begin\n';
  query += edgesBuilder(edgeObject);
  query += 'commit \nreturn $0\n';
  return query;
};

const newFastBuilder = template => {
  let result = '';

  tempParams = [];
  if (typeof template === 'string') {
    result = template;
  } else if (template.query) {
    result = template.query;
  } else {
    if (!template.collection) {
      console.log(`No collection name was provided to ${template}`);
    }
    // TOP LEVEL
    // select statement
    let selectStmt = buildSelectStmt(template);

    // where statement
    const whereStmts = createWherePaths(template);

    // order by statement
    const orderByStmt = buildOrderByStmt(template);

    // pagination statement
    const paginationStmt = buildPaginationStmt(template);

    // optional for new:true
    let whereSlowAddition = '';

    // EXTENDS
    if (template.extend) {
      const extendFields = buildExtends(template.extend, '');
      selectStmt += `${
        _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0
          ? ', '
          : ' '
      } ${extendFields.selectStmt}`;
      if (template.new && template.fast) {
        const extendWhereFields = createSlowWheres(template.extend, '');
        whereSlowAddition = extendWhereFields;
      }
    }

    const hasRootParams = _.has(template, 'params');

    // Add statement
    if (!template.new) {
      result = `
          begin
          ${/* insert the where clauses built before */ ''}
          ${_.join(
            _.map(whereStmts, (whereStmt, i) => {
              return `let $${i + 1} = ${whereStmt}`;
            }),
            ' ;',
          )}
          ${/* get all rids where the where clauses are correct */ ''}
          ${
            _.size(whereStmts) === 1
              ? 'let $inter = select intersect($1,$1);'
              : `let $inter = select intersect(${_.join(
                  _.times(_.size(whereStmts), i => {
                    return `$${i + 1}`;
                  }),
                  ', ',
                )})`
          }
          ${/* Select the requested fields */ ''}
          let $result = select ${selectStmt} from $inter.intersect  ${
        orderByStmt ? `ORDER BY ${orderByStmt}` : ''
      } ${paginationStmt || ''};
          return $result
          `;
    } else {
      result = `select ${selectStmt} from (${_.first(whereStmts).substring(
        14,
        _.size(_.first(whereStmts)) - 1,
      )} ${
        whereSlowAddition ? ` ${hasRootParams ? ' AND ' : ' WHERE '} ${whereSlowAddition} ` : ''
      } ${orderByStmt ? `ORDER BY ${orderByStmt} ` : ''} ${paginationStmt || ''}${
        hasRootParams ? ')' : ''
      };`;
    }
    _.map(tempParams, (value, property) => {
      result = _.replace(
        result,
        new RegExp(':goldmine' + property, 'g'),
        typeof value === 'string' ? "'" + value + "'" : JSON.stringify(value),
      );
    });
  }
  return result;
};

const createWherePaths = template => {
  let paths = [];
  let ownParams = '';
  let optionalPaths = [];
  let relationString = '';
  if (template.extend && _.isArray(template.extend) && _.size(template.extend) > 0) {
    optionalPaths = _.flatten(
      _.filter(
        _.map(template.extend, ext => {
          return createWherePaths(ext);
        }),
        r => {
          return r !== null;
        },
      ),
    );
  }
  // string of the current extend its where clauses
  if (template.params) {
    ownParams = buildObject(template.params, '');
  }
  if (template.relation) {
    relationString = `expand(${
      template.direction ? buildWhereDirection(template.direction) : 'both'
    }('${template.relation}')) `;
  }
  if (_.size(optionalPaths) > 0) {
    return _.map(optionalPaths, path => {
      return `select ${relationString !== '' ? relationString : ''} from ( ${path} ) ${
        ownParams !== '' ? 'WHERE' + ownParams : ''
      }`;
    });
  } else if (ownParams !== '' || !template.relation) {
    return [
      `select ${relationString !== '' ? relationString : ''}  from \`${template.collection}\` ${
        ownParams !== '' ? 'WHERE' + ownParams : ''
      }`,
    ];
  }
  return null;
};

const buildWhereDirection = direction => {
  return direction ? (_.toLower(direction) === 'in' ? 'in' : 'out') : 'both';
};

const fastQuerryBuilder = template => {
  let selectStmt = buildSelectStmt(template);
  if (template.extend) {
    const extendFields = buildExtends(template.extend, '');
    selectStmt += `${
      _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' '
    } ${extendFields.selectStmt}`;
  }
  let query = `select ${selectStmt} from (`;
  query += `select expand(both(\'${template.extend[0].relation}\')) from \`${
    template.extend[0].collection
  }\` where ${buildWhereStmt(_.pick(template.extend[0], ['collection', 'params']), '')})`;
  query + ')';
  return query;
};

const buildExtends = (extend, parent) => {
  // select statement
  let selectStmt = '';
  let whereStmt = '';
  _.map(extend, e => {
    const buildSelect = buildSelectStmt(e, parent);
    selectStmt += `${
      _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(buildSelect)) !== 0 ? ', ' : ''
    }${buildSelect}`;
    const tempWhereStmt = buildWhereStmt(e, parent);
    if (e.extend) {
      const extendFields = buildExtends(
        e.extend,
        (parent ? parent + '.' : '') + buildEdge(e.relation, e.direction),
      );
      selectStmt += `${
        _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0
          ? ', '
          : ''
      }${extendFields.selectStmt}`;
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ` AND ${extendFields.whereStmt}`;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }
    if (_.size(whereStmt) !== 0) {
      if (_.size(tempWhereStmt) !== 0) {
        whereStmt += ` AND ${tempWhereStmt}`;
      }
    } else {
      whereStmt = tempWhereStmt;
    }
  });

  return {
    selectStmt,
    whereStmt,
  };
};

const setNextParamAvailable = value => {
  tempParams.push(value);
  return _.size(tempParams) - 1;
};

const buildSelectStmt = (template, parent) => {
  let res = '';
  //extends
  if (template.target !== undefined) {
    const edge = (parent ? parent + '.' : '') + buildEdge(template.relation, template.direction);
    if (template.fields !== null) {
      res += `${edge}["_id"] AS \`${_.replace(template.target, '.', '§')}§_id\``;

      _.forEach(template.fields, field => {
        if (field === '_id') {
          return;
        }
        let tempEdge = edge;
        let tempField = field;
        res += `, ${tempEdge}.${tempField} AS \`${_.replace(
          template.target,
          '.',
          '§',
        )}§${tempField}\``;
      });
    }
    if (template.edgeFields) {
      _.forEach(template.edgeFields, field => {
        res += `${template.fields === null ? '' : ', '} ${
          parent ? parent + '.' : ''
        }${buildDirection(template.direction)}E("${template.relation}").${field} AS \`${_.replace(
          template.target,
          '.',
          '§',
        )}§${field}\``;
      });
    }
    // main class subscribed on
  } else {
    const size = _.size(template.fields);

    if (size !== 0) {
      res += `_id`;

      _.forEach(template.fields, field => {
        res += `, ${field}`;
      });
    } else {
      res += '*';
    }
  }

  return res;
};

const buildWhereStmt = (template, parent) => {
  let edge = '';
  if (template.target !== undefined) {
    edge = (parent ? parent + '.' : '') + '' + buildEdge(template.relation, template.direction);
  }
  let res = '';
  if (_.isArray(template.params)) {
    _.forEach(template.params, (param, key) => {
      res += buildObject(param, edge) + (_.size(template.params) - 1 > key ? ' OR' : '');
    });
  } else if (_.isObject(template.params)) {
    res = buildObject(template.params, edge);
  } else if (typeof template.params === 'string') {
    res += buildPropertyValuePair('_id', template.params, '=', edge);
  }
  return res;
};

const buildObject = (paramsObject, edge) => {
  let objectRes = '(';
  let counter = 0;
  if (_.isString(paramsObject)) {
    return buildPropertyValuePair('_id', paramsObject, '=', edge);
  }
  _.forEach(paramsObject, (value, property) => {
    objectRes +=
      buildProperty(value, property, edge) + (_.size(paramsObject) - 1 > counter ? ' AND' : ' )');
    counter++;
  });
  return objectRes;
};

const buildProperty = (value, property, edge) => {
  if (_.isArray(value)) {
    let res = '(';
    _.forEach(value, (v, i) => {
      res += buildPropertyObject(property, v, edge) + (_.size(value) - 1 > i ? ' OR' : ' )');
    });
    return res;
  }
  if (_.isObject(value)) {
    return buildPropertyObject(property, value, edge);
  }
  return buildPropertyValuePair(property, value, '=', edge);
};

const buildPropertyObject = (propertyName, propertyObject, edge) => {
  if (typeof propertyObject === 'string') {
    return buildPropertyValuePair(propertyName, propertyObject, '=', edge);
  } else if (propertyObject.value !== undefined && propertyObject.operator !== undefined) {
    return buildPropertyValuePair(
      propertyName,
      propertyObject.value,
      propertyObject.operator,
      edge,
      propertyObject.method,
    );
  } else if (propertyObject.value !== undefined) {
    return buildPropertyValuePair(
      propertyName,
      propertyObject.value,
      '=',
      edge,
      propertyObject.method,
    );
  } else if (propertyObject.operator !== undefined) {
    return buildPropertyValuePair(
      propertyName,
      null,
      propertyObject.operator,
      edge,
      propertyObject.method,
    );
  }
  return '';
};

// preset goldmine since number are not recognized as params by orientjs
const buildPropertyValuePair = (property, value, operator, edge, method) => {
  const tempParamIndex = setNextParamAvailable(value);
  if (value === null) {
    if (edge) {
      return ` ${edge}["${property}"] ${operator}`;
    }
    return ` \`${property}\` ${operator}`;
  }
  if (edge) {
    return ` ${edge}["${property}"]${method ? `.${method}` : ''} ${operator ||
      '='} :goldmine${tempParamIndex}`;
  }
  if (_.indexOf(property, '(') !== -1) {
    return ` ${property} ${operator || '='} :goldmine${tempParamIndex}`;
  }
  return ` \`${property}\`${method ? `.${method}` : ''} ${operator ||
    '='} :goldmine${tempParamIndex}`;
};

const buildOrderByStmt = template => {
  let res = '';

  if (template.orderBy === undefined) {
    return res;
  }

  const orderBySize = _.size(template.orderBy);

  _.forEach(template.orderBy, (value, key) => {
    if (typeof value === 'string') {
      res += `${value} ${OrderTypes.ASCENDING}`;
    } else {
      res += `${value.field} ${value.direction}`;
    }

    if (orderBySize - 1 > key) {
      res += ', ';
    }
  });

  return res;
};

const buildPaginationStmt = template => {
  let res = '';

  if (template.skip !== undefined) {
    res += `SKIP :${template.skip}`;
  }

  if (template.limit !== undefined) {
    if (_.size(res) !== 0) {
      res += ' ';
    }

    let limit = template.limit;

    if (isNaN(template.limit)) {
      limit = `:${limit}`;
    }

    res += `LIMIT ${limit}`;
  }

  return res;
};

const buildDirection = direction => {
  return direction ? (_.toLower(direction) === 'in' ? 'out' : 'in') : 'both';
};

const buildEdge = (relation, direction, isEdge = false) => {
  direction = buildDirection(direction);

  return `${direction}${isEdge ? 'e' : ''}("${relation}")`;
};

const buildContent = mergeObject => {
  if (
    _.find(_.keys(mergeObject), k => {
      return _.startsWith(k, '$');
    })
  ) {
    return (
      `${
        mergeObject.$increment ? ' INCREMENT' + obejctToCommaEquals(mergeObject.$increment) : ''
      }` +
      `${mergeObject.$set ? ' SET' + obejctToCommaEquals(mergeObject.$set) : ''}` +
      `${mergeObject.$add ? ' ADD' + obejctToCommaEquals(mergeObject.$add) : ''}` +
      `${
        mergeObject.$remove
          ? _.join(
              _.map(mergeObject.$remove, (value, key) => {
                return ' REMOVE ' + key + ' ';
              }),
              ' ',
            )
          : ''
      }` +
      `${mergeObject.$put ? ' PUT' + obejctToCommaEquals(mergeObject.$put) : ''}` +
      `${mergeObject.$return ? ' RETURN ' + mergeObject.$return + ' ' : ''}`
    );
  }
  return mergeObject ? ` MERGE ${JSON.stringify(mergeObject)}` : '';
};

const obejctToCommaEquals = object => {
  return _.join(
    _.map(object, (value, key) => {
      const tempParamIndex = setNextParamAvailable(value);
      return ` ${key} = :goldmine${tempParamIndex} `;
    }),
    ', ',
  );
};

const updateEdgeBuilder = (edgeObject, mergeObject) => {
  tempParams = [];
  let edgeToUpdate = edgeObject.edge;
  let whereStmt = '' + buildWhereStmt(edgeObject, '');
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

  const statement = `UPDATE edge ${
    _.isArray(edgeToUpdate) ? `[ ${edgeToUpdate} ]` : `${edgeToUpdate}`
  } ${buildContent(mergeObject)} ${whereStmt ? `WHERE ${whereStmt}` : ''}`;

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

const edgeWhereBuilder = (template, direction) => {
  let edge = `${direction}`;
  let res = '';
  if (template.params instanceof Object) {
    res = buildObject(template.params, edge);
  } else if (template.params instanceof Array) {
    _.forEach(template.params, (param, key) => {
      res += buildObject(param, edge) + (_.size(template.params) - 1 > key ? ' OR' : '');
    });
  } else if (typeof template.params === 'string') {
    res += buildPropertyValuePair('_id', template.params, '=', edge);
  }
  return res;
};

const deleteEdge = edgeObject => {
  tempParams = [];
  let statement;
  if (!edgeObject.edge && global.logging) {
    console.log(`No edge name was provided to ${edgeObject}`);
  }
  let collectionStmt = null;
  collectionStmt = edgeObject.edge;
  let whereStmt = ` @class = \'${collectionStmt}\' `;
  let fromStmt = '';
  let toStmt = '';
  // pagination statement
  const paginationStmt = buildPaginationStmt(edgeObject);
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
    statement = `DELETE EDGE  ${
      _.isArray(edgeObject.rid) ? `[ ${edgeObject.rid} ]` : `${edgeObject.rid}`
    }`;
  } else {
    statement = `DELETE EDGE  ${fromStmt ? 'FROM (' + fromStmt + ') ' : ''} ${
      toStmt ? 'TO (' + toStmt + ') ' : ''
    }  ${whereStmt ? 'WHERE ' + whereStmt : ''} ${paginationStmt || ''};`;
  }

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

const edgeFinder = edgeObject => {
  tempParams = [];
  let statement;
  if (!edgeObject.edge && global.logging) {
    console.log(`No edge name was provided to ${edgeObject}`);
  }

  let selectStmt = '' + buildSelectStmt(edgeObject);
  let whereStmt = '';
  let fromStmt = '';
  // TOP LEVEL
  // from statement
  fromStmt = edgeObject.edge;

  // where statement
  if (edgeObject.from) {
    whereStmt += edgeWhereBuilder(edgeObject.from, 'outV()');
  }
  if (_.has(edgeObject, 'from.extend')) {
    const extendFields = buildExtends(edgeObject.from.extend, 'outV()');
    selectStmt += `${
      _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' '
    } ${extendFields.selectStmt}`;
    if (_.size(whereStmt) !== 0) {
      if (_.size(extendFields.whereStmt) !== 0) {
        whereStmt += ` AND ${extendFields.whereStmt}`;
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
    const extendFields = buildExtends(edgeObject.to.extend, 'inV()');
    selectStmt += `${
      _.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(extendFields.selectStmt)) !== 0 ? ', ' : ' '
    } ${extendFields.selectStmt}`;
    if (_.size(whereStmt) !== 0) {
      if (_.size(extendFields.whereStmt) !== 0) {
        whereStmt += ` AND ${extendFields.whereStmt}`;
      }
    } else {
      whereStmt = extendFields.whereStmt;
    }
  }

  // Add statement
  statement = `SELECT ${selectStmt} FROM \`${fromStmt}\` ${whereStmt ? 'WHERE ' + whereStmt : ''} ${
    edgeObject.limit ? 'LIMIT ' + edgeObject.limit : ''
  }`;

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

const createSlowWheres = extend => {
  const extendFields = buildWhereExtends(_.drop(extend), '');
  return extendFields.whereStmt;
};

const buildWhereExtends = (extend, parent) => {
  // select statement
  let whereStmt = '';
  _.map(extend, e => {
    const tempWhereStmt = buildWhereStmt(e, parent);
    if (e.extend) {
      const extendFields = buildWhereExtends(
        e.extend,
        (parent ? `${parent}.` : '') + buildEdge(e.relation, e.direction),
      );
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ` AND ${extendFields.whereStmt}`;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }
    if (_.size(whereStmt) !== 0) {
      if (_.size(tempWhereStmt) !== 0) {
        whereStmt += ` AND ${tempWhereStmt}`;
      }
    } else {
      whereStmt = tempWhereStmt;
    }
  });

  return {
    whereStmt,
  };
};

module.exports = {
  selectBuilder,
  updateBuilder,
  deleteBuilder,
  insertBuilder,
  insertManyBuilder,
  pureEdgesBuilder,
  updateEdgeBuilder,
  edgeFinder,
  deleteEdge,
};
