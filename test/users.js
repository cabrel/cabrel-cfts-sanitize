var expect = require('expect.js'),
    users = require('../lib/users');


describe('Users', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(users.process()).to.be(null);
    });
  });
});
