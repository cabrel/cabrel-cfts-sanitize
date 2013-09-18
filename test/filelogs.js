var expect = require('expect.js'),
    filelogs = require('../lib/filelogs');


describe('FileLogs', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(filelogs.process()).to.be(null);
    });
  });
});
