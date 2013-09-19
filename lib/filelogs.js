var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');
var fileProcessor = require('./files');

var internals = {};


/**
 * [processFileLogs description]
 *
 * @param  {[type]}   log
 * @param  {Function} callback
 *
 * @return {[type]}
 */
internals.process = function(log, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof log.toObject === 'function') {
    log = log.toObject();
  }

  delete log['__v'];
  delete log['_id'];
  delete log['lastUpdated'];

  if (typeof log.file !== 'undefined') {
    log.file = fileProcessor.process(log.file);
  }

  if (typeof log.user !== 'undefined') {
    log.user = userProcessor.process(log.user);
  }

  if (arguments.length === 1) {
    return log;
  } else {
    callback(null, log);
  }
};


/**
 * [transformFileLogs description]
 *
 * @param  {[type]}   request
 * @param  {Function} next
 *
 * @return {[type]}
 */
internals.transform = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('filelogs') > 0 && typeof response.raw.filelogs !== 'undefined') {
    async.map(response.raw.filelogs, internals.process, function(err, logs) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      response.raw.filelogs = logs;
      response.update('text/plain', 'utf-8');

      return next();
    });
  } else {
    return next();
  }
};


module.exports = internals;
