var async = require('async');
var sugar = require('sugar');

var internals = {};


/**
 * Removes properties from a Company Mongo document
 *
 * @param  {[type]}   company  [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
internals.process = function(company, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof company === 'object') {

    if (typeof company.toObject === 'function') {
      company = company.toObject();
    }

    delete company['__v'];
    delete company['_id'];
    delete company['lastUpdated'];
    delete company['created'];
    delete company['Grid'];
    delete company['Segment'];
    delete company['checksum'];
  }

  if (arguments.length === 1) {
    return company;
  }

  return callback(null, company);
};


/**
 * [ description]
 *
 * @param  {[type]}   request [description].
 * @param  {Function} next    [description].
 *
 * @return {[type]}           [description].
 */
internals.transform = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('companies') > 0 && typeof response.raw.companies !== 'undefined') {
    async.map(response.raw.companies, internals.process, function(err, companies) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      response.raw.companies = companies;
      response.update('text/plain', 'utf-8');

      return next();
    });
  } else if (request.route.tags.count('company') > 0 && typeof response.raw.company !== 'undefined') {
    response.raw.company = internals.process(response.raw.company);
    response.update('text/plain', 'utf-8');

    return next();
  } else {
    return next();
  }
};

module.exports = internals;
