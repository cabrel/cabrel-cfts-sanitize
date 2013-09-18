var Boom = require('boom');
var Hoek = require('hoek');
var moment = require('moment');
var async = require('async');
var sugar = require('sugar');

var companyProcessor = require('./companies');
var fileLogProcessor = require('./filelogs');
var fileProcessor = require('./files');
var groupProcessor = require('./groups');
var userProcessor = require('./users');
var workspaceProcessor = require('./workspaces');

var internals = {
  defaults: {}
};

exports.register = function(plugin, options, next) {
  var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options);

  plugin.ext('onPostHandler', companyProcessor.transform);
  plugin.ext('onPostHandler', fileLogProcessor.transform);
  plugin.ext('onPostHandler', fileProcessor.transform);
  plugin.ext('onPostHandler', groupProcessor.transform);
  plugin.ext('onPostHandler', userProcessor.transform);
  plugin.ext('onPostHandler', workspaceProcessor.transform);

  next();
};
