var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');

var internals = {};


/**
 * [ description]
 *
 * @param  {[type]}   group
 * @param  {Function} callback
 *
 * @return {[type]}
 */
internals.process = function(group, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof group.toObject === 'function') {
    group = group.toObject();
  }

  delete group['__v'];
  delete group['_id'];
  delete group['lastUpdated'];
  delete group['created'];

  if (typeof group.owner !== 'undefined') {
    group.owner = userProcessor.process(group.owner);
  }

  if (arguments.length === 1) {
    if (typeof group.members !== 'undefined') {
      for (var i = 0; i < group.members.length; i++) {
        group.members[i] = userProcessor.process(group.members[i]);
      }
    }

    return group;
  }

  if (typeof group.members !== 'undefined') {
    async.map(group.members, userProcessor.process, function(err, members) {
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
internals.transform = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('groups') > 0 && typeof response.raw.groups !== 'undefined') {
    async.map(response.raw.groups, internals.process, function(err, groups) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      response.raw.groups = groups;
      response.update('application/json', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('group') > 0 && typeof response.raw.group !== 'undefined') {
    response.raw.group = internals.process(response.raw.group);
    response.update('application/json', 'utf-8');

    return next();

  } else {
    return next();
  }
};

module.exports = internals;
