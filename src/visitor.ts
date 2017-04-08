import { Token } from "odata-v4-parser/lib/lexer";
import { Literal } from "odata-v4-literal";

export class Visitor{
	query: any
	sort: any
	skip: number
	limit: number
	projection: any
	collection: string
	navigationProperty: string
	includes:Visitor[]
	inlinecount: boolean
	ast:Token

	constructor(){
		this.query = {};
		this.sort = {};
		this.projection = {};
		this.includes = [];

		let _ast;
		Object.defineProperty(this, "ast", {
			get: () => { return _ast; },
			set: (v) => { _ast = v; },
			enumerable: false
		});
	}

	Visit(node:Token, context?:any){
		this.ast = this.ast || node;
		context = context || {};

		if (node){
			var visitor = this[`Visit${node.type}`];
			if (visitor) visitor.call(this, node, context);
		}

		return this;
	}

	protected VisitODataUri(node:Token, context:any){
		this.Visit(node.value.resource, context);
		this.Visit(node.value.query, context);
	}

	protected VisitEntitySetName(node:Token, context:any){
		this.collection = node.value.name;
	}

	protected VisitExpand(node: Token, context: any) {
        var innerContexts:any = {};
        node.value.items.forEach((item) => {
            var expandPath = item.value.path.raw;
            var innerVisitor = this.includes.filter(v => v.navigationProperty === expandPath)[0];
            if (!innerVisitor){
                innerVisitor = new Visitor();

                innerContexts[expandPath] = {
                    query: {},
                    sort: {},
                    projection: {},
                    options: {}
                };

                this.includes.push(innerVisitor);
            }

            let innerContext:any = innerContexts[expandPath] || {};
            innerVisitor.Visit(item, innerContext);

            innerVisitor.query = innerContext.query || innerVisitor.query || {};
            innerVisitor.sort = innerContext.sort || innerVisitor.sort;
            innerVisitor.projection = innerContext.projection || innerVisitor.projection;
        });
    }

    protected VisitExpandItem(node: Token, context: any) {
        this.Visit(node.value.path, context);
        node.value.options && node.value.options.forEach((item) => this.Visit(item, context));
    }

    protected VisitExpandPath(node: Token, context: any) {
        this.navigationProperty = node.raw;
    }

	protected VisitQueryOptions(node:Token, context:any){
		var self = this;

		context.options = {};
		node.value.options.forEach((option) => this.Visit(option, context));

		this.query = context.query || {};
		delete context.query;

		this.sort = context.sort;
		delete context.sort;
	}

	protected VisitInlineCount(node:Token, context:any){
		this.inlinecount = Literal.convert(node.value.value, node.value.raw);
	}

	protected VisitFilter(node:Token, context:any){
		context.query = {};
		this.Visit(node.value, context);
		delete context.identifier;
		delete context.literal;
	}

	protected VisitOrderBy(node:Token, context:any){
		context.sort = {};
		node.value.items.forEach((item) => this.Visit(item, context));
	}

	protected VisitSkip(node:Token, context:any){
		this.skip = +node.value.raw;
	}

	protected VisitTop(node:Token, context:any){
		this.limit = +node.value.raw;
	}

	protected VisitOrderByItem(node:Token, context:any){
		this.Visit(node.value.expr, context);
		if (context.identifier) context.sort[context.identifier] = node.value.direction;
		delete context.identifier;
		delete context.literal;
	}

	protected VisitSelect(node:Token, context:any){
		context.projection = {};
		node.value.items.forEach((item) => this.Visit(item, context));

		this.projection = context.projection;
		delete context.projection;
	}

	protected VisitSelectItem(node:Token, context:any){
		context.projection[node.raw.replace(/\//g, '.')] = 1;
	}

	protected VisitAndExpression(node:Token, context:any){
		var query = context.query;
		var leftQuery = {};
		context.query = leftQuery;
		this.Visit(node.value.left, context);

		var rightQuery = {};
		context.query = rightQuery;
		this.Visit(node.value.right, context);

		if (Object.keys(leftQuery).length > 0 && Object.keys(rightQuery).length > 0){
			query.$and = [leftQuery, rightQuery];
		}
		context.query = query;
	}

	protected VisitOrExpression(node:Token, context:any){
		var query = context.query;
		var leftQuery = {};
		context.query = leftQuery;
		this.Visit(node.value.left, context);

		var rightQuery = {};
		context.query = rightQuery;
		this.Visit(node.value.right, context);

		if (Object.keys(leftQuery).length > 0 && Object.keys(rightQuery).length > 0){
			query.$or = [leftQuery, rightQuery];
		}
		context.query = query;
	}

	protected VisitBoolParenExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	protected VisitCommonExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	protected VisitFirstMemberExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	protected VisitMemberExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	protected VisitPropertyPathExpression(node:Token, context:any){
		if (node.value.current && node.value.next){
			this.Visit(node.value.current, context);
			if (context.identifier) context.identifier += ".";
			this.Visit(node.value.next, context);
		}else this.Visit(node.value, context);
	}

	protected VisitSingleNavigationExpression(node:Token, context:any){
		if (node.value.current && node.value.next){
			this.Visit(node.value.current, context);
			this.Visit(node.value.next, context);
		}else this.Visit(node.value, context);
	}

	protected VisitODataIdentifier(node:Token, context:any){
		context.identifier = (context.identifier || "") + node.value.name;
	}

	protected VisitNotExpression(node:Token, context:any){
		this.Visit(node.value, context);
		if (context.query){
			for (var prop in context.query){
				context.query[prop] = { $not: context.query[prop] };
			}
		}
	}

	protected VisitEqualsExpression(node:Token, context:any){
		this.Visit(node.value.left, context);
		this.Visit(node.value.right, context);

		if (context.identifier) context.query[context.identifier] = context.literal;
		delete context.identifier;
		delete context.literal;
	}

	protected VisitNotEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		if (context.identifier) context.query[context.identifier] = { $ne: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitLesserThanExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		if (context.identifier) context.query[context.identifier] = { $lt: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitLesserOrEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		if (context.identifier) context.query[context.identifier] = { $lte: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitGreaterThanExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		if (context.identifier) context.query[context.identifier] = { $gt: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitGreaterOrEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		if (context.identifier) context.query[context.identifier] = { $gte: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitLiteral(node:Token, context:any){
		context.literal = Literal.convert(node.value, node.raw);
	}

	protected VisitMethodCallExpression(node:Token, context:any){
		var method = node.value.method;
		var params = (node.value.parameters || []).forEach(p => this.Visit(p, context));
		if (context.identifier){
			switch (method){
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
			delete context.identifier;
		}
	}

}
