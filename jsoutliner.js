/*jslint debug:true*/
/*global console define*/
define(["parse-js/parse-js", "transformjs"], function(mParseJs, mTransformJs) {

var Func = (function() {
	function Func(node, name) {
		this.name = this.findName(node);
		this.args = node && node.args;
		this.start = node && node.type && node.type.start;
		this.children = [];
	}
	Func.prototype = {
		add: function(child) {
			this.children.push(child);
		},
		findName: function findName(node) {
			if (!node) { return null; }
			if (typeof node === "string") { return node; }
			if (node.name) { return node.name; }
			
			var parent = node.__parent,
			    pType = parent.type.toString();
			if (parent.right === node) {
				switch (pType) {
					case "decl":
						// var x = function(){} 
						return findName(parent.left);
					case "assign":
						// foo = function() {}
						// foo.bar = function(){}
						// Current algorithm below may be somewhat overzealous. To revert, uncomment this line:
						//return findName(parent.left);
						var n = parent.left;
						if (typeof n === "string" || n.name) { return n.name; }
						else {
							var dotStack = [];
							for (var dt = n.type.toString(); dt === "dot"; n = n.left, dt = n.type.toString()) {
								dotStack.push(n.right);
							}
							if (n.name)  { dotStack.push(n.name); }
							return dotStack.reverse().join(".");
						}
						return null;
					case "pair":
						// { bar: function(){} }		-> bar
						// {foo: { bar: function(){} } }	-> foo.bar
						// var foo = {bar: function(){} }	-> foo.bar (bonus!)
						var objStack = [];
						var p = parent,
						    pt = p.type.toString();
						for (; pt === "pair" || pt === "object"; p = p.__parent, pt = p.type.toString()) {
							if (pt === "pair") {
								objStack.push(p.left);
							}
						}
						var topName = p && findName(p.right);
						if (topName) { objStack.push(topName); }
						return objStack.reverse().join(".");
				}
			}
			return null;
		},
		debug: function() {
			var buf = [];
			function append(n, d) {
				for (var j=0; j < d; j++) { buf.push("  "); }
				buf.push(n.name || "function");
				buf.push("(");
				if (n.args && n.args.length) { buf.push(n.args.join(",")); }
				buf.push(")");
				buf.push("\n");
				for (var i=0; i < n.children.length; i++) {
					append(n.children[i], d+1);
				}
			}
			append(this, 0);
			return buf.join("");
		}
	};
	return Func;
}());

function toFunctionTree(/**Array*/ast) {
	// Sets the parent pointers of node's children for the next iteration of visit() to see
	function setParents(node, parentFunc) {
		// Find node's children using transformjs metamodel
		var model = mTransformJs.typeMap[node.type.toString()];
		if (model) {
			for (var i=0; i < model.length; i+=2) {
				var name = model[i],
				    fn = model[i+1],
				    obj = node[name];
				if (!obj) {
					continue;
				} else if (fn === mTransformJs.NODE) {
					obj.__parent = node;
					obj.__parentFunc = parentFunc;
				} else if (fn === mTransformJs.ARRAY || fn === mTransformJs.DECLS || fn === mTransformJs.PAIRS) {
					for (var j=0; j < obj.length; j++) {
						obj[j].__parent = node;
						obj[j].__parentFunc = parentFunc;
					}
				}
			}
		}
	}
	
	var toplevel = new Func(null, "toplevel");
	function visit(node, next) {
//		console.debug("visit " + (node.name || node.value || node.type.toString()));
		var func = node.__parentFunc || toplevel;
		switch (node.type.toString()) {
			case "defun":
			case "function":
				var newFunc = new Func(node);
				func.add(newFunc);
				setParents(node, newFunc);
				return next();
			default:
				setParents(node, func);
				return next();
		}
	}
	mTransformJs.transform(ast, [visit]);
	return toplevel;
}

function toOutlineModel(functionTree, isTop) {
	isTop = typeof isTop === "undefined" ? true : false;
	var name = functionTree.name || "function",
	    args = functionTree.args ? functionTree.args.join(", ") : "",
	    token = functionTree.start;
	var element = {
		label: name + "(" + args + ")",
		line: token && (token.line + 1)/*,
		column: token && token.col*/
	};
	if (functionTree.children && functionTree.children.length) {
		element.children = [];
		for (var i=0; i < functionTree.children.length; i++) {
			element.children.push(toOutlineModel(functionTree.children[i], false));
		}
	}
	if (isTop) {
		// Chop off fake toplevel function
		return element.children;
	} else {
		return element;
	}
}

var mJsOutline = {};
mJsOutline.outlineService = {
	getOutline: function(buffer, title) {
		var start = +new Date(),
		    tree,
		    end;
		try {
			var ast = mParseJs.parse(buffer, false, true /*give tokens*/);
			tree = toFunctionTree(ast);
			end = +new Date() - start;
			console.dir(end);
		} catch (e) {
			console.debug("Error parsing file: " + e);
			return [/* TODO can we get a partial result, as with jslint? */];
		}
		return toOutlineModel(tree);
	}
};

mJsOutline.validationService = {
	checkSyntax: function(title, buffer) {
		var errors = [];
		try {
			mParseJs.parse(buffer, true /*strict*/, true /*give tokens*/);
		} catch (e) {
			errors.push({
				reason: e.message,
				line: e.line + 1,
				character: e.col
			});
		}
		return { errors: errors };
	}
};

	return mJsOutline;
});