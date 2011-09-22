// See license.txt, BSD
// Copyright 2011 Google, Inc. author: johnjbarton@google.com

/*
 * Uglify AST walker
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
        UglyWalker = definition(undefined, {}, {});
    }

}(function definition(serverSideRequire, exports, module) {

  function UglyWalker(){
    this.namingStack = [];  
  }

  UglyWalker.prototype.getType = function(uglyArray) {
    return uglyArray[0] ? uglyArray[0].toString(): null;  // if embed_tokens === true, type is NodeWithToken 
  };

  UglyWalker.prototype.pushParent = function(uglyArray) {
    this.namingStack.push(uglyArray);
  };

  UglyWalker.prototype.popParent = function() {
    var popped = this.namingStack.pop();
  };
  
  // ----------------------------------------------------------------------------------------------
  // BranchActions
  UglyWalker.prototype.branchActions = {};
  UglyWalker.prototype.branchActions.LITERAL = function(val) {
    // Literal nodes have no functions
    return;   
  };
  
  UglyWalker.prototype.branchActions.NODE = function(val) {
    // recurse in to children
    this.seekInStatement(val);
  };
  
  UglyWalker.prototype.branchActions.ARRAY = function(val) {
    // recurse into entries
    this.seekInStatements(val);
  };
  
  UglyWalker.prototype.branchActions.PAIRS = function(statements) {
    // recurse into children, pairs are [[name, node]...]
    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];
      // ['pair', LITERAL, NODE]
      this.seekInStatement(['pair', statement[0], statement[1]]);
    } 
  };

  UglyWalker.prototype.branchActions.CATCH = function(val) {
    // TODO rewrite as ['catch', 'name', 'block']
    this.pushParent(this.getType(val));
    this.seekInStatements(val[1]);
    this.popParent();
  };
  
  UglyWalker.prototype.branchActions.CASES = function(cases) {
    // re-write the node to expand it
    var caseStatements = [];
    for (var i = 0; i < cases.length; i++) {
      var aCase = cases[i];
      // ['case', 'condition',  'block']
      var caseStatement = ['case', aCase[0], ['block', aCase[1]] ];
      caseStatements.push(caseStatement);
      if (aCase.length > 2) {
        throw new Error("Nonymous a case statement with more than 2 sub nodes", aCase);
      }
    }
    this.seekInStatements(caseStatements);
  };
  
  UglyWalker.prototype.branchActions.DECLS = function(declarations) {
    // eg: var Baz = Bar = function() {};
    for (var i = 0; i < declarations.length; i++) {
      var declaration = declarations[i];
      
      var statement = declaration[1];  // each decl has a name an
      if (statement) {
        var decl = ['decl'].concat(declaration);
        this.seekInStatement(decl);
      }  // else declaration with no initializer, eg  var foo; 
    }
  };

  //-----------------------------------------------------------------------------------------------
  // We walk the syntax tree from the root downward.
  // For each node in the syntax tree we look up the node type (cell 0) in the typeToBranch table
  // and then operate on the node's branch data (cell 1,...) based on the entry. Each entry has two 
  // values for each branch data value: a label for the branch and an action for that branch.
  // Blocks, array entries, declaration lists, switch cases, and catch clauses are all special 
  // cases. The listy special cases are array of arrays (.length but no type).
  // This entire approach copies https://github.com/joehewitt/transformjs/lib/transformjs.js
  
  UglyWalker.prototype.createTypeToBranch = function(branchActions) {
    var LITERAL = branchActions.LITERAL;
    var ARRAY = branchActions.ARRAY;
    var PAIRS = branchActions.PAIRS;
    var NODE = branchActions.NODE;
    var DECLS = branchActions.DECLS;
    var CATCH = branchActions.CATCH;
    var DECLS = branchActions.DECLS;
    var CATCH = branchActions.CATCH;
    var CASES = branchActions.CASES;
      return {  // BranchName/BranchAction for each Uglify statement type
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
        'throw': ['expr', NODE],
        'toplevel': ['statements', ARRAY]
      };
   };

  UglyWalker.prototype.getTypeToBranch = function(statementType) {
    var typeToBranch = this.typeToBranch || this.createTypeToBranch(this.branchActions);
    return typeToBranch[statementType];
  };
  
  //-----------------------------------------------------------------------------------------------
  
  UglyWalker.prototype.getBranches = function(statement) {
    var statementType = this.getType(statement);
    var branches = this.getTypeToBranch(statementType);
    if (!branches) {
      throw new Error("Nonymous ERROR: no branches for "+statementType+" statement "+statement);
    }
    return branches;
  };
 
  UglyWalker.prototype.processStatement = function(statement, namingStack) {
    // To be implemented by dependent
  };
 
  // ----------------------------------------------------------------------------------------------
  // We work from root to leaf from statements to branches looking for functions
  // As we descend we record the path back to the root. When reversed this gives the 
  // parents of the function node at the time we find it. That way we don't need to 
  // make a pass over the tree to set the parent pointers and we don't have to store them.
  //
 
  UglyWalker.prototype.seekInStatement = function(statement) {
    this.processStatement(statement, this.namingStack);

    var branches = this.getBranches(statement);
    if (!branches) {
      return;
    }
    // establish the current parent for the branch processing
    this.pushParent(statement);  
    
    // iterate the branches and statement parts in tandem
    var statementPartIndex = 1; // [0] is the typeName
    for (var i = 0; i < branches.length; i += 2)
    {
      var statementPart = statement[statementPartIndex++];
      if (statementPart) {
        var branchName = branches[i];           // eg 'condition' for first branch of 'if'
        var branchAction = branches[i+1];       // eg NODE for first branch of 'if;'
        branchAction.apply(this,[statementPart]);
      } // else null function name or var without initiailizer...
    }
    // all branches at this level are done.
    this.popParent();
  };
  
  // Blocks, decls, case switch statements
  UglyWalker.prototype.seekInStatements = function(statements) {
    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];
      this.seekInStatement(statement);
    }
  };
  
  if (module) {
    module.exports = UglyWalker;
  }
  return UglyWalker;
  
}));  // end of definition and immediate call to definer
