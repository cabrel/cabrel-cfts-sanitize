'use strict';

var async = require('async');
var sugar = require('sugar');

var companyProcessor = require('./companies');

var checks = require('cabrel-stockpile').checks;
var Hapi = require('hapi');


/**
 * Removes sensitive and unnecessary (for client-side processing) properties
 * from a User mongo document
 *
 * @param  {[type]}   user     [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
exports.process = function process(user, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (checks.isFunction(user.toObject)) {
    user = user.toObject();
  }

  delete user.__v;
  delete user._id;
  delete user.lastUpdated;
  delete user.created;

  if (checks.isDefined(user.profile)) {
    if (checks.isDefined(user.profile.company)) {
      user.profile.company = companyProcessor.process(user.profile.company);
    }
  }

  if (arguments.length === 1) {
    return user;
  }

  return callback(null, user);
};


/**
 * Removes sensitive and unnecessary (for client-side processing) properties
 * from a User mongo document
 *
 * @param  {[type]}   user     [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
exports.deepProcess = function deepProcess(user, callback) {
  user = exports.process(user);
  delete user.flags;
  delete user.stats;

  if (arguments.length === 1) {
    return user;
  }

  return callback(null, user);
};


/**
 * [ description]
 *
 * @param  {[type]}   request [description].
 * @param  {Function} next    [description].
 *
 * @return {[type]}           [description].
 */
exports.transform = function transform(request, next) {
  if (checks.isUndefined(request.route.tags)) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('users') > 0 && checks.isDefined(response.raw.users)) {
    async.map(response.raw.users, exports.process, function(err, users) {
      if (err) {
        return next(Hapi.error.internal('', err));
      }

      response.raw.users = users;
      response.update('text/plain', 'utf-8');

      return next();
    });

  } else if (request.route.tags.count('user') > 0 && checks.isDefined(response.raw.user)) {
    response.raw.user = exports.process(response.raw.user);
    response.update('text/plain', 'utf-8');

    return next();
  } else {
    return next();
  }

};
