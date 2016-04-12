import { Visitor } from './visitor'
import { Parser } from 'odata-v4-parser/lib/parser'
import { Token } from 'odata-v4-parser/lib/lexer'

export namespace infrastructure {
    export function createAst(query:string):Token{
        const p = new Parser();
        const ast = p.query(query);
        return ast;
    }

    export function createFilterAst(filter:string):Token{
        const p = new Parser();
        const ast = p.filter(filter);
        return ast;
    }
}

/**
 * Creates MongoDB collection, query, projection, sort, skip and limit from an OData URI string
 * @param {string} odataUri - An OData URI string
 * @return {Visitor} Visitor instance object with collection, query, projection, sort, skip and limit
 * @example
 * const query = createQuery("/Products?$filter=Size eq 4&$orderby=Orders&$skip=10&$top=5");
 * collections[query.collection].find(query.query).project(query.projection).sort(query.sort).skip(query.skip).limit(query.limit).toArray(function(err, data){ ... });
 */
export function createQuery(odataUri:string){
    return new Visitor().Visit(infrastructure.createAst(odataUri));
}

/**
 * Creates a MongoDB query object from an OData filter expression string
 * @param {string} odataFilter - A filter expression in OData $filter format
 * @return {Object}  MongoDB query object
 * @example
 * const filter = createFilter("Size eq 4 and Age gt 18");
 * collection.find(filter, function(err, data){ ... });
 */
export function createFilter(odataFilter:string):Object{
    let context = { query: {} };
    new Visitor().Visit(infrastructure.createFilterAst(odataFilter), context);
    return context.query;
}
