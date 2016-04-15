import { Token } from 'odata-v4-parser/lib/lexer'

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
			else console.log(`Unhandled node type: ${node.type}`);
		}

		return this;
	}

	private VisitODataUri(node:Token, context:any){
		this.Visit(node.value.resource, context);
		this.Visit(node.value.query, context);
	}

	private VisitEntitySetName(node:Token, context:any){
		this.collection = node.value.name;
	}

	private VisitQueryOptions(node:Token, context:any){
		var self = this;

		context.options = {};
		node.value.options.forEach((option) => this.Visit(option, context));

		this.query = context.query || {};
		delete context.query;

		this.sort = context.sort;
		delete context.sort;
	}

	private VisitFilter(node:Token, context:any){
		context.query = {};
		this.Visit(node.value, context);
	}

	private VisitOrderBy(node:Token, context:any){
		context.sort = {};
		node.value.items.forEach((item) => this.Visit(item, context));
	}

	private VisitSkip(node:Token, context:any){
		this.skip = +node.value.raw;
	}

	private VisitTop(node:Token, context:any){
		this.limit = +node.value.raw;
	}

	private VisitOrderByItem(node:Token, context:any){
		this.Visit(node.value.expr, context);
		context.sort[context.identifier] = node.value.direction;
		delete context.identifier;
	}

	private VisitSelect(node:Token, context:any){
		context.projection = {};
		node.value.items.forEach((item) => this.Visit(item, context));

		this.projection = context.projection;
		delete context.projection;
	}

	private VisitSelectItem(node:Token, context:any){
		context.projection[node.raw.replace(/\//g, '.')] = 1;
	}

	private VisitAndExpression(node:Token, context:any){
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

	private VisitOrExpression(node:Token, context:any){
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

	private VisitBoolParenExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	private VisitCommonExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	private VisitFirstMemberExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	private VisitMemberExpression(node:Token, context:any){
		context.identifier = node.raw.replace(/\//g, '.');
		this.Visit(node.value.value, context);
	}

	private VisitPropertyPathExpression(node:Token, context:any){
		this.Visit(node.value, context);
	}

	private VisitODataIdentifier(node:Token, context:any){
		context.identifier = context.identifier || node.value.name;
	}

	private VisitEqualsExpression(node:Token, context:any){
		this.Visit(node.value.left, context);
		this.Visit(node.value.right, context);

		context.query[context.identifier] = context.literal;
		delete context.identifier;
		delete context.literal;
	}

	private VisitNotEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $ne: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	private VisitLesserThanExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $lt: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	private VisitLesserOrEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $lte: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	private VisitGreaterThanExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $gt: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	private VisitGreaterOrEqualsExpression(node:Token, context:any){
		var left = this.Visit(node.value.left, context);
		var right = this.Visit(node.value.right, context);

		context.query[context.identifier] = { $gte: context.literal };
		delete context.identifier;
		delete context.literal;
	}

	private VisitLiteral(node:Token, context:any){
		switch (node.value){
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
				switch (node.raw){
					case 'INF': context.literal = Infinity; break;
					case '-INF': context.literal = -Infinity; break;
					default: context.literal = +node.raw;
				}
				break;
			case 'Edm.Boolean':
				switch (node.raw.toLowerCase()){
					case 'true': context.literal = true; break;
					case 'false': context.literal = false; break;
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
				context.literal = new Date(`1970-01-01T${node.raw}Z`);
				break;
			case 'Edm.Duration':
				var m = node.raw.match(/P([0-9]*D)?T?([0-9]{1,2}H)?([0-9]{1,2}M)?([\.0-9]*S)?/);
				if (m){
					var d = new Date(0);
					for (var i = 1; i < m.length; i++){
						switch (m[i].slice(-1)){
							case 'D': d.setDate(parseInt(m[i])); continue;
							case 'H': d.setHours(parseInt(m[i])); continue;
							case 'M': d.setMinutes(parseInt(m[i])); continue;
							case 'S': d.setSeconds(parseFloat(m[i])); continue;
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
	}

}
