"use strict";
var Visitor = (function () {
    function Visitor() {
        this.query = {};
        this.sort = {};
        this.projection = {};
    }
    Visitor.prototype.Visit = function (node, context) {
        this.ast = this.ast || node;
        context = context || {};
        if (node) {
            var visitor = this[("Visit" + node.type)];
            if (visitor)
                visitor.call(this, node, context);
            else
                console.log("Unhandled node type: " + node.type);
        }
        return this;
    };
    Visitor.prototype.VisitODataUri = function (node, context) {
        this.Visit(node.value.resource, context);
        this.Visit(node.value.query, context);
    };
    Visitor.prototype.VisitEntitySetName = function (node, context) {
        this.collection = node.value.name;
    };
    Visitor.prototype.VisitQueryOptions = function (node, context) {
        var _this = this;
        var self = this;
        context.options = {};
        node.value.options.forEach(function (option) { return _this.Visit(option, context); });
        this.query = context.query || {};
        delete context.query;
        this.sort = context.sort;
        delete context.sort;
    };
    Visitor.prototype.VisitFilter = function (node, context) {
        context.query = {};
        this.Visit(node.value, context);
    };
    Visitor.prototype.VisitOrderBy = function (node, context) {
        var _this = this;
        context.sort = {};
        node.value.items.forEach(function (item) { return _this.Visit(item, context); });
    };
    Visitor.prototype.VisitSkip = function (node, context) {
        this.skip = +node.value.raw;
    };
    Visitor.prototype.VisitTop = function (node, context) {
        this.limit = +node.value.raw;
    };
    Visitor.prototype.VisitOrderByItem = function (node, context) {
        this.Visit(node.value.expr, context);
        context.sort[context.identifier] = node.value.direction;
        delete context.identifier;
    };
    Visitor.prototype.VisitSelect = function (node, context) {
        var _this = this;
        context.fields = {};
        node.value.items.forEach(function (item) { return _this.Visit(item, context); });
        this.projection = context.projection;
        delete context.projection;
    };
    Visitor.prototype.VisitSelectItem = function (node, context) {
        context.projection[node.raw.replace(/\//g, '.')] = 1;
    };
    Visitor.prototype.VisitAndExpression = function (node, context) {
        var query = context.query;
        var leftQuery = {};
        context.query = leftQuery;
        this.Visit(node.value.left, context);
        var rightQuery = {};
        context.query = rightQuery;
        this.Visit(node.value.right, context);
        query.$and = [leftQuery, rightQuery];
        context.query = query;
    };
    Visitor.prototype.VisitOrExpression = function (node, context) {
        var query = context.query;
        var leftQuery = {};
        context.query = leftQuery;
        this.Visit(node.value.left, context);
        var rightQuery = {};
        context.query = rightQuery;
        this.Visit(node.value.right, context);
        query.$or = [leftQuery, rightQuery];
        context.query = query;
    };
    Visitor.prototype.VisitBoolParenExpression = function (node, context) {
        this.Visit(node.value, context);
    };
    Visitor.prototype.VisitCommonExpression = function (node, context) {
        this.Visit(node.value, context);
    };
    Visitor.prototype.VisitFirstMemberExpression = function (node, context) {
        this.Visit(node.value, context);
    };
    Visitor.prototype.VisitMemberExpression = function (node, context) {
        context.identifier = node.raw.replace(/\//g, '.');
        this.Visit(node.value.value, context);
    };
    Visitor.prototype.VisitPropertyPathExpression = function (node, context) {
        this.Visit(node.value, context);
    };
    Visitor.prototype.VisitODataIdentifier = function (node, context) {
        context.identifier = context.identifier || node.value.name;
    };
    Visitor.prototype.VisitEqualsExpression = function (node, context) {
        this.Visit(node.value.left, context);
        this.Visit(node.value.right, context);
        context.query[context.identifier] = context.literal;
        delete context.identifier;
        delete context.literal;
    };
    Visitor.prototype.VisitNotEqualsExpression = function (node, context) {
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        context.query[context.identifier] = { $ne: context.literal };
        delete context.identifier;
        delete context.literal;
    };
    Visitor.prototype.VisitLesserThanExpression = function (node, context) {
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        context.query[context.identifier] = { $lt: context.literal };
        delete context.identifier;
        delete context.literal;
    };
    Visitor.prototype.VisitLesserOrEqualsExpression = function (node, context) {
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        context.query[context.identifier] = { $lte: context.literal };
        delete context.identifier;
        delete context.literal;
    };
    Visitor.prototype.VisitGreaterThanExpression = function (node, context) {
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        context.query[context.identifier] = { $gt: context.literal };
        delete context.identifier;
        delete context.literal;
    };
    Visitor.prototype.VisitGreaterOrEqualsExpression = function (node, context) {
        var left = this.Visit(node.value.left, context);
        var right = this.Visit(node.value.right, context);
        context.query[context.identifier] = { $gte: context.literal };
        delete context.identifier;
        delete context.literal;
    };
    Visitor.prototype.VisitLiteral = function (node, context) {
        switch (node.value) {
            case 'Edm.String':
                context.literal = decodeURIComponent(node.raw).slice(1, -1).replace(/''/g, "'");
                break;
            case 'Edm.Byte':
            case 'Edm.SByte':
            case 'Edm.Int16':
            case 'Edm.Int32':
            case 'Edm.Int64':
                context.literal = +node.raw;
                break;
            case 'Edm.Decimal':
            case 'Edm.Double':
            case 'Edm.Single':
                switch (node.raw) {
                    case 'INF':
                        context.literal = Infinity;
                        break;
                    case '-INF':
                        context.literal = -Infinity;
                        break;
                    default: context.literal = +node.raw;
                }
                break;
            case 'Edm.Boolean':
                switch (node.raw.toLowerCase()) {
                    case 'true':
                        context.literal = true;
                        break;
                    case 'false':
                        context.literal = false;
                        break;
                    default: context.literal = undefined;
                }
                break;
            case 'Edm.Guid':
                context.literal = decodeURIComponent(node.raw);
                break;
            case 'Edm.Date':
                context.literal = node.raw;
                break;
            case 'Edm.DateTimeOffset':
                context.literal = new Date(node.raw);
                break;
            case 'null':
                context.literal = null;
                break;
            case 'Edm.TimeOfDay':
                context.literal = new Date("1970-01-01T" + node.raw + "Z");
                break;
            case 'Edm.Duration':
                var m = node.raw.match(/P([0-9]*D)?T?([0-9]{1,2}H)?([0-9]{1,2}M)?([\.0-9]*S)?/);
                if (m) {
                    var d = new Date(0);
                    for (var i = 1; i < m.length; i++) {
                        switch (m[i].slice(-1)) {
                            case 'D':
                                d.setDate(parseInt(m[i]));
                                continue;
                            case 'H':
                                d.setHours(parseInt(m[i]));
                                continue;
                            case 'M':
                                d.setMinutes(parseInt(m[i]));
                                continue;
                            case 'S':
                                d.setSeconds(parseFloat(m[i]));
                                continue;
                        }
                    }
                    context.literal = d.getTime();
                }
                break;
            case 'Edm.GeographyCollection':
            case 'Edm.GeographyLineString':
            case 'Edm.GeographyMultiLineString':
            case 'Edm.GeographyMultiPoint':
            case 'Edm.GeographyMultiPolygon':
            case 'Edm.GeographyPoint':
            case 'Edm.GeographyPolygon':
            case 'Edm.GeometryCollection':
            case 'Edm.GeometryLineString':
            case 'Edm.GeometryMultiLineString':
            case 'Edm.GeometryMultiPoint':
            case 'Edm.GeometryMultiPolygon':
            case 'Edm.GeometryPoint':
            case 'Edm.GeometryPolygon':
            case 'Edm.Binary':
                throw new Error('Not implemented');
            default:
                context.literal = node.raw;
        }
    };
    return Visitor;
}());
exports.Visitor = Visitor;
