'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('lodash');
var resolve = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(db, query, params, template, shouldSelect, logQuery) {
    var data;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            data = void 0;
            _context.prev = 1;

            if (!(_.get(params, 'class') === 's')) {
              _context.next = 8;
              break;
            }

            _context.next = 5;
            return db.query(query, { class: 's' });

          case 5:
            data = _context.sent;
            _context.next = 11;
            break;

          case 8:
            _context.next = 10;
            return db.query(query, { params: params });

          case 10:
            data = _context.sent;

          case 11:
            _context.next = 18;
            break;

          case 13:
            _context.prev = 13;
            _context.t0 = _context['catch'](1);

            console.warn('A querry failed to execute', query, ' using the params', params);
            console.trace();
            console.log(_context.t0);

          case 18:
            if (!shouldSelect) {
              _context.next = 22;
              break;
            }

            return _context.abrupt('return', handleResponse(template, data));

          case 22:
            return _context.abrupt('return', data);

          case 23:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[1, 13]]);
  }));

  return function resolve(_x, _x2, _x3, _x4, _x5, _x6) {
    return _ref.apply(this, arguments);
  };
}();

var handleResponse = function handleResponse(template, response) {
  var result = [];
  _.forEach(response, function (obj) {
    var formattedObject = {};
    // Add to cache

    _.forEach(obj, function (value, key) {
      if (key.startsWith('in_') || key.startsWith('out_') || !key.includes('§') || key.startsWith('_')) {
        if (key.startsWith('in_') || key.startsWith('out_')) {
          return;
        }
        formattedObject[key] = key.startsWith('_id') ? value.toString() : value;
      } else if (_.size(template.extend) > 0) {
        var index = key.indexOf('§');
        var target = key.substr(0, index);
        var property = key.substr(index + 1);

        var tempExtend = '';

        _.forEach(flattenExtend(template.extend), function (extend) {
          if (extend.target === target) {
            tempExtend = extend;
            return false;
          }
        });

        if (tempExtend !== '' && tempExtend.multi === true) {
          if (!formattedObject.hasOwnProperty(target)) {
            formattedObject[target] = [];
          }

          _.forEach(value, function (item, key) {
            if (formattedObject[target][key] === undefined) {
              formattedObject[target][key] = {};
            }

            formattedObject[target][key][property] = property.startsWith('_id') ? item.toString() : item;
          });
        } else {
          _.set(formattedObject, target + '.' + _.replace(property, '§', '.'), _.isArray(value) && _.size(value) === 1 ? value[0] : value);
        }
      }
    });
    if (template.extraFields) {
      _.merge(formattedObject, template.extraFields);
    }
    if (template.extend) {
      _.map(flattenExtend(template.extend), function (ext) {
        if (!formattedObject.hasOwnProperty(ext.target) && ext.fields !== null) {
          _.set(formattedObject, '' + ext.target, ext.multi === true ? [] : {});
        }
      });
    }
    result.push(formattedObject);
  });

  return result;
};

var flattenExtend = function flattenExtend(extend) {
  var extendArray = [];
  if (extend) {
    var newExtends = _.flatten(_.map(extend, function (e) {
      // ANDS and deeper levels :33: deeper
      if (e instanceof Array) {
        return flattenExtend(e);
      } else {
        //ORS
        extendArray.push(e);
        return flattenExtend(e.extend);
      }
    }));
    extendArray.push(newExtends);
  }
  return _.flatten(extendArray);
};

module.exports = resolve;