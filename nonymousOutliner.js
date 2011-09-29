// Orion Outliner implemented using nonymous.js, the Function-Object Consumption algorithm
// This file under nonymous/license.txt, Google BSD
// Copyright 2011 Google, Inc, written by johnjbarton@google.com

define(["uglify-js", "lib/nonymous/nonymous.js"], function(mUglifyJs, mNonymous) {
  var parser = mUglifyJs.parser;
  
  // convert Nonymous output to Orion outline renderer input
  function toOutlineElement(name, line, col) {
    var element = {
      label: name,
      line: line,
      column: col,
      childrenByName: {}
    };
    return element;
  }
  
  function toOutlineBranch(elements, elementsByName, levels, line, col) {
    var level = levels.shift();
    if (!elementsByName[level]) {
      elementsByName[level] = toOutlineElement(level, line, col);
      elements.push(elementsByName[level]);
    }
    if (levels.length) { // then we have children to worry about
      elementsByName[level].children = elementsByName[level].children || [];
      toOutlineBranch(elementsByName[level].children, elementsByName[level].childrenByName, levels, line, col);
    }
  }
  
  function toOutlineModel(infos) {
    var elements = [];
    var elementsByName = {}; // branches will arrive before leaves
    infos.forEach(function (info) {
      var levels = info.hierarchy;
      toOutlineBranch(elements, elementsByName, levels, info.line, info.col);
    });
    return elements;
  }
  
  var mJsOutline = {};
  mJsOutline.outlineService = {
	getOutline: function(buffer, title) {
		var startTime = +new Date();
		var ast;
		try {
			ast = parser.parse(buffer, false, true /*give tokens*/);
		} catch (e) {
			console.debug("Error parsing file: " + e);
		}
		if (ast) {
		  var parsedTime = +new Date(); 
		  try {
			var infos = mNonymous.getNames(ast, mJsOutline.debug);
			var endNaming = +(new Date());
			var deltaParse = (parsedTime - startTime);
			var deltaNaming = (endNaming - parsedTime);
			var relative = Math.round( 100 * deltaNaming / (deltaNaming+deltaParse) );
			var outline = toOutlineModel(infos);
			var endOutline = +(new Date());
			var deltaOutline = (endOutline - endNaming);
			console.info("Nonymous: uglify parse: "+deltaParse+"ms, naming: "+deltaNaming+"ms "+ relative+"% outline: "+deltaOutline+"ms");
			return outline;
	      } catch (exc) {
	        console.error("Error getting names from ast "+exc, exc.stack);
	        console.error(exc);
			return [];
		  }
		}
	}
  };
  return mJsOutline;
});