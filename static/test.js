var requestAnimationFrameFunction =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };

if (window.parent && window.parent.__robohornet__ && window.location.search == '?use_test_runner') {
  document.body.appendChild(document.createTextNode('Running test using test runner...'));
  window.parent.__robohornet__.benchmarkLoaded();
} else {

  document.body.appendChild(document.createTextNode('Running test standalone...'));

  resetMathRandom();
  setUp();
  window.setTimeout(function() {
    if (window['testAsync']) {
      var startTime = new Date().getTime();
      var deferred = {
        startTime: 0,
        resolve: function() {
          var endTime = new Date().getTime();
          document.body.appendChild(document.createTextNode('Ran test in ' + (endTime - startTime) + ' ms.'));
        }
      };
      window['testAsync'](deferred);
    } else {
      var startTime = new Date().getTime();
      window['test']();
      var endTime = new Date().getTime();
      document.body.appendChild(document.createTextNode('Ran test in ' + (endTime - startTime) + ' ms.'));
    }
  }, 0);
}

// To make the benchmark results predictable, we replace Math.random with a
// 100% deterministic alternative.
function resetMathRandom() {
  Math.random = (function() {
    var seed = 49734321;
    return function() {
      // Robert Jenkins' 32 bit integer hash function.
      seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
      seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
      seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
      seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
      return (seed & 0xfffffff) / 0x10000000;
    };
  })();
}

