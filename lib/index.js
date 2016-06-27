"use strict";
var visitor_1 = require('./visitor');
var parser_1 = require('odata-v4-parser/lib/parser');
var infrastructure;
(function (infrastructure) {
    function createAst(query) {
        var p = new parser_1.Parser();
        var ast = p.query(query);
        return ast;
    }
    infrastructure.createAst = createAst;
    function createFilterAst(filter) {
        var p = new parser_1.Parser();
        var ast = p.filter(filter);
        return ast;
    }
    infrastructure.createFilterAst = createFilterAst;
})(infrastructure = exports.infrastructure || (exports.infrastructure = {}));
/**
 * Creates MongoDB collection, query, projection, sort, skip and limit from an OData URI string
 * @param {string} queryString - An OData query string
 * @return {Visitor} Visitor instance object with collection, query, projection, sort, skip and limit
 * @example
 * const query = createQuery("$filter=Size eq 4&$orderby=Orders&$skip=10&$top=5");
 * collections[query.collection].find(query.query).project(query.projection).sort(query.sort).skip(query.skip).limit(query.limit).toArray(function(err, data){ ... });
 */
function createQuery(queryString) {
    return new visitor_1.Visitor().Visit(infrastructure.createAst(queryString));
}
exports.createQuery = createQuery;
/**
 * Creates a MongoDB query object from an OData filter expression string
 * @param {string} odataFilter - A filter expression in OData $filter format
 * @return {Object}  MongoDB query object
 * @example
 * const filter = createFilter("Size eq 4 and Age gt 18");
 * collection.find(filter, function(err, data){ ... });
 */
function createFilter(odataFilter) {
    var context = { query: {} };
    new visitor_1.Visitor().Visit(infrastructure.createFilterAst(odataFilter), context);
    return context.query;
}
exports.createFilter = createFilter;
