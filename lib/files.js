var async = require('async');
var sugar = require('sugar');
var moment = require('moment');

var userProcessor = require('./users');
var folderProcessor = require('./folders');

var internals = {};


/**
 * Removes sensitive and unnecessary (for client-side processing) properties from
 * a File mongo document.
 *
 * @param  {[type]}   file     [description].
 * @param  {Function} callback [description].
 *
 * @return {[type]}            [description].
 */
internals.process = function(file, callback) {
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

    file.folder = folderProcessor.process(file.folder);

    file.owner = userProcessor.deepProcess(file.owner);

    for (var i = 0; i < file.users.length; i++) {
      file.users[i] = userProcessor.deepProcess(file.users[i]);
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
internals.transform = function(request, next) {
  if (typeof request.route.tags === 'undefined') {
    return next();
  }

  var response = request.response();

  if (!response.raw) {
    return next();
  }


  if (request.route.tags.count('files') > 0 && typeof response.raw.files !== 'undefined') {
    async.map(response.raw.files, internals.process, function(err, files) {
      if (err) {
        request.log(['error'], err);
        return next(Hapi.error.internal('', err));
      }

      if (request.route.tags.count('override') > 0) {
        response.raw.files = files;
        response.update('text/plain', 'utf-8');
      } else {
        response.raw.files = files.exclude(function(f) {
          return f.flags.available === false && f.flags.pending === false;
        });
      }

      return next();
    });

  } else if (request.route.tags.count('file') > 0 && typeof response.raw.file !== 'undefined') {
    var file = internals.process(response.raw.file);

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

module.exports = internals;
