var companyProcessor = require('./companies');
var fileLogProcessor = require('./filelogs');
var fileProcessor = require('./files');
var groupProcessor = require('./groups');
var userProcessor = require('./users');
var folderProcessor = require('./folders');

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
  plugin.ext('onPostHandler', folderProcessor.transform);

  next();
};
