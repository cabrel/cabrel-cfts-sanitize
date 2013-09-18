var expect = require('expect.js'),
    workspaces = require('../lib/workspaces');


describe('Workspaces', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(workspaces.process()).to.be(null);
    });
  });
});
