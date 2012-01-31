if (window.opener && window.opener.__robohornet__ && window.location.search == '?use_test_runner') {
    document.body.appendChild(document.createTextNode('Running test using test runner...'));
    window.opener.__robohornet__.benchmarkLoaded();
} else {

    document.body.appendChild(document.createTextNode('Running test standalone...'));

    setUp();
    window.setTimeout(function() {
        var startTime = new Date().getTime();
        test();
        var endTime = new Date().getTime();
        document.body.appendChild(document.createTextNode('Ran test in ' + (endTime - startTime) + ' ms.'));
    }, 0);
}

// To make the benchmark results predictable, we replace Math.random with a
// 100% deterministic alternative.
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