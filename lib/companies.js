'use strict';

var async = require('async');
var sugar = require('sugar');

var checks = require('cabrel-stockpile').checks;
var Hapi = require('hapi');


/**
 * Removes properties from a Company Mongo document
 *
 * @param  {[type]}   company  [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
exports.process = function process(company, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (checks.isObject(company)) {

    if (checks.isFunction(company.toObject)) {
      company = company.toObject();
    }

    delete company.__v;
    delete company._id;
    delete company.lastUpdated;
    delete company.created;
    delete company.Grid;
    delete company.Segment;
    delete company.checksum;
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
exports.transform = function(request, next) {
  if (checks.isUndefined(request.route.tags)) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('companies') > 0 && checks.isDefined(response.raw.companies)) {
    async.map(response.raw.companies, exports.process, function(err, companies) {
      if (err) {
        return next(Hapi.error.internal('', err));
      }

      response.raw.companies = companies;
      response.update('text/plain', 'utf-8');

      return next();
    });
  } else if (request.route.tags.count('company') > 0 && exports.isDefined(response.raw.company)) {
    response.raw.company = exports.process(response.raw.company);
    response.update('text/plain', 'utf-8');

    return next();
  } else {
    return next();
  }
};
