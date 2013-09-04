var Boom = require('boom');
var Hoek = require('hoek');
var moment = require('moment');
var async = require('async');
var sugar = require('sugar');

var internals = {
  defaults: {}
};

var extensions = {};


/**
 * Cleans up a workspace object for delivery to a client
 *
 * @param  {[type]}   workspace [description].
 * @param  {Function} callback  [description].
 *
 * @return {[type]}             [description].
 */
internals.processWorkspace = function(workspace, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof workspace.toObject === 'function') {
    workspace = workspace.toObject();
  }

  delete workspace['__v'];
  delete workspace['_id'];
  delete workspace['lastUpdated'];
  delete workspace['created'];


  // moves the levels up to the top of the object
  if (typeof workspace.internals_ !== 'undefined') {
    var keys = Object.keys(workspace.internals_);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      // is an object
      if (typeof workspace.internals_[key] === 'object') {

        var subkeys = Object.keys(workspace.internals_[key]);

        for (var j = 0; j < subkeys.length; j++) {
          var subkey = subkeys[j];
          workspace[subkey] = workspace.internals_[key][subkey];
        }

      } else {
        workspace[key] = workspace.internals_[key];
      }
    }

    delete workspace['internals_'];
  }

  workspace.creator = internals.processUser(workspace.creator);

  for (var i = 0; i < workspace.owners.length; i++) {
    workspace.owners[i] = internals.processUser(workspace.owners[i]);
  }

  for (var i = 0; i < workspace.committers.length; i++) {
    workspace.committers[i] = internals.processUser(workspace.committers[i]);
  }

  for (var i = 0; i < workspace.guests.length; i++) {
    workspace.guests[i] = internals.processUser(workspace.guests[i]);
  }

  if (arguments.length === 1) {
    return workspace;
  }

  return callback(null, workspace);
};


/**
 * Removes sensitive and unnecessary (for client-side processing) properties from
 * a File mongo document.
 *
 * @param  {[type]}   file     [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
internals.processFile = function(file, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof file.toObject === 'function') {
    file = file.toObject();
  }

  // moves the levels up to the top of the object
  if (typeof file.internals_ !== 'undefined') {

    if (typeof file.internals_.levels !== 'undefined') {
      for (var key in file.internals_.levels) {
        file[key] = file.internals_.levels[key];
      }
    }

    if (typeof file.internals_.extended !== 'undefined') {
      file['extended'] = {};

      for (var key in file.internals_.extended) {
        file.extended[key] = file.internals_.extended[key];
      }
    }

    file.workspace = internals.processWorkspace(file.workspace);

    file.owner = internals.processUser(file.owner);

    for (var i = 0; i < file.users.length; i++) {
      file.users[i] = internals.processUser(file.users[i]);
    }

    delete file['internals_'];
    delete file['grid'];
    delete file['legacyId'];
  }

  delete file['_id'];
  delete file['__v'];

  // create a new moment() that is === to the
  // date the file was created on, it will be
  // incremented below
  var closeDate = moment(file.created);

  // normalize the hours to the be end of the day
  closeDate.hours(23);
  closeDate.minutes(59);
  closeDate.seconds(59);

  // run through the checks and modify the date as needed
  if (file.flags.pending) {
    closeDate.add('years', 99);
  } else if (file.flags.itar) {
    closeDate.add('days', 7);
  } else if (file.flags.timeSensitive) {
    closeDate = moment(file.flags.timeSensitiveExpiration);

  } else if (file.flags.hidden) {
    closeDate.subtract('years', 99);
  } else {
    closeDate.add('years', 99);
  }

  // assign the date to the closesOn property
  file.closesOn = closeDate.toDate();

  if (file.flags.pending === true || file.flags.hidden === true) {
    file.flags.available = false;
  } else {
    var now = moment();

    // check if the close date is after right now
    file.flags.available = closeDate.isAfter(now);

    if (file.flags.available === false) {
      file.flags.hidden = true;
    }
  }

  delete file['created'];
  delete file['lastUpdated'];

  if (arguments.length === 1) {
    return file;
  }

  return callback(null, file);
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
internals.processUser = function(user, callback) {
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
      user.profile.company = internals.processCompany(user.profile.company);
    }
  }

  if (arguments.length === 1) {
    return user;
  }

  return callback(null, user);
};


/**
 * Removes properties from a Company Mongo document
 *
 * @param  {[type]}   company  [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
internals.processCompany = function(company, callback) {
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
 * @param  {[type]}   group
 * @param  {Function} callback
 *
 * @return {[type]}
 */
