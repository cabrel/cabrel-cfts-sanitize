'use strict';

var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');
var fileProcessor = require('./files');
var checks = require('cabrel-stockpile').checks;
var Hapi = require('hapi');


/**
 * [processFileLogs description]
 *
 * @param  {[type]}   log
 * @param  {Function} callback
 *
 * @return {[type]}
 */
exports.process = function(log, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (checks.isFunction(log.toObject)) {
    log = log.toObject();
  }

  delete log.__v;
  delete log._id;
  delete log.lastUpdated;

  if (checks.isDefined(log.file)) {
    log.file = fileProcessor.process(log.file);
  }

  if (checks.isDefined(log.user)) {
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
exports.transform = function(request, next) {
  if (checks.isUndefined(request.route.tags)) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('filelogs') > 0 && checks.isDefined(response.raw.filelogs)) {
    async.map(response.raw.filelogs, exports.process, function(err, logs) {
      if (err) {
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
