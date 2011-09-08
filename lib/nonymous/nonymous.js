// See license.txt, BSD
// Copyright 2011 johnjbarton@google.com

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

})(function definition(serverSideRequire, exports, module) {

var Nonymous = {
    debug: true,
    isPartOfSep: '.',
    isContributesToSep: '<',
    isInArgSummarySep: '^',
    argSummaryClip: 15,
};

function getType(uglyArray) {
  return uglyArray[0] ? uglyArray[0].toString(): null;  // if embed_tokens === true, type is NodeWithToken 
}

// ------------------------------------------------------------------------------------------------
// Root to leaf pass, from statements to branches looking for functions
  
  // ----------------------------------------------------------------------------------------------
  // As we descend we record the path back to the root. When reversed this gives the 
  // parents of the function node at the time we find it. That way we don't need to 
  // make a pass over the tree to set the parent pointers and we don't have to store them.
  //
  var namingStack = [];  
  
  function pushParent(uglyArray) {
    namingStack.push(uglyArray);
    if (false && Nonymous.debug) {
      console.log("namingStack("+namingStack.length+") pushed "+getType(uglyArray));
    }
  }

  function popParent() {
    var popped = namingStack.pop();
    if (false && Nonymous.debug) console.log("namingStack("+(namingStack.length)+") popped "+getType(popped));
  }
  
  // ----------------------------------------------------------------------------------------------
  // BranchActions
  
  var LITERAL = function(val) {
    // Literal nodes have no functions
    return;   
  };
  
  var NODE = function(val) {
    // recurse in to children
    seekFunctionsInStatement(val);
  };
  
  var ARRAY = function(val) {
    // recurse into entries
    seekFunctionsInStatements(val);
  };
  
  var PAIRS = function(statements) {
    // recurse into children, pairs are [[name, node]...]
    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];
      // ['pair', LITERAL, NODE]
      seekFunctionsInStatement(['pair', statement[0], statement[1]]);
    } 
  };

  var CATCH = function(val) {
    // TODO rewrite as ['catch', 'name', 'block']
    pushParent(getType(val));
    seekFunctionsInStatements(val[1]);
    popParent();
  };
  
  var CASES = function(cases) {
    // re-write the node to expand it
    var caseStatements = [];
    for (var i = 0; i < cases.length; i++) {
      var aCase = cases[i];
      // ['case', 'condition',  'block']
      var caseStatement = ['case', getType(aCase), aCase[1]];
      caseStatements.push(caseStatement);
    }
    seekFunctionsInStatements(caseStatements);
  };
  
  var DECLS = function(declarations) {
    // eg: var Baz = Bar = function() {};
    for (var i = 0; i < declarations.length; i++) {
      var declaration = declarations[i];
      
      var statement = declaration[1];  // each decl has a name an
      if (statement) {
        var decl = ['decl'].concat(declaration);
        seekFunctionsInStatement(decl);
      }  // else declaration with no initializer, eg  var foo; 
    }
  };
  //-----------------------------------------------------------------------------------------------
  // To find functions we walk the syntax tree from the root downward.
  // For each node in the syntax tree we look up the node type (cell 0) in the typeToBranch table
  // and then operate on the node's branch data (cell 1,...) based on the entry. Each entry has two 
  // values for each branch data value: a label for the branch and an action for that branch.
  // Blocks, array entries, declaration lists, switch cases, and catch clauses are all special 
  // cases. The listy special cases are array of arrays (.length but no type).
  // This entire approach copies https://github.com/joehewitt/transformjs/lib/transformjs.js
  
  var typeToBranch = {  // BranchName/BranchAction for each Uglify statement type
    'num': ['value', LITERAL],
    'string': ['value', LITERAL],
    'regexp': ['value', LITERAL, 'flags', LITERAL],
    'array': ['items', ARRAY],
    'object': ['items', PAIRS],
    'name': ['name', LITERAL],
    'stat': ['expr', NODE],
    'block': ['statements', ARRAY],
    'var': ['decls', DECLS],
    'decl': ['left', LITERAL, 'right', NODE],
    'pair': ['left', LITERAL, 'right', NODE],
    'assign': ['um', LITERAL, 'left', NODE, 'right', NODE],
    'unary-prefix': ['op', LITERAL, 'expr', NODE],
    'unary-postfix': ['op', LITERAL, 'expr', NODE],
    'binary': ['op', LITERAL, 'left', NODE, 'right', NODE],
    'conditional': ['condition', NODE, 'ifBlock', NODE, 'elseBlock', NODE],
    'call': ['left', NODE, 'args', ARRAY],
    'new': ['expr', NODE, 'args', ARRAY],
    'dot': ['left', NODE, 'right', LITERAL],
    'sub': ['left', NODE, 'right', NODE],
    'defun': ['name', LITERAL, 'args', LITERAL, 'block', ARRAY],
    'function': ['name', LITERAL, 'args', LITERAL, 'block', ARRAY],
    'return': ['expr', NODE],
    'continue': [],
    'break': [],
    'if': ['condition', NODE, 'ifBlock', NODE, 'elseBlock', NODE],
    'for-in': ['iter', NODE, 'left', NODE, 'right', NODE, 'block', NODE],
    'for': ['init', NODE, 'condition', NODE, 'increment', NODE, 'block', NODE],
    'while': ['condition', NODE, 'block', NODE],
    'try': ['try', ARRAY, 'catch', CATCH, 'finally', ARRAY],
    'switch': ['expr', NODE, 'cases', CASES],
    'label': ['name', LITERAL],
    'case': ['condition', NODE, 'block', NODE],  // ast is dynamically extended to add this node
   };

  //-----------------------------------------------------------------------------------------------

  // As we walk down we find functions and process them into names here.
  //  statement type is 'function' or 'defun'
  function setFunctionName(statement) {
    if (Nonymous.debug) {
      var msg = "setFunctionName found a function when naming stack depth "+namingStack.length+"[";
      namingStack.forEach(function pushName(uglyArray){
        msg += getType(uglyArray)+", ";
      });
      msg += "]";
      console.log(msg, {namingStack:namingStack});
    }
    var name = statement[1];
    if (!name) { // anonymous function
      name = Nonymous.getExpressionName(statement, namingStack.slice(0).reverse());
    }
    
    if (Nonymous.debug) {
      console.log(" and the name is.... "+name);
    }
    var loc = (statement.loc || statement[0]).start;
    Nonymous.names.push({name:name, line: loc.line, col: loc.col, pos: loc.pos});
  }
  
  function getBranches(statement) {
    return typeToBranch[getType(statement)];
  }
 
  function seekFunctionsInStatement(statement) {
    var type = getType(statement);
    if (type === 'function' || type === 'defun') {
      setFunctionName(statement);
    }

    var branches = getBranches(statement);
    if (!branches) {
      console.log("Nonymous ERROR: no branches for statement "+statement);
      return;
    }
    
    // establish the current parent for the branch processing
    pushParent(statement);  
    
    // iterate the branches and statement parts in tandem
    var statementPartIndex = 1; // [0] is the typeName
    for (var i = 0; i < branches.length; i += 2)
    {
      var statementPart = statement[statementPartIndex++];
      if (statementPart) {
        var branchName = branches[i];           // eg 'condition' for first branch of 'if'
        var branchAction = branches[i+1];       // eg NODE for first branch of 'if;'
        branchAction(statementPart);
      } // else null function name or var without initiailizer...
    }
    // all branches at this level are done.
    popParent();
  }
  
  // Blocks, decls, case switch statements
  function seekFunctionsInStatements(statements) {
    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];
      seekFunctionsInStatement(statement);
    }
  }
  
  // ----------------------------------------------------------------------------------------------
  // API: 
  //  @param: ast output of UglifyJS parser-js parse.
  //  @return: [{name: "foo", line: 4, col: 43, pos: 120}, ...]
  Nonymous.getNames = function(ast) {
    Nonymous.names = [];
    seekFunctionsInStatements(ast[1]); // "toplevel" is one statement
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
    console.error("Function naming algorithm error, no expression algorithm for node ", getType(uglyArray));
    throw new Error("Function naming algorithm error, no expression algorithm for node "+getType(uglyArray));
    // or just return 'failed'
  };
  
  // The type node is not useful in forming a name
  var skipParent = function(uglyArray) {
    return "";
  }
  
  function generateName(uglyArray) {
    var generator = parentTypeToExpressionGenerator[getType(uglyArray)];
    if (generator) {
      return generator(uglyArray);
    } else {
      console.error("Nonymous: no expression generator for "+getType(uglyArray), uglyArray);
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
  function getNameExpression(declFunctionCallOrAssignment) {
    var name = "";
    var type = getType(declFunctionCallOrAssignment);
    if (type === 'decl' || type === 'pair') { // 'decl': ['left', LITERAL, 'right', NODE],
      // 'left node is literal, just return it as name
      var name = declFunctionCallOrAssignment[1];   
      return name;
    } else if (type === 'assign') {     // 'assign': ['um', LITERAL, 'left', NODE, 'right', NODE],
      // build name from 'left' node, see table 4, case 3
      var nameBranch = declFunctionCallOrAssignment[2]; 
      return generateName(nameBranch);
    } else if (type === 'call' ) {     // 'call': ['left', NODE, 'args', ARRAY],
      // build name from 'left' node, see table 4, case 2
      var nameBranch = declFunctionCallOrAssignment[1]; 
      return generateName(nameBranch);
    } else {
      console.log("getNameExpression ERROR not decl, function call, or assignment "+declFunctionCallOrAssignment);
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
    // 'object': ['items', PAIRS], can't be a parent, pair can be. 
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
    // 'return': ['expr', NODE], statement not expression
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
        var parentType = getType(parent);
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
      if (Nonymous.debug) {
        console.log("Nonymous next node "+getType(nextNode), {nextNode: nextNode});  
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
        var parentType = getType(parentNode);
        if (parentType === 'return') {  
          // special case immediate function. Are we in a function being called?
          var maybeImmediate = this.getParentNode(parentNode);
          var maybeImmediateType = getType(maybeImmediate);
          if (maybeImmediateType === "function") {
            maybeImmediate = this.getParentNode(maybeImmediate);
            maybeImmediateType = getType(maybeImmediate);
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
  
  function convertToName(infos) {
    
    var name = "";
    var callName = "";
    for(var i = 0; i < infos.length; i++) {
      var info = infos[i];
      if (info.isCall) {
        callName = info.id + '(' + info.argSummary + ')';
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
    if (!name) {
      name = callName; // we use function-call only if we have nothing else
    }
    return name;
  }
  
  var FunctionInfo = function(iter, node) {
    this.parent = iter.getParentNode(node);
    this.parentType = getType(this.parent);
    
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
  
  Nonymous.getExpressionName = function(node, parents) {
    var summary = [];
    
    var iter = new NodeIterator(node, parents);
    while (iter.hasNextNode()) {
      var functionInfo = new FunctionInfo(iter, node);
      summary.push(functionInfo);
      node = iter.getNextNode();
    }
    // At this point the node parent is not an expression
    var functionInfo = new FunctionInfo(iter, node);
    if (functionInfo.parentType === "assign" ||
            functionInfo.parentType === "decl" ||
            functionInfo.parentType === "pair") {
      functionInfo.isAssignment = true;
      functionInfo.id = getNameExpression(functionInfo.parent);
      summary.push(functionInfo);
    }
    if (Nonymous.debug) {
      console.log("Nonymous summary ", summary);  
    }
    
    return convertToName(summary.reverse());
  };
  
  if (module) {
    module.exports = Nonymous;
  }
  return Nonymous;
  
});  // end of definition and immediate call to definer
