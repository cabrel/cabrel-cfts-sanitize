var expect = require('expect.js'),
    groups = require('../lib/groups');


describe('Groups', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(groups.process()).to.be(null);
    });
  });
});
