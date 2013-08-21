var Boom = require('boom');
var Hoek = require('hoek');
var moment = require('moment');
var async = require('async');

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
  if ('internals_' in workspace) {
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
  if ('internals_' in file) {

    if ('levels' in file.internals_) {
      for (var key in file.internals_.levels) {
        file[key] = file.internals_.levels[key];
      }
    }

    if ('extended' in file.internals_) {
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
  var closeDate = moment(file.created).local();

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
    closeDate = moment(file.flags.timeSensitiveExpiration).local();
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
    var now = moment().local();

    // < 0 means the file has not expired yet
    file.flags.available = now.diff(closeDate) < 0;

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

  if ('profile' in user && 'company' in user.profile) {
    user.profile.company = internals.processCompany(user.profile.company);
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

  if ('owner' in group) {
    group.owner = internals.processUser(group.owner);
  }

  if (arguments.length === 1) {
    if ('members' in group) {
      for (var i = 0; i < group.members.length; i++) {
        group.members[i] = internals.processUser(group.members[i]);
      }
    }

    return group;
  }
  if ('members' in group) {
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
  // delete group['created'];

  if ('file' in log) {
    log.file = internals.processFile(log.file);
  }

  if ('user' in log) {
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
  if (!request.route.hasOwnProperty('tags')) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.indexOf('groups') > -1 && 'groups' in response.raw) {
    async.map(response.raw.groups, internals.processGroup, function(err, groups) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.groups = groups;
      response.update('application/json', 'utf-8');

      return next();

    });

  } else if (request.route.tags.indexOf('group') > -1 && 'group' in response.raw) {
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
  if (!request.route.hasOwnProperty('tags')) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.indexOf('workspaces') > -1 && 'workspaces' in response.raw) {
    async.map(response.raw.workspaces, internals.processWorkspace, function(err, workspaces) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.workspaces = workspaces;
      response.update('application/json', 'utf-8');

      return next();

    });

  } else if (request.route.tags.indexOf('workspace') > -1 && 'workspace' in response.raw) {
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
  if (!request.route.hasOwnProperty('tags')) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }


  if (request.route.tags.indexOf('files') > -1 && 'files' in response.raw) {
    async.map(response.raw.files, internals.processFile, function(err, files) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.files = files;
      response.update('application/json', 'utf-8');

      return next();
    });

  } else if (request.route.tags.indexOf('file') > -1 && 'file' in response.raw) {
    response.raw.file = internals.processFile(response.raw.file);
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
extensions.transformUsers = function(request, next) {

  if (!request.route.hasOwnProperty('tags')) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.indexOf('users') > -1 && 'users' in response.raw) {
    async.map(response.raw.users, internals.processUser, function(err, users) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.users = users;
      response.update('application/json', 'utf-8');

      return next();
    });

  } else if (request.route.tags.indexOf('user') > -1 && 'user' in response.raw) {
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
  if (!request.route.hasOwnProperty('tags')) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.indexOf('companies') > -1 && 'companies' in response.raw) {
    async.map(response.raw.companies, internals.processCompany, function(err, companies) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal(err));
      }

      response.raw.companies = companies;
      response.update('application/json', 'utf-8');

      return next();
    });
  } else if (request.route.tags.indexOf('company') > -1 && 'company' in response.raw) {
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
  if (!request.route.hasOwnProperty('tags')) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.indexOf('filelogs') > -1 && 'filelogs' in response.raw) {
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
