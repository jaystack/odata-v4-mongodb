import { Visitor } from "./visitor"
import { filter, query } from "odata-v4-parser"
import { Token } from "odata-v4-parser/lib/lexer"

/**
 * Creates MongoDB collection, query, projection, sort, skip and limit from an OData URI string
 * @param {string} queryString - An OData query string
 * @return {Visitor} Visitor instance object with collection, query, projection, sort, skip and limit
 * @example
 * const query = createQuery("$filter=Size eq 4&$orderby=Orders&$skip=10&$top=5");
 * collections[query.collection].find(query.query).project(query.projection).sort(query.sort).skip(query.skip).limit(query.limit).toArray(function(err, data){ ... });
 */
export function createQuery(odataQuery:string);
export function createQuery(odataQuery:Token);
export function createQuery(odataQuery:string | Token){
    let ast:Token = <Token>(typeof odataQuery == "string" ? query(<string>odataQuery) : odataQuery);
    return new Visitor().Visit(ast);
}

/**
 * Creates a MongoDB query object from an OData filter expression string
 * @param {string} odataFilter - A filter expression in OData $filter format
 * @return {Object}  MongoDB query object
 * @example
 * const filter = createFilter("Size eq 4 and Age gt 18");
 * collection.find(filter, function(err, data){ ... });
 */
export function createFilter(odataFilter:string);
export function createFilter(odataFilter:Token);
export function createFilter(odataFilter:string | Token):Object{
    let context = { query: {} };
    let ast:Token = <Token>(typeof odataFilter == "string" ? filter(<string>odataFilter) : odataFilter);
    new Visitor().Visit(ast, context);
    return context.query;
}