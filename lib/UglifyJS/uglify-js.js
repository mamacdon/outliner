/*
 * mamacdon: changes to this file
 * - Convert to requirejs
 * - Remove sync require() calls since they always throw errors, even after the modules have been loaded
 */
define(["./lib/parse-js", "./lib/process"], function(mParser, mProcess) {
var module = {};
	
//convienence function(src, [options]);
function uglify(orig_code, options){
  options || (options = {});
  var jsp = uglify.parser;
  var pro = uglify.uglify;

  var ast = jsp.parse(orig_code, options.strict_semicolons); // parse code and get the initial AST
  ast = pro.ast_mangle(ast, options.mangle_options); // get a new AST with mangled names
  ast = pro.ast_squeeze(ast, options.squeeze_options); // get an AST with compression optimizations
  var final_code = pro.gen_code(ast, options.gen_options); // compressed code here
  return final_code;
};

uglify.parser = mParser;/*require("./lib/parse-js")*/;
uglify.uglify = mProcess;/*require("./lib/process")*/;

module.exports = uglify

return uglify;
});