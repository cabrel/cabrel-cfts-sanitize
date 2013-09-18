var expect = require('expect.js'),
    files = require('../lib/files');


describe('Files', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(files.process()).to.be(null);
    });
  });
});
