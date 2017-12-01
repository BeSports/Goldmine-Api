const _ = require('lodash');
let tempParams = [];

const selectBuilder = (template, noClear) => {
  if (!noClear) {
    tempParams = [];
  }
  let statement;
  if (typeof template === 'string') {
    return {
      statement: template,
      statementParams: {},
    };
  } else if (template.fast) {
    return {
      statement: fastQuerryBuilder(template),
      statementParams: tempParams.reduce((acc, cur, i) => {
        acc['goldmine' + i] = cur;
        return acc;
      }, {}),
    };
  } else {
    if (!template.collection && global.logging) {
      console.log(`No collection name was provided to ${template}`);
    }

    let selectStmt = null;
    let fromStmt = null;
    let whereStmt = null;
    let orderByStmt = null;
    let paginationStmt = null;

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
      selectStmt += `${_.size(_.trim(selectStmt)) !== 0 &&
      _.size(_.trim(extendFields.selectStmt)) !== 0
        ? ', '
        : ' '} ${extendFields.selectStmt}`;
      if (_.size(whereStmt) !== 0) {
        if (_.size(extendFields.whereStmt) !== 0) {
          whereStmt += ` AND ${extendFields.whereStmt}`;
        }
      } else {
        whereStmt = extendFields.whereStmt;
      }
    }

    // Add statement
    statement = `SELECT ${selectStmt} FROM \`${fromStmt}\` ${whereStmt
      ? 'WHERE ' + whereStmt
      : ''} ${orderByStmt ? 'ORDER BY ' + orderByStmt : ''} ${paginationStmt
      ? paginationStmt
      : ''}`;
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
    statement = `UPDATE \`${fromStmt}\` ${buildContent(mergeObject)} ${whereStmt
      ? 'WHERE ' + whereStmt
      : ''} `;
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
  tempParams = [];
  let query = 'begin\n';
  query += `let $vert = CREATE VERTEX \`${insertObject.collection}\` CONTENT ${JSON.stringify(
    insertObject.value,
  )};\n`;
  query += edgesBuilder(insertObject.edges, insertObject.collection);
  query += 'commit retry 100\nreturn $vert\n';
  return query;
};

