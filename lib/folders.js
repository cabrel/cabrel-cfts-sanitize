var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');

var internals = {};


/**
 * Cleans up a folder object for delivery to a client
 *
 * @param  {[type]}   folder [description].
 * @param  {Function} callback  [description].
 *
 * @return {[type]}             [description].
 */
internals.process = function(folder, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (typeof folder.toObject === 'function') {
    folder = folder.toObject();
  }

  delete folder['__v'];
  delete folder['_id'];

  // moves the levels up to the top of the object
  if (typeof folder.internals_ !== 'undefined') {
    var keys = Object.keys(folder.internals_);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      // is an object
      if (typeof folder.internals_[key] === 'object') {

        var subkeys = Object.keys(folder.internals_[key]);

        for (var j = 0; j < subkeys.length; j++) {
          var subkey = subkeys[j];
          folder[subkey] = folder.internals_[key][subkey];
        }

      } else {
        folder[key] = folder.internals_[key];
      }
    }

    delete folder['internals_'];
  }

  folder.owner = userProcessor.deepProcess(folder.owner);

  for (var i = 0; i < folder.editors.length; i++) {
    folder.editors[i] = userProcessor.deepProcess(folder.editors[i]);
  }

  for (var i = 0; i < folder.contributors.length; i++) {
    folder.contributors[i] = userProcessor.deepProcess(folder.contributors[i]);
  }

  for (var i = 0; i < folder.guests.length; i++) {
    folder.guests[i] = userProcessor.deepProcess(folder.guests[i]);
  }

  if (arguments.length === 1) {
    return folder;
  }

  return callback(null, folder);
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

  if (request.route.tags.count('folders') > 0 && typeof response.raw.folders !== 'undefined') {
    async.map(response.raw.folders, internals.process, function(err, folders) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      response.raw.folders = folders;
      response.update('text/plain', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('folder') > 0 && typeof response.raw.folder !== 'undefined') {
    response.raw.folder = internals.process(response.raw.folder);
    response.update('text/plain', 'utf-8');

    return next();

  } else {
    return next();
  }
};


module.exports = internals;
