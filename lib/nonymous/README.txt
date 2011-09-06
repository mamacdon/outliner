Function Object Creation for Naming Anonymous JavaScript Functions, in Uglify

http://code.google.com/p/querypoint-debugging/downloads/detail?name=NamingJSFunctions.pdf

    // We parse the JavaScript ...
    var ast = exports.parse(src, false, ".loc");
    
    // and search the resulting syntax tree for function body nodes.
    var infos = Nonymous.getNames(ast);

The result is an array of {name: string, line: number, col: number}.

//----------------------------------------------------------------------------------

The subdirectories use fake get submodule:
http://debuggable.com/posts/git-fake-submodules:4b563ee4-f3cc-4061-967e-0e48cbdd56cb

uglify:
git clone https://github.com/johnjbarton/UglifyJS.git 
git checkout v1.0.6
git add UglifyJS/
----------------^ Note slash

