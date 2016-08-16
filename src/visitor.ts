import { Token } from "odata-v4-parser/lib/lexer";
import { Literal } from "odata-v4-literal";

export class Visitor{
	query: any
	sort: any
	skip: number
	limit: number
	projection: any
	collection: string
	ast:Token

	constructor(){
		this.query = {};
		this.sort = {};
		this.projection = {};
	}

	Visit(node:Token, context?:any){
		this.ast = this.ast || node;
		context = context || {};

		if (node){
			var visitor = this[`Visit${node.type}`];
			if (visitor) visitor.call(this, node, context);
			else{
				console.log(`Unhandled node type: ${node.type}`, node);
			}
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

	protected VisitQueryOptions(node:Token, context:any){
		var self = this;

		context.options = {};
		node.value.options.forEach((option) => this.Visit(option, context));

		this.query = context.query || {};
		delete context.query;

		this.sort = context.sort;
		delete context.sort;
	}

	protected VisitFilter(node:Token, context:any){
		context.query = {};
		this.Visit(node.value, context);
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
		context.sort[context.identifier] = node.value.direction;
		delete context.identifier;
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

		query.$and = [leftQuery, rightQuery];
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

		query.$or = [leftQuery, rightQuery];
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
			context.identifier += ".";
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

	protected VisitEqualsExpression(node:Token, context:any){
		this.Visit(node.value.left, context);
		this.Visit(node.value.right, context);

		context.query[context.identifier] = context.literal;
		delete context.identifier;
		delete context.literal;
	}

	protected VisitNotEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $ne: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitLesserThanExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $lt: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitLesserOrEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $lte: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitGreaterThanExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $gt: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitGreaterOrEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $gte: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	protected VisitLiteral(node:Token, context:any){
		context.literal = Literal.convert(node.value, node.raw);
	}

	protected VisitMethodCallExpression(node:Token, context:any){
		var method = node.value.method;
		var params = (node.value.parameters || []).forEach(p => this.Visit(p, context));
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
	}

}