const edgesBuilder = (edgesObject, extraCollection) => {
  let query = '';
  _.map(edgesObject, (eo, i) => {
    let edgeQuery = `let $${i} = CREATE edge ${eo.edge ||
      `${_.get(eo, 'from.collection', extraCollection)}_${_.get(
        eo,
        'to.collection',
        extraCollection,
      )}`} from ${eo.from
      ? `(select from \`${eo.from.collection}\` WHERE ${buildWhereStmt(eo.from)} ${buildOrderByStmt(
          eo.from,
        )
          ? 'ORDER BY ' + buildOrderByStmt(eo.from)
          : ''} ${buildPaginationStmt(eo.from)})`
      : '$vert'} TO ${eo.to
      ? `(select from \`${eo.to.collection}\` WHERE ${buildWhereStmt(eo.to)} ${buildOrderByStmt(
          eo.to,
        )
          ? 'ORDER BY ' + buildOrderByStmt(eo.to)
          : ''} ${buildPaginationStmt(eo.to)})`
      : '$vert'}${eo.content ? ` CONTENT ${JSON.stringify(eo.content)}` : ''};\n`;
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
  query += 'commit retry 100\nreturn $vert\n';
  return query;
};

const fastQuerryBuilder = template => {
  let query = `select expand(bothV()[@class='${template.collection}']) from (`;
  query += `select expand(bothE(\'${template.extend[0].relation}\')) from ${template.extend[0]
    .collection} where ${buildWhereStmt(
    _.pick(template.extend[0], ['collection', 'params']),
    '',
  )})`;
  query + ')';
  return query;
};

const buildExtends = (extend, parent) => {
  // select statement
  let selectStmt = '';
  let whereStmt = '';
  _.map(extend, e => {
    const buildSelect = buildSelectStmt(e, parent);
    selectStmt += `${_.size(_.trim(selectStmt)) !== 0 && _.size(_.trim(buildSelect)) !== 0
      ? ', '
      : ''}${buildSelect}`;
    const tempWhereStmt = buildWhereStmt(e, parent);
    if (e.extend) {
      const extendFields = buildExtends(
        e.extend,
        (parent ? parent + '.' : '') + buildEdge(e.relation, e.direction),
      );
      selectStmt += `${_.size(_.trim(selectStmt)) !== 0 &&
      _.size(_.trim(extendFields.selectStmt)) !== 0
        ? ', '
        : ''}${extendFields.selectStmt}`;
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
        res += `${template.fields === null ? '' : ', '} ${parent
          ? parent + '.'
          : ''}bothE(\'${template.relation}\').${field} AS \`${_.replace(
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
  if (template.params instanceof Array) {
    _.forEach(template.params, (param, key) => {
      res += buildObject(param, edge) + (_.size(template.params) - 1 > key ? ' OR' : '');
    });
  } else if (template.params instanceof Object) {
    res = buildObject(template.params, edge);
  } else if (typeof template.params === 'string') {
    res += buildPropertyValuePair('_id', template.params, '=', edge);
  }
  return res;
};

const buildObject = (paramsObject, edge) => {
  let objectRes = '(';
  let counter = 0;
  _.forEach(paramsObject, (value, property) => {
    objectRes +=
      buildProperty(value, property, edge) + (_.size(paramsObject) - 1 > counter ? ' AND' : ' )');
    counter++;
  });
  return objectRes;
};

const buildProperty = (value, property, edge) => {
  if (value instanceof Array) {
    let res = '(';
    _.forEach(value, (v, i) => {
      res += buildPropertyObject(property, v, edge) + (_.size(value) - 1 > i ? ' OR' : ' )');
    });
    return res;
  }
  if (value instanceof Object) {
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
    );
  } else if (propertyObject.value !== undefined) {
    return buildPropertyValuePair(propertyName, propertyObject.value, '=', edge);
  } else if (propertyObject.operator !== undefined) {
    return buildPropertyValuePair(propertyName, null, propertyObject.operator, edge);
  }
  return '';
};

// preset goldmine since number are not recognized as params by orientjs
const buildPropertyValuePair = (property, value, operator, edge) => {
  const tempParamIndex = setNextParamAvailable(value);
  if (value === null) {
    if (edge) {
      return ` ${edge}["${property}"] ${operator}`;
    }
    return ` \`${property}\` ${operator}`;
  }
  if (edge) {
    return ` ${edge}["${property}"] ${operator || '='} :goldmine${tempParamIndex}`;
  }
  if (_.indexOf(property, '(') !== -1) {
    return ` ${property} ${operator || '='} :goldmine${tempParamIndex}`;
  }
  return ` \`${property}\` ${operator || '='} :goldmine${tempParamIndex}`;
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
      `${mergeObject.$increment
        ? ' INCREMENT' + obejctToCommaEquals(mergeObject.$increment)
        : ''}` +
      `${mergeObject.$set ? ' SET' + obejctToCommaEquals(mergeObject.$set) : ''}` +
      `${mergeObject.$add ? ' ADD' + obejctToCommaEquals(mergeObject.$add) : ''}` +
      `${mergeObject.$remove
        ? _.join(
            _.map(mergeObject.$remove, (value, key) => {
              return ' REMOVE ' + key + ' ';
            }),
            ' ',
          )
        : ''}` +
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

  const statement = `UPDATE edge ${edgeObject.edge} ${buildContent(
    mergeObject,
  )} WHERE ${whereStmt}`;

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
  statement = `DELETE EDGE  ${fromStmt ? 'FROM (' + fromStmt + ') ' : ''} ${toStmt
    ? 'TO (' + toStmt + ') '
    : ''}  ${whereStmt ? 'WHERE ' + whereStmt : ''}`;

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
    selectStmt += `${_.size(_.trim(selectStmt)) !== 0 &&
    _.size(_.trim(extendFields.selectStmt)) !== 0
      ? ', '
      : ' '} ${extendFields.selectStmt}`;
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
    selectStmt += `${_.size(_.trim(selectStmt)) !== 0 &&
    _.size(_.trim(extendFields.selectStmt)) !== 0
      ? ', '
      : ' '} ${extendFields.selectStmt}`;
    if (_.size(whereStmt) !== 0) {
      if (_.size(extendFields.whereStmt) !== 0) {
        whereStmt += ` AND ${extendFields.whereStmt}`;
      }
    } else {
      whereStmt = extendFields.whereStmt;
    }
  }

  // Add statement
  statement = `SELECT ${selectStmt} FROM \`${fromStmt}\` ${whereStmt
    ? 'WHERE ' + whereStmt
    : ''} ${edgeObject.limit ? 'LIMIT ' + edgeObject.limit : ''}`;

  return {
    statement,
    statementParams: tempParams.reduce((acc, cur, i) => {
      acc['goldmine' + i] = cur;
      return acc;
    }, {}),
  };
};

module.exports = {
  selectBuilder,
  updateBuilder,
  deleteBuilder,
  insertBuilder,
  pureEdgesBuilder,
  updateEdgeBuilder,
  edgeFinder,
  deleteEdge,
};
