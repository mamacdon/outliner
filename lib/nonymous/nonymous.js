// See license.txt, BSD
// Copyright 2011 Google, Inc. author: johnjbarton@google.com

/*
 * Implementation of Function-object Consumption algorithm for Naming Anonymous JavaScript Functions.
 *  
 */
 
(function definer(definition) { 

    // Adapted from https://github.com/kriskowal/q/blob/master/q.js
    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // RequireJS
    if (typeof define === "function") {
        define(function (require, exports, module) {
            definition(require, exports, module);
        });
    // CommonJS
    } else if (typeof exports === "object" && typeof module === 'object') {
        definition(require, exports, module);
    // <script>
    } else {
        Nonymous = definition(undefined, {}, {});
    }

}(function definition(serverSideRequire, exports, module) {

var Nonymous = {
    debug: true,
    isPartOfSep: '.',
    isContributesToSep: '<',
    isInArgSummarySep: '^',
    isScopedSep: '/',
    isPropertySep: '.',
    argSummaryClip: 15,
};

  var uglyWalker = new UglyWalker();
  
  //-----------------------------------------------------------------------------------------------
  // Hierarchical naming: walk up through the parents to find scopes
  function  getHierarchyName(namingStack) {
    var scopes = [];
    var prevType = "";
    namingStack.forEach(function findScope(uglyArray){
        var type = uglyWalker.getType(uglyArray);
        if (Nonymous.debug === 'trace') {
          console.log("getHierarchyName found "+type, uglyArray);
        }
        var scopeName; 
        if (type === 'function') {
          scopeName = uglyArray[0].nonymousLocalName + Nonymous.isScopedSep;
        } else if (prevType === 'object' && type === 'pair') {
          scopeName = uglyArray[1]+ Nonymous.isPropertySep; // literal
        }
        if (scopeName) {
          if (Nonymous.debug === 'trace') {
            console.log("getHierarchyName scopeName "+scopeName, uglyArray);
          }
          scopes.push(scopeName);
        }
        prevType = type;
      });
    return scopes.reverse();
  }

  //-----------------------------------------------------------------------------------------------

  // As we walk down we find functions and process them into names here.
  //  statement type is 'function' or 'defun'
  function setFunctionName(statement, namingStack) {
    if (Nonymous.debug === 'trace') {
      var msg = "setFunctionName found a function when naming stack depth "+namingStack.length+"[";
      namingStack.forEach(function pushName(uglyArray){
        msg += uglyWalker.getType(uglyArray)+", ";
      });
      msg += "]";
      console.log(msg, {namingStack:namingStack});
    }
    var name = statement[1];
    var fullName; 
    if (!name) { // anonymous function
      var nameObj = Nonymous.getExpressionName(statement, namingStack.slice(0).reverse());
      name = nameObj.localName;
      fullName = nameObj.fullName;
    } else {
      fullName = getFullName(name, namingStack, namingStack[0]);
    }
    
    if (Nonymous.debug === 'trace') {
      console.log(" and the name is.... "+fullName);
    }
    var loc = (statement.loc || statement[0]).start;
    Nonymous.names.push({name:fullName, line: loc.line, col: loc.col, pos: loc.pos});
    statement[0].nonymousLocalName = name;  // save our localName result for hierarchy naming
  }
  

  // Override
  uglyWalker.processStatement = function(statement, namingStack) {
    var type = this.getType(statement);
    if (type === 'function' || type === 'defun') {
      setFunctionName(statement, namingStack);
    }
  };
   
  // ----------------------------------------------------------------------------------------------
  // API: 
  //  @param: ast output of UglifyJS parser-js parse.
  //  @param: true report errors, 'trace' log trace, else suppress
  //  @param: overrides { isPartOfSep: '.',
  //  isContributesToSep: '<',
  //  isInArgSummarySep: '^',
  //  isScopedSep: '/',
  //  isPropertySep: '.',
  //  argSummaryClip: 15,
  //  }
  //  @return: [{name: "foo", line: 4, col: 43, pos: 120}, ...]
  Nonymous.getNames = function(ast, debug, overrides) {
    Nonymous.names = [];
    Nonymous.debug = debug;
    if (overrides) {
      var keys = Object.keys(overrides);
      keys.forEach(function overrideOne(key) {
        if (Nonymous.hasOwnProperty(key)) {
          Nonymous[key] = overrides[key];
        }
      });
    }
    uglyWalker.seekInStatements(ast[1]); // "toplevel" is one statement
    return Nonymous.names;
  };

  //------------------------------------------------------------------------------------------------
  // Code generation: walk a node to convert an expression to a name for an expression
  //
  // BranchActions
  
  var getLiteral = function(uglyArray) {
    return uglyArray[1];
  };
  
  var getArraySummary = function(uglyArray) {
    return "[]"
  };
  
  var reportError = function(uglyArray) {
    console.error("Function naming algorithm error, no expression algorithm for node ", uglyWalker.getType(uglyArray));
    throw new Error("Function naming algorithm error, no expression algorithm for node "+uglyWalker.getType(uglyArray));
    // or just return 'failed'
  };
  
  // The type node is not useful in forming a name
  var skipParent = function(uglyArray) {
    return "";
  }
  
  function generateName(uglyArray) {
    var generator = parentTypeToExpressionGenerator[uglyWalker.getType(uglyArray)];
    if (generator) {
      return generator(uglyArray);
    } else {
      console.error("Nonymous: no expression generator for "+uglyWalker.getType(uglyArray), uglyArray);
      return "";
    }
  }
  var unaryPrefix = function(uglyArray) {
    return uglyArray[1] + generateName(uglyArray[2]);
  };
  
  var unaryPostfix = function(uglyArray) {
    return generateName(uglyArray[2]) + uglyArray[1];
  };
  
  var binary = function(uglyArray) {
    return generateName(uglyArray[2]) + uglyArray[1] + generateName(uglyArray[3]);
  };
  
  var conditional = function(uglyArray) {
    return generateName(uglyArray[2]) + ":" + generateName(uglyArray[3]);
  };
  
  var callFunction = function(uglyArray) {
    return generateName(uglyArray[1]) + "(" + generateName(uglyArray[2]) + ")";
  };
  
  var getProp = function(uglyArray) {
    return generateName(uglyArray[1]) + '.' + uglyArray[2];
  };
  
  var getElem = function(uglyArray) {
    return generateName(uglyArray[1]) + '[' + generateName(uglyArray[2]) +']';
  };
  
  // ----------------------------------------------------------------------------------------------
  // To create a function name we need to convert expressions to strings. This table maps 
  // ast nodes into functions that generate names as we walk the expression node
  //
  
  var parentTypeToExpressionGenerator = {  // BranchName/NamingAction for each Uglify statement type
    'num': getLiteral,
    'string': getLiteral,
    'regexp': reportError,
    'array': getArraySummary,
    'object': reportError,
    'name': getLiteral,
    'stat': reportError,
    'block': reportError,
    'var': reportError,
    'decl': reportError,
    'pair': reportError,
    'assign': reportError,
    'unary-prefix': unaryPrefix,
    'unary-postfix': unaryPostfix,
    'binary': binary,
    'conditional': conditional,
    'call': skipParent,
    'new': reportError,
    'dot': getProp,
    'sub': getElem,
    'defun': reportError,
    'function': function(){return 'function';},
    'return': reportError,
    'continue': reportError,
    'break': reportError,
    'if': reportError,
    'for-in': reportError,
    'for': reportError,
    'while': reportError,
    'try': reportError,
    'switch': reportError,
    'label': reportError,
    'case': reportError,  // ast is dynamically extended to add this node
  };

  // Section 5.3 Identifiers for Assignments and Function Calls.
  // Uglify defines declarations with '=' operators as 'decl' rather than 'assign', 
  // so we add a case
  function getNameExpression(assignmentLike, parents) {
    var name = "";
    var type = uglyWalker.getType(assignmentLike);
    if (type === 'decl') { // 'decl': ['left', LITERAL, 'right', NODE],
      // 'left node is literal, just return it as name
      name = assignmentLike[1];   
      return name;
    } else if  (type === 'pair') {
      name = assignmentLike[1];  // prop name
      var parentIndex = parents.indexOf(assignmentLike);
      var objParent = parents[parentIndex + 2];  // parent of pair is object; parent of object is decl
      var objParentType = uglyWalker.getType(objParent);
      if (objParentType === 'decl') {
        name = objParent[1] + '.' + name; // prefix the literal
      } else if (objParentType === 'assign') {
        var prefix = generateName(objParent[2]); // prefix the assignment LHS expression
        name = prefix +'.'+name;
      }
      return name;
    } else if (type === 'assign') {     // 'assign': ['um', LITERAL, 'left', NODE, 'right', NODE],
      // build name from 'left' node, see table 4, case 3
      var nameBranch = assignmentLike[2]; 
      return generateName(nameBranch);
    } else if (type === 'call' ) {     // 'call': ['left', NODE, 'args', ARRAY],
      // build name from 'left' node, see table 4, case 2
      var nameBranch = assignmentLike[1]; 
      return generateName(nameBranch);
    } else {
      console.log("getNameExpression ERROR not decl, function call, or assignment "+assignmentLike);
      return "ERROR";
    }
  }
  
  function getArgSummary(args, node) {
    var summary = "";
    var justAddedInArg = false;
    for(var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (arg === node) {
        summary += Nonymous.isInArgSummarySep;
        justAddedInArg = true;
      } else {
        var argNameSegment = generateName(arg);
        if ( !justAddedInArg && summary && (argNameSegment.length > 1) ) { // then we are building up a compound word
          summary += argNameSegment[0].toUpperCase() + argNameSegment.slice(1);
        } else {
          summary += argNameSegment;
        }
        justAddedInArg = false;
      }
    }
    var max = Math.min(summary.length, Nonymous.argSummaryClip);
    return summary.substr(0,max);
  }
  
  // The possible parent node types for forming expression-names
  // The order and format of this array is intended to follow the typeMaps for documentation
  var expressionNodeNames = [
    // 'num': ['value', LITERAL],  can't be a parent 
    // 'string': ['value', LITERAL], can't be a parent
    // 'regexp': ['value', LITERAL, 'flags', LITERAL], can't be a parent 
    'array', //: ['items', ARRAY],
    // 'object',//: ['items', PAIRS], 
    // 'name': ['name', LITERAL], can't be a parent 
    // 'stat', // : ['expr', NODE], statement not expression 
    // 'block', // : ['statements', ARRAY], can't be parent
    // 'var': ['decls', DECLS], can't be a parent, decl can be. 
    // 'decl', // : ['left', LITERAL, 'right', NODE],
    //'pair', // : ['left', LITERAL, 'right', NODE],
    // 'assign': ['um', LITERAL, 'left', NODE, 'right', NODE], statement not expression 
    'unary-prefix', // : ['op', LITERAL, 'expr', NODE],
    'unary-postfix', // : ['op', LITERAL, 'expr', NODE],
    'binary', // : ['op', LITERAL, 'left', NODE, 'right', NODE],
    'conditional', // : ['condition', NODE, 'ifBlock', NODE, 'elseBlock', NODE],
    'call', // : ['left', NODE, 'args', ARRAY],
    'new', // : ['expr', NODE, 'args', ARRAY],
    'dot', // : ['left', NODE, 'right', LITERAL],
    'sub', // : ['left', NODE, 'right', NODE],
    // 'defun', // : ['name', LITERAL, 'args', LITERAL, 'block', ARRAY], function declarations are statements
    // 'function', // : ['name', LITERAL, 'args', LITERAL, 'block', ARRAY], can't be a parent. 
    // 'return', // : ['expr', NODE], a statement not part of an expression
    // can't be a parent 'continue': [],
    // can't be a parent 'break': [],
    // 'if': ['condition', NODE, 'ifBlock', NODE, 'elseBlock', NODE], statement not expression
    // 'for-in': ['iter', NODE, 'left', NODE, 'right', NODE, 'block', NODE], statement not expression 
    // 'for': ['init', NODE, 'condition', NODE, 'increment', NODE, 'block', NODE], statement not expression 
    // 'while': ['condition', NODE, 'block', NODE], statement not expression
    // 'try': ['try', ARRAY, 'catch', CATCH, 'finally', ARRAY], statement not expression
    // 'switch': ['expr', NODE, 'cases', CASES], statement not expression  
    // 'label': ['name', LITERAL], can't be a parent 
    // 'case': ['condition', NODE, 'block', NODE],  statement not expression 
  ];
  
  var NodeIterator = function(node, parents) {
    this.nodes = [node].concat(parents);
    this.index = 0;
  };  
  
  NodeIterator.prototype = {
          
    hasNextNode: function() {
      var parentIndex = this.index + 1;
      if (parentIndex < this.nodes.length) {
        var parent = this.nodes[parentIndex];
        var parentType = uglyWalker.getType(parent);
        if (expressionNodeNames.indexOf(parentType) === -1) {  // end of while loop
          return false;
        }
      } else {
        // We should never run out of parents because the toplevel is a statement
        // and thus should have failed the expression test.
        if (Nonymous.debug) {
          console.error("Nonymous NodeIterater ran out of parents while looking at expressions", this);
        }
        throw new Error("Function naming algorithm or parser error");
      }
      return (this.index < this.nodes.length);
    },
    
    getNextNode: function() {
      this.index += 1;
      var nextNode = this.nodes[this.index]; 
      if (Nonymous.debug === 'trace') {
        console.log("Nonymous next node "+uglyWalker.getType(nextNode), {nextNode: nextNode});  
      }
      
      return nextNode;
    },
    
    getParentNode: function(node) {
      var index = this.nodes.indexOf(node);
      if (index === -1 || index > (this.nodes.length - 2) ) {
        if (Nonymous.debug) {
          console.error("Nonymous no parent for node", {NodeIterator: this, node: node}); 
        }
        throw new Error("Function naming algorithm error, no parent for node");
      }
      var parentNode = this.nodes[index + 1];
      if (parentNode) {
        var parentType = uglyWalker.getType(parentNode);
        if (parentType === 'return') {  
          // special case immediate function. Are we in a function being called?
          var maybeImmediate = this.getParentNode(parentNode);
          var maybeImmediateType = uglyWalker.getType(maybeImmediate);
          if (maybeImmediateType === "function") {
            maybeImmediate = this.getParentNode(maybeImmediate);
            maybeImmediateType = uglyWalker.getType(maybeImmediate);
            if (maybeImmediateType === "call") {
              return this.getParentNode(maybeImmediate);
            }
          }
        } 
        return parentNode;  
      }
      if (Nonymous.debug) {
        console.error("Nonymous null parent for node", {NodeIterator: this, node: node}); 
      }
      throw new Error("Function naming algorithm error, null parent for node");
    }
  };
  
  function getFullName(name, namingStack, parent) {
    var fullName = name;
    var parentIndex = namingStack.indexOf(parent);  // the parent used for naming the function
    parentIndex += 1; // it's parent
    if (parentIndex < namingStack.length) {  // then we have context to consider
      var ancestry = getHierarchyName(namingStack.slice(parentIndex));
      ancestry.push(name);
      fullName = ancestry.join('');
    }
    return fullName;
  }
  
  function convertToName(infos, namingStack) {
    
    var name = "";
    var callNameInfo;
    for(var i = 0; i < infos.length; i++) {
      var info = infos[i];
      if (info.isCall) {
        callNameInfo = info;
        continue;
      }
      if (name.isSameAs) {
        continue;
      }
      
      name += info.id || "";
      
      if (info.isAssignment) {
        name = name.replace(/([\.<])$/, "");
        continue;        
      }
      
      var lastChar = name.substr(-1);
      if (lastChar !== Nonymous.isPartOfSep) {
        name += info.isPartOf ? Nonymous.isPartOfSep : "";
      }
      if (lastChar !== Nonymous.isContributesToSep) {
        name += info.isContributesTo ? Nonymous.isContributesToSep : "";  
      }
    }
    var parent; // Hierarchy of the name depends on the consumption node
    if (!name) {
      if (callNameInfo) {
        // we use function-call only if we have nothing else
        name = callNameInfo.id + '(' + callNameInfo.argSummary + ')';
        parent = callNameInfo.parent;
      } else {  // Oops, FAIL
        console.error("Nonymous failed to name an anonymous function");
        console.trace();
        name = "NONYMOUS_FAIL";
      }
    } else {
      parent = infos[0].parent;
    }
    var fullName = getFullName(name, namingStack, parent);
    return {localName: name, fullName: fullName};
  }
  
  var FunctionInfo = function(iter, node) {
    this.parent = iter.getParentNode(node);
    this.parentType = uglyWalker.getType(this.parent);
    
    if (this.parentType === 'conditional') {
      this.isSameAs = true;
    } else if (this.parentType === 'array' || this.parentType === 'pair') {
      this.isPartOf = true;
    } else {
      this.isContributesTo = true;
    }
    
    if (this.parentType === 'call' && this.parent[1] !== node) {
      // then the node must be in args
      this.isCall = true;
      this.id = generateName(this.parent[1]);
      this.argSummary = getArgSummary(this.parent[2], node);
    }
  };
  
  Nonymous.assignmentLikeTypes = ['assign', 'decl', 'pair'];
  
  Nonymous.getExpressionName = function(node, parents) {
    var summary = [];
    
    var iter = new NodeIterator(node, parents);
    while (iter.hasNextNode()) {
      var functionInfo = new FunctionInfo(iter, node);
      summary.push(functionInfo);
      node = iter.getNextNode();
    }
    // At this point the node parent is not an expression, bottom of Algorithm 1
    var functionInfo = new FunctionInfo(iter, node);
    if (Nonymous.assignmentLikeTypes.indexOf(functionInfo.parentType) !== -1) {
      functionInfo.isAssignment = true;
      functionInfo.id = getNameExpression(functionInfo.parent, parents);
      summary.push(functionInfo);
    } else if (functionInfo.parentType === 'return') {
      // if we see 'return' we know we will create a fullName and it's consumption is our consumption.
      functionInfo.isReturn = true;
      functionInfo.id = "";
      summary.push(functionInfo);
    } else if (functionInfo.parentType === 'return') {
      // if we see 'return' we know we will create a fullName and it's consumption is our consumption.
      functionInfo.isReturn = true;
      functionInfo.id = "";
      summary.push(functionInfo);
    } else if (functionInfo.parentType === 'return') {
      // if we see 'return' we know we will create a fullName and it's consumption is our consumption.
      functionInfo.isReturn = true;
      functionInfo.id = "";
      summary.push(functionInfo);
    }
    if (Nonymous.debug === 'trace') {
      console.log("Nonymous summary ", summary);  
    }
    
    return convertToName(summary.reverse(), parents);
  };
  
  if (module) {
    module.exports = Nonymous;
  }
  return Nonymous;
  
}));  // end of definition and immediate call to definer
