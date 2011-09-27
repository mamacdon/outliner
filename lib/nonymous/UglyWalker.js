// See license.txt, BSD
// Copyright 2011 Google, Inc. author: johnjbarton@google.com

/*
 * Uglify AST walker
 *  
 */
 
define([],function UglyWalker() {

  var UglyWalker = {
    namingStack: []  
  };

  UglyWalker.getType = function(uglyArray) {
    return uglyArray[0] ? uglyArray[0].toString(): null;  // if embed_tokens === true, type is NodeWithToken 
  };

  UglyWalker.getStack = function() {
    return this.namingStack;
  };

  UglyWalker.pushParent = function(uglyArray) {
    this.namingStack.push(uglyArray);
  };

  UglyWalker.popParent = function() {
    var popped = this.namingStack.pop();
  };
  
  // ----------------------------------------------------------------------------------------------
  // BranchActions must all return 0 or false the walker will stop.
  
  UglyWalker.branchActions = {};
  UglyWalker.branchActions.LITERAL = function(val) {
    return 0;
  };
  
  UglyWalker.branchActions.NODE = function(val) {
    // recurse in to children
    return this.seekInStatement(val);
  };
  
  UglyWalker.branchActions.ARRAY = function(val) {
    // recurse into entries
    return this.seekInStatements(val);
  };
  
  UglyWalker.branchActions.PAIRS = function(statements) {
    // recurse into children, pairs are [[name, node]...]
    var rc = 0;
    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];
      // ['pair', LITERAL, NODE]
      rc = this.seekInStatement(['pair', statement[0], statement[1]]);
      if ( rc !== 0 ) {
        break;
      }
    } 
    return rc;
  };

  UglyWalker.branchActions.CATCH = function(val) {
    // TODO rewrite as ['catch', 'name', 'block']
    this.pushParent(this.getType(val));
    var rc = this.seekInStatements(val[1]);
    this.popParent();
    return rc;
  };
  
  UglyWalker.branchActions.CASES = function(cases) {
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
    return this.seekInStatements(caseStatements);
  };
  
  UglyWalker.branchActions.DECLS = function(declarations) {
    // eg: var Baz = Bar = function() {};
    var rc = 0;
    for (var i = 0; i < declarations.length; i++) {
      var declaration = declarations[i];
      
      var statement = declaration[1];  // each decl has a name an
      if (statement) {
        var decl = ['decl'].concat(declaration);
        rc = this.seekInStatement(decl);
        if (rc !== 0) {
          break;
        }
      }  // else declaration with no initializer, eg  var foo; 
    }
    return rc;
  };

  //-----------------------------------------------------------------------------------------------
  // We walk the syntax tree from the root downward.
  // For each node in the syntax tree we look up the node type (cell 0) in the typeToBranch table
  // and then operate on the node's branch data (cell 1,...) based on the entry. Each entry has two 
  // values for each branch data value: a label for the branch and an action for that branch.
  // Blocks, array entries, declaration lists, switch cases, and catch clauses are all special 
  // cases. The listy special cases are array of arrays (.length but no type).
  // This entire approach copies https://github.com/joehewitt/transformjs/lib/transformjs.js
  
  UglyWalker.createTypeToBranch = function(branchActions) {
    var LITERAL = branchActions.LITERAL;
    var ARRAY = branchActions.ARRAY;
    var PAIRS = branchActions.PAIRS;
    var NODE = branchActions.NODE;
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
        'toplevel': ['statements', ARRAY],
        'seq': ['left', NODE, 'right', NODE],
        'debugger': [],
        'do': ['conditional', NODE, 'block', ARRAY],
        'with': ['expr', NODE, 'block', ARRAY],
        'const': ['decls', DECLS]
      };
   };

  UglyWalker.getTypeToBranch = function(statementType) {
    var typeToBranch = this.typeToBranch || this.createTypeToBranch(this.branchActions);
    return typeToBranch[statementType];
  };
  
  //-----------------------------------------------------------------------------------------------
  
  UglyWalker.getBranches = function(statement) {
    var statementType = this.getType(statement);
    var branches = this.getTypeToBranch(statementType);
    if (!branches) {
      throw new Error("Nonymous ERROR: no branches for "+statementType+" statement "+statement);
    }
    return branches;
  };
 
  UglyWalker.processStatement = function(statement, namingStack) {
    // To be implemented by dependent
    return 0;
  };
 
  // ----------------------------------------------------------------------------------------------
  // All the uglyArrays pass through this function
  
  UglyWalker.seekInStatement = function(statement) {
    var rc = this.processStatement(statement, this.getStack());
    if (rc !== 0) {   // the goal is behind or ahead of us
       return rc;     // try elsewhere 
    } //  else the goal is within this node
    
    var branches = this.getBranches(statement);
    if (!branches) {
      return true;
    }
    // establish the current parent for the branch processing
    this.pushParent(statement);  
    
    // iterate the branches and statement parts in tandem
    var statementPartIndex = 1; // [0] is the typeName
    for (var i = 0; i < branches.length; i += 2) {
      var statementPart = statement[statementPartIndex++];
      if (statementPart) {
          var branchName = branches[i];           // eg 'condition' for first branch of 'if'
          var branchAction = branches[i+1];       // eg NODE for first branch of 'if;'
          rc = branchAction.apply(this,[statementPart]);
          if (rc !== 0) {  // While processing the child we discovered we are outside the goal
            break;
          }
      } // else null function name or var without initiailizer...
    }
    // all branches at this level are done.
    this.popParent();
    return rc;
  };
   
  // Blocks, decls, case switch statements
  UglyWalker.seekInStatements = function(statements) {
    var rc = 0;
    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];
      rc = this.seekInStatement(statement);
      if (rc !== 0) {
        break;
      }
    }
    return rc;
  };
  
  return UglyWalker;
  
}); // end of define
