/*******************************************************************************
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Distribution License v1.0 
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*jslint debug:true*/
/*global console define*/
define(["lib/esprima/esprima"], function(mEsprima) {

var Func = (function() {
	function Func(node, name) {
		this.name = this.findName(node);
		this.args = node && node.params;
		this.loc = node && node.range;
		this.children = [];
	}
	Func.prototype = {
		add: function(child) {
			this.children.push(child);
		},
		findName: function findName(node) {
			if (!node) { return null; }
			if (typeof node === "string") { return node; }
			if (node.id) { return node.id.name; }
			
			var parent = node.__parent;
			switch (parent.type) {
				case "VariableDeclarator":
					// var x = function(){} 
					return findName(parent.id);
				case "AssignmentExpression":
					// foo = function() {}
					// foo.bar = function(){}
					// Current algorithm below may be somewhat overzealous. To revert, uncomment this line:
					//return findName(parent.left);
					var n = parent.left;
					if (n.name) { return n.name; }
					else {
						var dotStack = [];
						for (var dt = n.type; dt === "MemberExpression"; n = n.object, dt = n.type) {
							dotStack.push(n.property.name);
						}
						if (n.name) { dotStack.push(n.name); }
						return dotStack.reverse().join(".");
					}
					return null;
				case null:
				case undefined:
					if (parent.value === node) {
						// { bar: function(){} }		-> bar
						// {foo: { bar: function(){} } }	-> foo.bar
						// var foo = {bar: function(){} }	-> foo.bar (bonus!)
						var objStack = [];
						var p = parent, ppt = p.__parent.type;
						// Walk up through the property:value chain, also walk past assignments
						while (p && ppt) {
							if (ppt === "ObjectExpression") {
								objStack.push(p.key.name);
							} else if (p.type === "AssignmentExpression") {
								// FIX this YUCK
								if (p.left.type === 'Identifier') {
									objStack.push(findName(p.left));
								} else if (p.left.property) {
									objStack.push(p.left.property.name + '2');
									objStack.push(p.left.object.name);
								}
							} else {
								break;
							}
							p = p.__parent.__parent;
							ppt = p.__parent && p.__parent.type;
						}
//						var topName = p && findName(p.id);
//						if (topName) { objStack.push(topName); }
//						return objStack.reverse().join(".");
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

/**
 * @param {EsprimaAstNode} noed
 * @returns All keys of node that lead to child nodes in the Esprima AST.
 */
function childKeys(node) {
	var k = [];
	for (var prop in node) {
		if (node.hasOwnProperty(prop) && prop.charAt(0) !== '_') {
			k.push(prop);
		}
	}
	return k;
}

/**
 * @param {EsprimaAstNode} ast
 * @param {Function} visitorFunc Signature is function({EsprimaAstNode} node)
 */
function visitWith(ast, visitorFunc) {
	var stack = [ast];
	while (stack.length) {
		var node = stack.pop();
		if (!node || typeof node !== 'object') {
			continue;
		}
//		console.log("Visit " + (node.type || node.name || (node.id && node.id.name)));
		var keys = childKeys(node);
		visitorFunc(node);
		for (var i=keys.length-1; i >= 0; i--) {
			var key = keys[i], val = node[key];
			if (val instanceof Array) {
				for (var j=val.length-1; j >= 0; j--) {
					stack.push(val[j]);
				}
			} else {
				stack.push(val);
			}
		}
	}
}

/**
 * @returns {Func}
 */
function toFunctionTree(ast) {
	function set(node, parentNode, parentFunc) {
		node.__parent = parentNode;
		node.__parentFunc = parentFunc;
	}
	// Sets the parent pointers of node's children
	function setParents(node, func) {
		var keys = childKeys(node);
		for (var i=0; i < keys.length; i++) {
			var key = keys[i], val = node[key];
			if (val instanceof Array) {
				for (var j=0; j < val.length; j++) {
					set(val[j], node, func);
				}
			} else if (val && typeof val === "object") {
				set(val, node, func);
			}
		}
	}
	
	var toplevel = new Func(null, "toplevel");
	visitWith(ast, function(node) {
		var func = node.__parentFunc || toplevel;
		switch (node.type) {
			case "FunctionDeclaration":
			case "FunctionExpression":
				var newFunc = new Func(node);
				func.add(newFunc);
				setParents(node, newFunc);
				break;
			default:
				setParents(node, func);
		}
	});
	return toplevel;
}

/**
 * Converts Func to the outline model required by Orion outline renderer
 * @returns {OutlineModel}
 */
function toOutlineModel(/**Func*/ functionTree, isTop) {
	function names(a) {
		return a.name;
	}
	var name = functionTree.name || "function",
	    args = functionTree.args ? functionTree.args.map(names).join(", ") : "",
	    startOffset = functionTree.loc ? functionTree.loc[0] : -1;
	var element = {
		label: name + "(" + args + ")",
		start: startOffset
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
 
/**
 * @returns {OutlineModel}
 */
function getOutline(buffer, title) {	
	// TODO fix bug 369442 and remove this line-counting
	var start = +new Date(),
	    tree,
	    end;
	try {
		var ast = mEsprima.parse(buffer, {range: true});
		tree = toFunctionTree(ast);
		end = +new Date() - start;
		//console.log(end);
	} catch (e) {
		console.debug("Error parsing file: " + e);
		console.log(e.stack);
		return [/* TODO can we get a partial result, as with jslint? */];
	}
	return toOutlineModel(tree, true);
}

//mJsOutline.validationService = {
//	checkSyntax: function(title, buffer) {
//		var errors = [];
//		try {
//			parser.parse(buffer, true /*strict*/, true /*give tokens*/);
//		} catch (e) {
//			errors.push({
//				reason: e.message,
//				line: e.line + 1,
//				character: e.col
//			});
//		}
//		return { errors: errors };
//	}
//};

	return {
		getOutline: getOutline
	};
});