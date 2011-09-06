

var x = 1;
x = function(){};
// x

x = window.addEventListener("something", {onFoo: function(){}});
// x<onFoo

x = window.addEventListener('load', function(event) {}, false);
// x<(load-fal)

addEventListener('load', function(event) {}, false);
// addEventListener(load-fals);