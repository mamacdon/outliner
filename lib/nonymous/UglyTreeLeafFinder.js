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

  // Prototypical inheritance
  var UglyTreeLeafFinder = Object.create(UglyWalker);

  //--------------------------------------------------------------------------
  // binary search in |array| with API this.visitAny(entry)
  
    UglyTreeLeafFinder.searchArrayForMark = function(array) {
      if (array.length) {
        return this.binarySearchForMark(array, 0, array.length - 1);
      } else {
        return 0; // keep looking
      }
    };
    
    UglyTreeLeafFinder.binarySearchForMark = function(array, low, high) {
      if (high < low) {
        throw new Error("ParseTreeLeafFinder bug, array bounds out of order");
      }
      var mid = low + Math.floor( (high - low) / 2);
      var midDistance = this.visitAny(array[mid]);
      if (midDistance < 0) {  // the mark is behind mid' range
        if (mid === low) { // there is nothing behind mid
          return midDistance;
        } else {
          return this.binarySearchForMark(array, low, mid - 1);
        }
      } else if (midDistance > 0) {  // the mark is ahead of mid's range
        if (mid === high) { // there is nothing ahead of mid
          return midDistance;
        } else {
          return this.binarySearchForMark(array, mid + 1, high);
        }
      } else {  // the mark is in mid's range
        return midDistance;
      }
    };
    
    UglyTreeLeafFinder.compareMark = function(uglyArray) {
      if (uglyArray[0] && uglyArray[0].start) {
        var nodeWithToken = uglyArray[0];
        var cmp = this.getDistanceToMark(nodeWithToken);
        if (cmp === 0) {
          this.pathToIndex = this.getStack().slice(0); // clone one level deep
          console.log("ParseTreeLeafFinder found mark "+this.mark+" at depth "+this.pathToIndex.length, this.pathToIndex);
        }
        return cmp;
      } else {
        console.error("compareMark did not get a NodeWithToken container", uglyArray);
        return 0;
      }
    };
    
    //    mark       range           another mark
    //    |<------[xxxxxxxx]-------->|
    //      behind     0      ahead
    UglyTreeLeafFinder.getPosDistanceToMark = function(mark, uglyNodeWithToken) {
      var distanceBehind = uglyNodeWithToken.start.pos - mark; // start is inclusive
      if (distanceBehind > 0) {
        return -distanceBehind;
      }
      var distanceAhead = mark - (uglyNodeWithToken.end.pos - 1);  // end is exclusive
      if (distanceAhead > 0) {
        return distanceAhead;
      } 
      return 0;
    };

    UglyTreeLeafFinder.getLineDistanceToMark = function(line, col, uglyNodeWithToken) {
      var distanceBehind = uglyNodeWithToken.start.line - line; // start is inclusive
      if (distanceBehind === 0) {
        distanceBehind = uglyNodeWithToken.start.col - col;
      }
      if (distanceBehind > 0) {
        return -distanceBehind;
      }
      var distanceAhead = line - (uglyNodeWithToken.end.line - 1);  // end is exclusive
      if (distanceAhead === 0) {
        distanceAhead = col - (uglyNodeWithToken.end.col - 1);
      }
      if (distanceAhead > 0) {
        return distanceAhead;
      } 
      return 0;
    };
  // -------------------------------------------------------------------------
  // Overrides
  

  UglyTreeLeafFinder.seekInStatements = UglyTreeLeafFinder.searchArrayForMark;
  UglyTreeLeafFinder.visitAny = UglyWalker.seekInStatement;

  // -------------------------------------------------------------------------
  // API
  UglyTreeLeafFinder.visitPathToLine = function(oneBasedLine, oneBasedColumn, uglifyAstArray, fncOfArrUglifyArray) {
    var line = oneBasedLine - 1;
    var col = oneBasedColumn - 1;
    this.visitPath(this.getLineDistanceToMark.bind(this, line, col), uglifyAstArray, fncOfArrUglifyArray);
  };
  
  UglyTreeLeafFinder.visitPathToIndex = function(zeroBasedCharacterIndex, uglifyAstArray, fncOfArrUglifyArray) {
    this.visitPath(this.getPosDistanceToMark.bind(this, zeroBasedCharacterIndex), uglifyAstArray, fncOfArrUglifyArray);
  };
  
  // --------------------------------------------------------------------------
  UglyTreeLeafFinder.visitPath = function(getDistanceToMark, uglifyAstArray, fncOfArrUglifyArray) {
    var walker = Object.create(UglyTreeLeafFinder);
    walker.getDistanceToMark = getDistanceToMark;
    walker.processStatement = function(statement, path) {
      if (statement[0] && statement[0].start) {
        /* var low = statement[0].start.pos;
        var hi = statement[0].end.pos;
        var pos = low + " <? " + zeroBasedCharacterIndex + " <? " + hi;
        console.log("UglyTreeLeafFinder sees "+walker.getType(statement)+" at line "+statement[0].start.line + " pos: "+pos);
        */
        return  this.compareMark(statement);
      } else {
        return 0;
      }
    };
    
    walker.seekInStatement(uglifyAstArray);
    
  };

  return UglyTreeLeafFinder;

}));