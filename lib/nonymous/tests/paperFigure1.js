  var main = function() {        // 1. main
   var foo = new Foo(
      function(){                // 2. main/foo<
        this.welcome = "Hi!";
      });
   var bar = new Bar("GoodBye.");
   console.log(foo.welcome);
   console.log(bar.message);
  };
  var Foo = function(){          // 3. Foo<
    var instances;
    return function(initializer){     // 4. Foo
        instances++;
        initializer.apply(this);
      };
  }();
  var Baz = Bar = function(msg){  // 5. Bar
    this.message = msg;
  }
