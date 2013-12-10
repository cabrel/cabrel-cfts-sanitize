'use strict';

var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');
var checks = require('cabrel-stockpile').checks;

var Hapi = require('hapi');


/**
 * [ description]
 *
 * @param  {[type]}   group
 * @param  {Function} callback
 *
 * @return {[type]}
 */
exports.process = function process(group, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (checks.isFunction(group.toObject)) {
    group = group.toObject();
  }

  delete group.__v;
  delete group._id;

  if (checks.isDefined(group.owner)) {
    group.owner = userProcessor.deepProcess(group.owner);
  }

  if (arguments.length === 1) {
    if (checks.isDefined(group.members)) {
      for (var i = 0; i < group.members.length; i += 1) {
        group.members[i] = userProcessor.deepProcess(group.members[i]);
      }
    }

    return group;
  }

  if (checks.isDefined(group.members)) {
    async.map(group.members, userProcessor.deepProcess, function(err, members) {
      if (err) {
        throw err;
      } else {
        group.members = members;
      }

      return callback(null, group);
    });
  } else {
    callback(null, group);
  }
};


/**
 * [ description]
 *
 * @param  {[type]}   request
 * @param  {Function} next
 *
 * @return {[type]}
 */
exports.transform = function transform(request, next) {
  if (checks.isUndefined(request.route.tags)) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('groups') > 0 && checks.isDefined(response.raw.groups)) {
    async.map(response.raw.groups, exports.process, function(err, groups) {
      if (err) {
        return next(Hapi.error.internal('', err));
      }

      response.raw.groups = groups;
      response.update('text/plain', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('group') > 0 && checks.isDefined(response.raw.group)) {
    response.raw.group = exports.process(response.raw.group);
    response.update('text/plain', 'utf-8');

    return next();

  } else {
    return next();
  }
};
