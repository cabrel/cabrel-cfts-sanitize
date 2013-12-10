'use strict';

var async = require('async');
var sugar = require('sugar');

var userProcessor = require('./users');
var checks = require('cabrel-stockpile').checks;
var Hapi = require('hapi');


/**
 * Cleans up a folder object for delivery to a client
 *
 * @param  {[type]}   folder [description].
 * @param  {Function} callback  [description].
 *
 * @return {[type]}             [description].
 */
exports.process = function process(folder, callback) {
  if (arguments.length === 0) {
    return null;
  }

  if (checks.isFunction(folder.toObject)) {
    folder = folder.toObject();
  }

  delete folder.__v;
  delete folder._id;

  folder.owner = userProcessor.deepProcess(folder.owner);

  for (var i = 0; i < folder.editors.length; i += 1) {
    folder.editors[i] = userProcessor.deepProcess(folder.editors[i]);
  }

  for (var i = 0; i < folder.contributors.length; i += 1) {
    folder.contributors[i] = userProcessor.deepProcess(folder.contributors[i]);
  }

  for (var i = 0; i < folder.guests.length; i += 1) {
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
exports.transform = function transform(request, next) {
  if (checks.isUndefined(request.route.tags)) {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }

  if (request.route.tags.count('folders') > 0 && checks.isDefined(response.raw.folders)) {
    async.map(response.raw.folders, exports.process, function(err, folders) {
      if (err) {
        return next(Hapi.error.internal('', err));
      }

      response.raw.folders = folders;
      response.update('text/plain', 'utf-8');

      return next();

    });

  } else if (request.route.tags.count('folder') > 0 && checks.isDefined(response.raw.folder)) {
    response.raw.folder = exports.process(response.raw.folder);
    response.update('text/plain', 'utf-8');

    return next();

  } else {
    return next();
  }
};
