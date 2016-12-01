var createQuery = require('../lib').createQuery
var expect = require('chai').expect

describe("mongodb query", () => {
   var f;
  beforeEach(function() {
    var match;
     if (match = this.currentTest.title.match(/expression[^\:]*\:  ?(.*)/)) {
       f = createQuery(match[1]);
     }
  });

  it("expression: $filter=contains(Name,'c')&$orderby=UnitPrice", () => {
      expect(f.query).to.deep.equal({ Name: /c/gi });
      expect(f.sort).to.deep.equal({ UnitPrice: 1 });
  });

  it("expression: $filter=contains(Name,'c')&$orderby=Name", () => {
      expect(f.query).to.deep.equal({ Name: /c/gi });
      expect(f.sort).to.deep.equal({ Name: 1 });
  });

  it("expression: $filter=contains(Description,'c')&$orderby=Name", () => {
      expect(f.query).to.deep.equal({ Description: /c/gi });
      expect(f.sort).to.deep.equal({ Name: 1 });
  });
});