"use strict";
var visitor_1 = require("./visitor");
var odata_v4_parser_1 = require("odata-v4-parser");
function createQuery(odataQuery) {
    var ast = (typeof odataQuery == "string" ? odata_v4_parser_1.query(odataQuery) : odataQuery);
    return new visitor_1.Visitor().Visit(ast);
}
exports.createQuery = createQuery;
function createFilter(odataFilter) {
    var context = { query: {} };
    var ast = (typeof odataFilter == "string" ? odata_v4_parser_1.query(odataFilter) : odataFilter);
    new visitor_1.Visitor().Visit(ast, context);
    return context.query;
}
exports.createFilter = createFilter;
//# sourceMappingURL=index.js.map