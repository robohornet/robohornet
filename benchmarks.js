/**
 * Benchmark version.
 *
 * @type {string}
 */
var BENCHMARK_VERSION = 'RH100';

var TAGS = {
  "G_SPREADSHEETS" : {
    "prettyName" : "Google Spreadsheets",
    "name" : "G_SPREADSHEETS",
    "type" : robohornet.TagType.APP
  },
  "G_PRESENTATIONS" : {
    "prettyName" : "Google Presentations",
    "name" : "G_PRESENTATIONS",
    "type" : robohornet.TagType.APP
  },
  "G_MAPS" : {
    "prettyName" : "Google Maps",
    "name" : "G_MAPS",
    "type" : robohornet.TagType.APP
  },
  "TABLE" : {
    "prettyName" : "Table",
    "name" : "TABLE",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "DOM" : {
    "prettyName" : "DOM",
    "name" : "DOM",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "CSS_SELECTORS" : {
    "prettyName" : "CSS Selectors",
    "name" : "CSS_SELECTORS",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "CANVAS" : {
    "prettyName" : "Canvas",
    "name" : "CANVAS",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "SCROLLING" : {
    "prettyName" : "Scrolling",
    "name" : "SCROLLING",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "SVG" : {
    "prettyName" : "SVG",
    "name" : "SVG",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "JS" : {
    "prettyName" : "Javascript",
    "name" : "JS",
    "type" : robohornet.TagType.TECHNOLOGY
  },
  "MATH" : {
    "prettyName" : "Math",
    "name" : "MATH",
    "type" : robohornet.TagType.TECHNOLOGY
  }
}

/*
 * List of benchmakrs. Array of objects.
 *
 * name:         Short human readable name of benchmark.
 * description:  Description of benchmark.
 * filename:     Filename of benchmark, each benchmark file must implement a test
 *               function and may implement a setUp and tearDown function.
 * runs:         List of parameters to feed to test, setUp and tearDown
 *               functions. For each entry a test run is constructed and the
 *               parameter in the second field is fed to the test function.
 *               The first field is a short human readable description of the
 *               parameter.
 * weight:       Weight of test as relative to the other tests in the file.
 *               A percentage weight will be computed based on the relative
 *               weight of each benchmark.
 * baselineTime: Baseline time, in milliseconds.
 */
var benchmarks = [
  {
      name: 'Add Rows to Table',
      description: 'Tests adding rows to an existing table',
      filename: 'tests/addrow.html',
      runs: [
        ['250 rows',   250],
        ['1000 rows', 1000]
      ],
      weight: 2,
      baselineTime: 38,
      tags: [TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.DOM]
  },

  {
      name: 'Add Columns to Table',
      description: 'Tests adding columns to an existing table',
      filename: 'tests/addcol.html',      
      runs: [
        ['250 columns',   250],
        ['1000 columns', 1000]
      ],
      weight: 1,
      baselineTime: 46.5,
      tags: [TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.DOM]
  },

  {
      name: 'Descendant Selector',
      description: 'Tests descendant selectors at different DOM depths',
      filename: 'tests/descendantselector.html',
      runs: [
        ['1000 nodes deep', 1000]
      ],
      weight: 2,
      baselineTime: 47.99,
      tags: [TAGS.DOM, TAGS.CSS_SELECTORS]
  },

/*
  {
      name: 'Input Selection',
      description: 'Test the cost of selecting the text in an input field. In some browsers this causes a relayout which can be expensive.',
      filename: 'tests/inputselect.html',
      runs: [
        ['10 nodes deep',     10],
        ['100 nodes deep',   100],
        ['1000 nodes deep', 1000]
      ],
      weight: 1,
      baselineTime: 2.75
  },
*/

  {
      name: '2D Canvas Draw',
      description: 'Test 2D canvas line painting.',
      filename: 'tests/canvasdrawline.html',
      runs: [
        ['500 lines', 500],
        ['2500 lines', 2500]
      ],
      weight: 3,
      baselineTime: 461.02,
      tags: [TAGS.CANVAS, TAGS.G_PRESENTATIONS]
  },

  {
      name: 'innerHTML Table',
      description: 'Test table render speed after innerHTML.',
      filename: 'tests/createtable.html',
      runs: [
        ['200x10', [200, 10]],
        ['200x50', [200, 50]],
        ['200x100', [200, 100]]
      ],
      weight: 2,
      baselineTime: 209.895,
      tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.TABLE]
  },

  {
      name: 'Table scrolling',
      description: 'Test scrolling speed using scrollTop',
      filename: 'tests/table_scrolltop.html',
      runs: [
        ['500x10', [500, 10]],
        ['500x50', [500, 50]],
        ['1000,10', [1000, 10]],
        ['1000,50', [1000, 50]]
      ],
      weight: 1,
      baselineTime: 204.36,
      tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.SCROLLING]
  },

  {
      name: 'Resize columns',
      description: 'Test resizing columns in a table',
      filename: 'tests/resizecol.html',
      runs: [
        ['500x10', [500, 10]],
        ['500x50', [500, 50]],
        ['500x100', [500, 100]]
      ],
      weight: 2,
      baselineTime: 1892.655,
      tags: [TAGS.DOM, TAGS.TABLE, TAGS.G_SPREADSHEETS]
  },

  {
      name: 'SVG resize',
      description: 'Test resizing SVGs',
      filename: 'tests/svgresize.html',
      runs: [
        ['50 SVGs', 50],
        ['100 SVGs', 100],
        ['500 SVGs', 500]
      ],
      weight: 5,
      baselineTime: 41.43,
      tags: [TAGS.SVG, TAGS.G_PRESENTATIONS]
  },

  {
      name: 'ES5 Property Accessors',
      description: 'Test ES5 getter/setters',
      filename: 'tests/property_accessors.html',
      runs: [
        ['Getter', 'GET'],
        ['Setter', 'SET'],
        ['Combined', '']
      ],
      weight: 1,
      baselineTime: 100,
      tags: [TAGS.JS]
  },

  {
      name: 'Calculate primes',
      description: 'Test calculating primes from 2 to N',
      filename: 'tests/primes.html',
      runs: [
        ['Primes up to 1000', 1000],
        ['Primes up to 10000', 10000],
        ['Primes up to 100000', 100000]
      ],
      weight: 2,
      baselineTime: 115,
      tags: [TAGS.MATH, TAGS.G_MAPS]
  },

  {
      name: 'Argument instantiation',
      description: 'Test referencing the arguments array',
      filename: 'tests/varargs.html',
      runs: [
        ['10000 Instantiations', 10000],
        ['100000 Instantiations', 100000],
        ['100000000 Instantiations', 100000000]
      ],
      weight: 1,
      baselineTime: 100,
      tags: [TAGS.JS]
  }
];
