var async = require('async');
var sugar = require('sugar');

var companyProcessor = require('./companies');

var internals = {};


/**
 * Removes sensitive and unnecessary (for client-side processing) properties
 * from a User mongo document
 *
 * @param  {[type]}   user     [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
internals.process = function(user, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof user.toObject === 'function') {
    user = user.toObject();
  }

  delete user['__v'];
  delete user['_id'];
  delete user['lastUpdated'];
  delete user['created'];

  if (typeof user.profile !== 'undefined') {
    if (typeof user.profile.company !== 'undefined') {
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
internals.deepProcess = function(user, callback) {
  user = internals.process(user);
  delete user['flags'];
  delete user['stats'];

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
internals.transform = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('users') > 0 && typeof response.raw.users !== 'undefined') {
    async.map(response.raw.users, internals.process, function(err, users) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      response.raw.users = users;
      response.update('text/plain', 'utf-8');

      return next();
    });

  } else if (request.route.tags.count('user') > 0 && typeof response.raw.user !== 'undefined') {
    response.raw.user = internals.process(response.raw.user);
    response.update('text/plain', 'utf-8');

    return next();
  } else {
    return next();
  }

};


module.exports = internals;
