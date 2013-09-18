var expect = require('expect.js'),
    companies = require('../lib/companies');


describe('Companies', function() {
  describe('#process', function() {
    it('should return null if given no arguments', function() {
      expect(companies.process()).to.be(null);
    });
  });
});
