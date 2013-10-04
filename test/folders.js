var expect = require('expect.js'),
    folders = require('../lib/folders');


describe('Folders', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(folders.process()).to.be(null);
    });
  });
});