internals.processGroup = function(group, callback) {
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
    group.owner = internals.processUser(group.owner);
  }

  if (arguments.length === 1) {
    if (typeof group.members !== 'undefined') {
      for (var i = 0; i < group.members.length; i++) {
        group.members[i] = internals.processUser(group.members[i]);
      }
    }

    return group;
  }

  if (typeof group.members !== 'undefined') {
    async.map(group.members, internals.processUser, function(err, members) {
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
 * [processFileLogs description]
 *
 * @param  {[type]}   log
 * @param  {Function} callback
 *
 * @return {[type]}
 */
internals.processFileLogs = function(log, callback) {
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
    log.file = internals.processFile(log.file);
  }

  if (typeof log.user !== 'undefined') {
    log.user = internals.processUser(log.user);
  }

  if (arguments.length === 1) {
    return log;
  } else {
    callback(null, log);
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
extensions.transformGroups = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('groups') > 0 && typeof response.raw.groups !== 'undefined') {
    async.map(response.raw.groups, internals.processGroup, function(err, groups) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.groups = groups;
      response.update('application/json', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('group') > 0 && typeof response.raw.group !== 'undefined') {
    response.raw.group = internals.processGroup(response.raw.group);
    response.update('application/json', 'utf-8');

    return next();

  } else {
    return next();
  }
};


/**
 * [ description]
 *
 * @param  {[type]}   request [description].
 * @param  {Function} next    [description].
 *
 * @return {[type]}           [description].
 */
extensions.transformWorkspace = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('workspaces') > 0 && typeof response.raw.workspaces !== 'undefined') {
    async.map(response.raw.workspaces, internals.processWorkspace, function(err, workspaces) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.workspaces = workspaces;
      response.update('application/json', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('workspace') > 0 && typeof response.raw.workspace !== 'undefined') {
    response.raw.workspace = internals.processWorkspace(response.raw.workspace);
    response.update('application/json', 'utf-8');

    return next();

  } else {
    return next();
  }
};


/**
 * [ description]
 *
 * @param  {[type]}   request [description].
 * @param  {Function} next    [description].
 *
 * @return {[type]}           [description].
 */
extensions.transformFiles = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }


  if (request.route.tags.count('files') > 0 && typeof response.raw.files !== 'undefined') {
    async.map(response.raw.files, internals.processFile, function(err, files) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      if (request.route.tags.count('override') > 0) {
        response.raw.files = files;
        response.update('application/json', 'utf-8');
      } else {
        response.raw.files = files.exclude(function(f) {
          return f.flags.available === false;
        });
      }

      return next();
    });

  } else if (request.route.tags.count('file') > 0 && typeof response.raw.file !== 'undefined') {
    var file = internals.processFile(response.raw.file);

    if (request.route.tags.count('override') > 0) {
      response.raw.file = file;
      response.update('application/json', 'utf-8');
    } else {
      if (file.flags.available === false) {
        return next(Hapi.error.notFound());
      }
    }

    return next();
  } else {
    return next();
  }
};


/**
 * [ description]
 *
 * @param  {[type]}   request [description].
 * @param  {Function} next    [description].
 *
 * @return {[type]}           [description].
 */
extensions.transformUsers = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('users') > 0 && typeof response.raw.users !== 'undefined') {
    async.map(response.raw.users, internals.processUser, function(err, users) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.users = users;
      response.update('application/json', 'utf-8');

      return next();
    });

  } else if (request.route.tags.count('user') > 0 && typeof response.raw.user !== 'undefined') {
    response.raw.user = internals.processUser(response.raw.user);
    response.update('application/json', 'utf-8');

    return next();
  } else {
    return next();
  }

};


/**
 * [ description]
 *
 * @param  {[type]}   request [description].
 * @param  {Function} next    [description].
 *
 * @return {[type]}           [description].
 */
extensions.transformCompanies = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('companies') > 0 && typeof response.raw.companies !== 'undefined') {
    async.map(response.raw.companies, internals.processCompany, function(err, companies) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.companies = companies;
      response.update('application/json', 'utf-8');

      return next();
    });
  } else if (request.route.tags.count('company') > 0 && typeof response.raw.company !== 'undefined') {
    response.raw.company = internals.processCompany(response.raw.company);
    response.update('application/json', 'utf-8');

    return next();
  } else {
    return next();
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
extensions.transformFileLogs = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('filelogs') > 0 && typeof response.raw.filelogs !== 'undefined') {
    async.map(response.raw.filelogs, internals.processFileLogs, function(err, logs) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.filelogs = logs;
      response.update('application/json', 'utf-8');

      return next();
    });
  } else {
    return next();
  }
};


exports.register = function(plugin, options, next) {
  var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options);

  plugin.ext('onPostHandler', extensions.transformUsers);
  plugin.ext('onPostHandler', extensions.transformFiles);
  plugin.ext('onPostHandler', extensions.transformWorkspace);
  plugin.ext('onPostHandler', extensions.transformCompanies);
  plugin.ext('onPostHandler', extensions.transformGroups);
  plugin.ext('onPostHandler', extensions.transformFileLogs);

  next();
};
