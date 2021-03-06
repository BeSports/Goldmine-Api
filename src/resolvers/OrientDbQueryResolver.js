const _ = require('lodash');
const resolve = async (db, query, params, template, shouldSelect, logQuery) => {
  let data;
  try {
    if (_.get(params, 'class') === 's') {
      data = await db.query(query, { class: 's' });
    } else {
      data = await db.query(query, { params });
    }
  } catch (err) {
    console.warn('A querry failed to execute', query, ' using the params', params);
    console.trace();
    console.log(err);
  }

  if (shouldSelect) {
    return handleResponse(template, data);
  } else {
    return data;
  }
};

const handleResponse = (template, response) => {
  let result = [];
  _.forEach(response, obj => {
    let formattedObject = {};
    // Add to cache

    _.forEach(obj, (value, key) => {
      let convertedValue = value;
      if (key.includes('@rid') && value instanceof Array) {
        convertedValue = _.map(value, toString);
      }
      if (
        key.startsWith('in_') ||
        key.startsWith('out_') ||
        !key.includes('§') ||
        key.startsWith('_')
      ) {
        // skip all in or out edges
        if (key.startsWith('in_') || key.startsWith('out_')) {
          return;
        }
        formattedObject[key] = key.startsWith('_id') ? convertedValue.toString() : convertedValue;
      } else if (_.size(template.extend) > 0) {
        const index = key.indexOf('§');
        const target = key.substr(0, index);
        const property = key.substr(index + 1);
        let tempExtend = '';

        _.forEach(flattenExtend(template.extend), extend => {
          if (extend.target === target) {
            tempExtend = extend;
            return false;
          }
        });

        if (tempExtend !== '' && tempExtend.multi === true) {
          if (!formattedObject.hasOwnProperty(target)) {
            formattedObject[target] = [];
          }

          _.forEach(value, (item, key) => {
            if (formattedObject[target][key] === undefined) {
              formattedObject[target][key] = {};
            }

            formattedObject[target][key][property] =
              property.startsWith('_id') || property.startsWith(' @rid') ? item.toString() : item;
          });
        } else {
          _.set(
            formattedObject,
            `${target}.${_.replace(property, '§', '.')}`,
            _.isArray(value) && _.size(value) === 1
              ? property.includes('@rid') ? value[0].toString() : value[0]
              : property.includes('@rid') ? value.toString() : value,
          );
        }
      }
    });
    if (template.extraFields) {
      _.merge(formattedObject, template.extraFields);
    }
    if (template.extend) {
      _.map(flattenExtend(template.extend), ext => {
        if (!formattedObject.hasOwnProperty(ext.target) && ext.fields !== null) {
          _.set(formattedObject, `${ext.target}`, ext.multi === true ? [] : {});
        }
      });
    }
    result.push(formattedObject);
  });

  return result;
};

const flattenExtend = extend => {
  let extendArray = [];
  if (extend) {
    const newExtends = _.flatten(
      _.map(extend, e => {
        // ANDS and deeper levels :33: deeper
        if (e instanceof Array) {
          return flattenExtend(e);
        } else {
          //ORS
          extendArray.push(e);
          return flattenExtend(e.extend);
        }
      }),
    );
    extendArray.push(newExtends);
  }
  return _.flatten(extendArray);
};

module.exports = resolve;
