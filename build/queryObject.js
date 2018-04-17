'use strict';

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('lodash');

var validator = function validator(queryObject) {
  if (typeof queryObject === 'string') {
    return false;
  }
  // collection
  var collectionError = _.has(queryObject, 'collection') ? typeof queryObject.collection === 'string' ? false : 'collection is not of type string' : 'collection is not defined';
  // fields
  var fieldsError = _.has(queryObject, 'fields') ? queryObject.fields instanceof Array ? false : 'fields are not of type array' : false;
  // params
  var paramsError = _.has(queryObject, 'params') ? paramsValidator(queryObject.params) ? paramsValidator(queryObject.params) : false : false;
  // orderBy
  var orderByError = _.has(queryObject, 'orderBy') ? orderByValidator(queryObject.orderBy) : false;
  // limit
  var limitError = _.has(queryObject, 'limit') ? typeof queryObject.limit === 'number' ? false : 'limit should be a number' : false;
  var extendError = _.has(queryObject, 'extend') ? _.filter(extendValidator(queryObject.extend), function (f) {
    return f !== false && f !== 'false';
  }) : false;
  if (!collectionError && !fieldsError && !paramsError && !orderByError && !limitError && !extendError) {
    return false;
  } else {
    return '' + (collectionError || '') + (fieldsError || '') + (paramsError || '') + (orderByError || '') + (limitError || '') + (extendError || '');
  }
};

var paramsValidator = function paramsValidator(paramsObject) {
  var paramsError = typeof paramsObject === 'string' ? false : (typeof paramsObject === 'undefined' ? 'undefined' : (0, _typeof3.default)(paramsObject)) === 'object' ? paramsObjectValidator(paramsObject) : 'unrecognized params type';
  return paramsError;
};

var paramsObjectValidator = function paramsObjectValidator(paramsObject) {
  var error = void 0;
  if (paramsObject instanceof Array) {
    return _.flatten(_.map(paramsObject, function (po) {
      return paramsObjectValidator(po);
    }));
  }
  _.mapKeys(paramsObject, function (value, key) {
    if (typeof value === 'string' || _.toLower(value.operator) === 'matches') {
      return;
    } else if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) === 'object') {
      if (!_.has(value, 'value') && !_.has(value, 'operator')) {
        error += 'No operator or value was given for <' + JSON.stringify(value) + '>';
        return;
      }
      if (_.has(value, 'operator') && typeof value.operator !== 'string') {
        error += 'String is the only allowed format for operator of key <' + JSON.stringify(value) + '>';
        return;
      }
      if (_.has(value, 'value') && _.has(value, 'operator') && value.value instanceof Array) {
        if (_.toLower(value.operator) !== 'in') {
          error += 'Array is not an allowed value for operator <' + operator + '> for <' + JSON.stringify(value) + '>';
        } else {
          return;
        }
      }
      if (_.has(value, 'value') && typeof value.value !== 'string') {
        error += 'String is the only allowed format for value of key <' + key + '>';
      }
    }
  });
  return error;
};

var orderByValidator = function orderByValidator(orderByArray) {
  if (!orderByArray instanceof Array) {
    return 'orderby should be of type array';
  }
  var error = void 0;
  _.map(orderByArray, function (value) {
    if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) !== 'object') {
      error += 'orderby should be an array of objects';
    }
    if (!_.has(value, 'field')) {
      error += 'Each orderby should have a field defined';
    }
    if (!_.has(value, 'direction')) {
      error += 'Each orderby should have a direction defined';
    }
  });
  return error;
};

var extendValidator = function extendValidator(extend) {
  if (!extend instanceof Array) {
    return false;
  }
  return _.map(extend, function (e) {
    // collection
    var collectionError = _.has(e, 'collection') ? typeof e.collection === 'string' ? false : 'collection is not of type string' : 'collection is not defined';
    // target
    var targetError = _.has(e, 'target') ? typeof e.target === 'string' ? false : 'target is not of type string' : false;
    // relation
    var relationError = _.has(e, 'relation') ? typeof e.relation === 'string' ? false : 'relation is not of type string' : false;
    // fields
    var fieldsError = _.has(e, 'fields') ? e.fields instanceof Array || e.fields === null ? false : 'fields are not of type array' : false;
    // params
    var paramsError = _.has(e, 'params') ? paramsValidator(e.params) ? paramsValidator(e.params) : false : false;
    // orderBy
    var orderByError = _.has(e, 'orderBy') ? 'orderBy is not allowed on extends' : false;
    // limit
    var limitError = _.has(e, 'limit') ? 'limit is not allowed on extends' : false;
    var extendError = _.has(e, 'extend') ? extendValidator(e.extend) : false;
    if (!collectionError && !targetError && !relationError && !fieldsError && !paramsError && !orderByError && !limitError && !extendError) {
      return false;
    } else {
      return '' + (collectionError ? collectionError : '') + (targetError ? targetError : '') + (relationError ? relationError : '') + (fieldsError ? fieldsError : '') + (paramsError ? paramsError : '') + (orderByError ? orderByError : '') + (limitError ? limitError : '') + (extendError ? extendError : '');
    }
  });
};

module.exports = { validator: validator };