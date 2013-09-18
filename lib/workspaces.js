var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');

var internals = {};


/**
 * Cleans up a workspace object for delivery to a client
 *
 * @param  {[type]}   workspace [description].
 * @param  {Function} callback  [description].
 *
 * @return {[type]}             [description].
 */
internals.process = function(workspace, callback) {
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

  workspace.creator = userProcessor.process(workspace.creator);

  for (var i = 0; i < workspace.owners.length; i++) {
    workspace.owners[i] = userProcessor.process(workspace.owners[i]);
  }

  for (var i = 0; i < workspace.committers.length; i++) {
    workspace.committers[i] = userProcessor.process(workspace.committers[i]);
  }

  for (var i = 0; i < workspace.guests.length; i++) {
    workspace.guests[i] = userProcessor.process(workspace.guests[i]);
  }

  if (arguments.length === 1) {
    return workspace;
  }

  return callback(null, workspace);
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

  if (request.route.tags.count('workspaces') > 0 && typeof response.raw.workspaces !== 'undefined') {
    async.map(response.raw.workspaces, internals.process, function(err, workspaces) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      response.raw.workspaces = workspaces;
      response.update('application/json', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('workspace') > 0 && typeof response.raw.workspace !== 'undefined') {
    response.raw.workspace = internals.process(response.raw.workspace);
    response.update('application/json', 'utf-8');

    return next();

  } else {
    return next();
  }
};


module.exports = internals;
