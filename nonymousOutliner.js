// Orion Outliner implemented using nonymous.js, the Function-Object Consumption algorithm
// This file under nonymous/license.txt, Google BSD
// Copyright 2011 Google, Inc, written by johnjbarton@google.com

define(["uglify-js", "lib/nonymous/nonymous.js"], function(mUglifyJs, mNonymous) {
  var parser = mUglifyJs.parser;
  
  // convert Nonymous output to Orion outline renderer input
  function toOutlineModel(infos) {
    var elements = [];
    infos.forEach(function (info) {
      var element = {
        label: info.name,
        line: info.line,
        column: info.col,
      };
      elements.push(element);
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
			var endTime = +(new Date());
			var deltaParse = (parsedTime - startTime);
			var deltaNaming = (endTime - parsedTime);
			var relative = Math.round( 100 * deltaNaming / (deltaNaming+deltaParse) );
			console.info("Nonymous: uglify parse: "+deltaParse+"ms, naming: "+deltaNaming+"ms "+ relative+"%");
			return toOutlineModel(infos);
	      } catch (exc) {
	        console.error("Error getting names from ast "+exc, exc.stack);
	        // bogus console.exception(exc);
	        console.error(exc);
			return [];
		  }
		}
	}
  };
  return mJsOutline;
});