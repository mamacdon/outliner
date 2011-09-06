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
		var start = +new Date(),
		    infos,
		    end;
		try {
			var ast = parser.parse(buffer, false, true /*give tokens*/);
			infos = mNonymous.getNames(ast);
			end = +new Date() - start;
			console.dir(end);
		} catch (e) {
			console.debug("Error parsing file: " + e);
			return [/* TODO can we get a partial result, as with jslint? */];
		}
		return toOutlineModel(infos);
	}
  };
  return mJsOutline;
});