'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('../builders/OrientDbQueryBuilder'),
    pureEdgesBuilder = _require.pureEdgesBuilder;

var resolver = require('../resolvers/OrientDbQueryResolver');
var _ = require('lodash');

var insertEdge = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(db, edgesObject, logQuery) {
    var query, res;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            query = pureEdgesBuilder(edgesObject);

            if (logQuery === true) {
              console.log(query);
            }
            _context.next = 4;
            return resolver(db, query, { class: 's' }, {}, true, logQuery);

          case 4:
            res = _context.sent;
            return _context.abrupt('return', _.first(res));

          case 6:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function insertEdge(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

module.exports = insertEdge;