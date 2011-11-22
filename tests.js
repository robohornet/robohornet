// Array of arrays, [filename, baseline, weight]
// The weight across all tests should sum to 100.
var tests = [
    ['addcol.html', 0.05, 15.5],
    ['addrow.html', 0.005, 15.5],
    ['descendantselector.html', 0.02, 30.0],
    ['inputselect.html', 0.001, 15.5],
    ['canvas_draw.html', 0.7, 23.5]
];


var benchmarks = [
  {
      file: 'addrow.html',
      name: 'Add Rows to Table',
      description: 'Tests adding rows to an existing table',
      runs: [
        ['10 rows',     10],
        ['100 rows',   100],
        ['1000 rows', 1000]
      ],
      weight: 5,
      baselineScore: 10
  },
  
  {
      file: 'addcol.html',
      name: 'Add Columns to Table',
      description: 'Tests adding columns to an existing table',
      runs: [
        ['10 columns',     10],
        ['100 columns',   100],
        ['1000 columns', 1000]
      ],
      weight: 5,
      baselineScore: 10
  },

  {
      file: 'descendantselector.html',
      name: 'Descendant Selector',
      description: 'Tests descendant selectors at different DOM depths',
      runs: [
        ['10 nodes deep',     10],
        ['100 nodes deep',   100],
        ['1000 nodes deep', 1000]
      ],
      weight: 5,
      baselineScore: 10
  },

  {
      file: 'inputselect.html',
      name: 'Input Selection',
      description: 'Test the cost of selecting the text in an input field. In some browsers this causes a relayout which can be expensive.',
      runs: [
        ['10 nodes deep',     10],
        ['100 nodes deep',   100],
        ['1000 nodes deep', 1000]
      ],
      weight: 5,
      baselineScore: 10
  },

  {
      file: 'canvas_draw.html',
      name: '2D Canvas Draw',
      description: 'Test 2D canvas line painting.',
      runs: [
        ['100 lines', 100],
        ['1000 lines', 1000],
        ['10000 lines', 10000]
      ],
      weight: 5,
      baselineScore: 10
  }
];
