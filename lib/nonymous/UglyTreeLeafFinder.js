// Find a path from the top of the Uglify AST to the leaf enclosing a character offset
// Useful for syntax highlighting viewports and call stack -> tree for examples.
// See license.txt, BSD
// Copyright 2011 Google, Inc. author: johnjbarton@google.com

// requires uglyWalker.js

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
        UglyTreeLeafFinder = definition(undefined, {}, {});
    }

}(function definition(serverSideRequire, exports, module) {

  // Namespace (and ctor)
  function UglyTreeLeafFinder(zeroBasedCharacterIndex, uglifyAstArray, fncOfArrUglifyArray) {
    this.mark = zeroBasedCharacterIndex;
    this.ast = uglifyAstArray;
    this.callback = fncOfArrUglifyArray;
    this.nestingStack = []; // path to leaf that encloses mark
  }

  // -------------------------------------------------------------------------
  // API
  UglyTreeLeafFinder.visitPathToIndex = function(zeroBasedCharacterIndex, uglifyAstArray, fncOfArrUglifyArray) {
    var walker = new UglyWalker();
    walker.processStatement = function(statement, path) {
      if (statement[0] && statement[0].start) {
        console.log("UglyTreeLeafFinder sees "+walker.getType(statement)+" at "+statement[0].start.line);
      }
    };
    
    walker.seekInStatement(uglifyAstArray);
  };
  
  return UglyTreeLeafFinder;

}));