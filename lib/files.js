'use strict';

var async = require('async');
var sugar = require('sugar');
var moment = require('moment');
var checks = require('cabrel-stockpile').checks;

var userProcessor = require('./users');
// var folderProcessor = require('./folders');

var Hapi = require('hapi');


/**
 * Removes sensitive and unnecessary (for client-side processing) properties from
 * a File mongo document.
 *
 * @param  {[type]}   file     [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
exports.process = function process(file, callback) {
  if (arguments.length === 0 || checks.isUndefined(file)) {
    return null;
  }

  if (checks.isFunction(file.toObject)) {
    file = file.toObject();
  }

  file.folder = file.folder.id;
  file.owner = userProcessor.deepProcess(file.owner);

  for (var i = 0; i < file.users.length; i += 1) {
    file.users[i] = userProcessor.deepProcess(file.users[i]);
  }

  delete file.grid;
  delete file.legacyId;

  delete file._id;
  delete file.__v;

  // create a new moment() that is === to the
  // date the file was created on, it will be
  // incremented below
  var closeDate = moment(file.created);

  // normalize the hours to the be end of the day
  closeDate.hours(23);
  closeDate.minutes(59);
  closeDate.seconds(59);

  // run through the checks and modify the date as needed
  if (checks.isDefined(file.flags)) {
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
  }

  if (arguments.length === 1) {
    return file;
  }

  return callback(null, file);
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


  if (request.route.tags.count('files') > 0 && checks.isDefined(response.raw.files)) {
    async.map(response.raw.files, exports.process, function(err, files) {
      if (err) {
        return next(Hapi.error.internal('', err));
      }

      if (checks.isArray(files) && files.length > 0) {
        if (request.route.tags.count('override') > 0) {
          response.raw.files = files;
          response.update('text/plain', 'utf-8');
        } else {
          response.raw.files = files.exclude(function(f) {
            return f.flags.available === false && f.flags.pending === false;
          });
        }
      }

      return next();
    });

  } else if (request.route.tags.count('file') > 0 && checks.isDefined(response.raw.file)) {
    var file = exports.process(response.raw.file);

    if (request.route.tags.count('override') > 0) {
      response.raw.file = file;
      response.update('text/plain', 'utf-8');
    } else {
      if (file.flags.available === false && file.flags.pending === false) {
        response.raw.file = null;
      } else {
        response.raw.file = file;
      }

      response.update('text/plain', 'utf-8');
    }

    return next();
  } else {
    return next();
  }
};
