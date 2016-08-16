"use strict";
var odata_v4_literal_1 = require("odata-v4-literal");
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
            else {
                console.log("Unhandled node type: " + node.type, node);
            }
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
        context.projection = {};
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
        this.Visit(node.value, context);
    };
    Visitor.prototype.VisitPropertyPathExpression = function (node, context) {
        if (node.value.current && node.value.next) {
            this.Visit(node.value.current, context);
            context.identifier += ".";
            this.Visit(node.value.next, context);
        }
        else
            this.Visit(node.value, context);
    };
    Visitor.prototype.VisitSingleNavigationExpression = function (node, context) {
        if (node.value.current && node.value.next) {
            this.Visit(node.value.current, context);
            this.Visit(node.value.next, context);
        }
        else
            this.Visit(node.value, context);
    };
    Visitor.prototype.VisitODataIdentifier = function (node, context) {
        context.identifier = (context.identifier || "") + node.value.name;
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
        context.literal = odata_v4_literal_1.Literal.convert(node.value, node.raw);
    };
    Visitor.prototype.VisitMethodCallExpression = function (node, context) {
        var _this = this;
        var method = node.value.method;
        var params = (node.value.parameters || []).forEach(function (p) { return _this.Visit(p, context); });
        switch (method) {
            case "contains":
                context.query[context.identifier] = new RegExp(context.literal, "gi");
                break;
            case "endswith":
                context.query[context.identifier] = new RegExp(context.literal + "$", "gi");
                break;
            case "startswith":
                context.query[context.identifier] = new RegExp("^" + context.literal, "gi");
                break;
        }
    };
    return Visitor;
}());
exports.Visitor = Visitor;
//# sourceMappingURL=visitor.js.map