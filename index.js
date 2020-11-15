// Adapted from Perlin noise for C++
//
const fade = t => {
  return t * t * t * (t * (t * 6 - 15) + 10)
}
    
const lerp = (t, a, b) => {
  return a + t * (b - a)
}
    
const grad = (hash, x, y, z) => {
  // Convert 4 bits of hash code into 12 gradient directions
  h = hash & 15
  u = h<8 ? x : y
  v = h<4 ? y : h==12||h==14 ? x : z
  return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v)
}
    
const perlinNoise = (x, y, p) => {
  z = 0.5
  
  // Find unit cube that contains point
  X = Math.floor(x) & 255
  Y = Math.floor(y) & 255
  Z = Math.floor(z) & 255

  // Find relative X, Y, Z of point in cube
  x -= Math.floor(x)
  y -= Math.floor(y)
  z -= Math.floor(z)

  // Compute fade curves for each of x, y, z
  u = fade(x)
  v = fade(y)
  w = fade(z)

  // Hash coordinates of the 8 cube corners
  A  = p[X]+Y
  AA = p[A]+Z
  AB = p[A+1]+Z
  B  = p[X+1]+Y
  BA = p[B]+Z
  BB = p[B+1]+Z

  // Add blended results from 8 corners of cube
  return lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),
                                 grad(p[BA  ], x-1, y  , z   )),
                         lerp(u, grad(p[AB  ], x  , y-1, z   ),
                                 grad(p[BB  ], x-1, y-1, z   ))),
                 lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),
                                 grad(p[BA+1], x-1, y  , z-1 )),
                         lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                 grad(p[BB+1], x-1, y-1, z-1 ))))
}

const getPermutationVector = () => {
  let p = []

  let permutation = [ 151,160,137,91,90,15,
  131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
  190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
  88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
  77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
  102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
  135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
  5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
  223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
  129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
  251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
  49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
  ]

  for (let j=0; j<2; j++) {
    for (let i=0; i<256; i++) {
      p.push(permutation[i])
    }
  }
  
  return p
}

// Sum together multiple octaves of noise
const noise2D = (x, y, p, nOctaves=4, lancunarity=2, persistence=0.5) => {
  let noise = 0
  // TODO Terrain has clear grid lines. Fix
  for (let i=0; i<nOctaves; i++) {
    scale = Math.pow(lancunarity, i)
    noise += perlinNoise(x*scale, y*scale, p) * Math.pow(persistence, i)
  }

  return noise
}
//
// END noise functions

CANVAS_WIDTH = 512
CANVAS_HEIGHT = 512

svg = null

// Add a svg element to the page, and style it
const createSvgContainer = () => {
  svg = d3.select('body')
    .append('svg')
    .attr('width', CANVAS_WIDTH)
    .attr('height', CANVAS_HEIGHT)
    .style('border', '1px solid black')

  return svg
}

const defaultExtent = {
  width: 1,
  height: 1
}

const generateRandomPoints = (n, extent=defaultExtent) => {
  // Each point is an array: [x, y]
  // Each coordinate has a "range" of `extent`, centered on 0
  // x can range from -extent.width/2 to extent.width/2
  let points = []

  // Generate n random points
  for (let i=0; i<n; i++) {
    points.push([
      (Math.random()-0.5) * extent.width,
      (Math.random()-0.5) * extent.height
    ])
  }

  return points
}

let points = generateRandomPoints(64)

// A Voronoi diagram is a partition of space into regions.
//
// Points are created and act as generators. The region of each generator
// consists of all of the points in space which are closer to that generator
// than any other according to some distance mesaure.
//
// Euclidean distance is often used, but other distance measures like Manhattan
// distance can be used for different effects.
//
// D3JS gives a function which implements Fortune's algorithm for generating a
// Voronoi diagram in O(n log n) time
const voronoi = (points, extent=defaultExtent) => {
  const w = extent.width/2
  const h = extent.height/2
  const delaunay = d3.Delaunay.from(points)
  const voronoi = delaunay.voronoi([-w, -h, w, h])
  return voronoi
}

// Lloyd's algorithm "relaxes" a Voronoi diagram by making the polygons more regular.
// It does this by moving the generator of each region towards the centroid of its region
const lloydRelax = (points, regions, iterations=1) => {
  let idx = 0
  for (let i=0; i<iterations; i++) {
    for (region of regions) {
      const centroid = d3.polygonCentroid(region)
      const dx = centroid[0] - points[idx][0]
      const dy = centroid[1] - points[idx][1]
      points[idx][0] += dx
      points[idx][1] += dy
      idx++
    }
  }

  return points
}

const makeMesh = (points, extent=defaultExtent) => {
  let verts = []   // List of [x, y] coord pairs
  let vertMap = {} // Dictionary mapping from vertex coord to verts.length
  let adj = []     // List of lists. Edges that share a coord will be in the same sub list
                   // Index is # of unique vertices that existed when the coord was added

  // Get edges of Voronoi by parsing its render method
  let vor = voronoi(points)
  let edges = vor.render().split(/M/).slice(1)
  edges.forEach(edge => {
    x = edge.split(/[L,]+/)

    // Coordinates of the two points that the edge consists of
    let edge0 = x.slice(0,2)
    let edge1 = x.slice(2)

    // Get number of unique verts that existed when this coord was added
    let e0 = vertMap[edge0]
    let e1 = vertMap[edge1]

    // Only add coord to verts if its not already a member
    if (e0 == undefined) {
      e0 = verts.length
      vertMap[edge0] = e0
      verts.push(edge0)
    }

    if (e1 == undefined) {
      e1 = verts.length
      vertMap[edge1] = e1
      verts.push(edge1)
    }

    // Create adjacency sub list for coord
    if (adj[e0] == undefined) {
      adj[e0] = []
    }

    if (adj[e1] == undefined) {
      adj[e1] = []
    }

    adj[e0].push(e1)
    adj[e1].push(e0)
  })
  verts.forEach(point => {
    drawCircle(point, 'red', radius=2)
  })

  mesh = {
    vor,
    points,
    verts,
    vertMap,
    voronoi,
    adj,
    extent
  }

  // Apply a function to all of the mesh's vertices
  mesh.map = function (f) {
    let mapped = verts.map(f)
    mapped.mesh = mesh
    return mapped
  }

  return mesh
}

const drawCircle = (point, color='black', radius=2) => {
  // Center each point on the origin and
  // scale its range to the canvas' dimensions
  svg.append('circle')
    .attr('cx', point[0] * CANVAS_WIDTH + CANVAS_WIDTH/2)
    .attr('cy', point[1] * CANVAS_HEIGHT + CANVAS_HEIGHT/2)
    .attr('r', radius)
    .attr('fill', color)
}

const drawPolygon = (points, color) => {
  points.forEach(point => {
    point[0] = point[0] * CANVAS_WIDTH + CANVAS_WIDTH/2
    point[1] = point[1] * CANVAS_HEIGHT + CANVAS_HEIGHT/2
  })
  svg.append('polygon')
    .attr('points', points.join(" "))
    .attr('fill', `rgb(${color.r},${color.g},${color.b})`)
}

const demoRandomPoints = n => {
  d3.selectAll('svg').remove()
  svg = createSvgContainer()

  points = generateRandomPoints(n)
  points.forEach(point => {
    drawCircle(point)
  })
}

const demoVoronoi = (nLloydIterations=2) => {
  d3.selectAll('svg').remove()
  svg = createSvgContainer()

  // polygons is an object
  let mesh = makeMesh(points)
  let polygons = mesh.vor.cellPolygons()

  if (nLloydIterations > 0) {
    points = lloydRelax(points, polygons, nLloydIterations)
    mesh.vor = voronoi(points)
    polygons = mesh.vor.cellPolygons()
  }

  for (const polygon of polygons) {
    color = {
      'r': Math.floor(Math.random() * 256),
      'g': Math.floor(Math.random() * 256),
      'b': Math.floor(Math.random() * 256)
    }
    drawPolygon(polygon, color)
  }

  points.forEach(point => {
    drawCircle(point, 'black', radius=2)
  })
}

const demoPerlinNoise = (nLloydIterations=2, noiseScale=2) => {
  d3.selectAll('svg').remove()
  svg = createSvgContainer()

  // polygons is an object
  let mesh = makeMesh(points)
  let polygons = mesh.vor.cellPolygons()

  if (nLloydIterations > 0) {
    points = lloydRelax(points, polygons, nLloydIterations)
    mesh.vor.update()
    polygons = mesh.vor.cellPolygons()
  }

  pv = getPermutationVector()

  let biomes = [
      [ 60, 120, 190], // Water
      [210, 215, 130], // Sand
      [ 95, 165,  30], // Grass 1
      [ 65, 115,  20], // Grass 2
      [ 90,  65,  60], // Rock 1
      [ 75,  60,  55], // Rock 2
      [255, 255, 255]  // Snow
  ]

  let heights = []
  const noiseOffsetX = (Math.random()-0.5) * 1024
  const noiseOffsetY = (Math.random()-0.5) * 1024

  points.forEach((point, i) => {
    heights.push(noise2D(
      point[0]*noiseScale+noiseOffsetX,
      point[1]*noiseScale+noiseOffsetY,
      pv
    ))
  })

  // Normalize heights to 0 to 1
  const maxHeight = Math.max(...heights)
  const minHeight = Math.min(...heights)
  const heightRange = maxHeight - minHeight

  heights.forEach((height, i) => {
    normalizedHeight = (height - minHeight) / heightRange
    heights[i] = normalizedHeight
  })

  idx = 0
  for (const polygon of polygons) {
    let biomeIndex = Math.floor(Math.min(0.99, heights[idx]) * biomes.length)
    color = {
      r: biomes[biomeIndex][0],
      g: biomes[biomeIndex][1],
      b: biomes[biomeIndex][2]
    }
    drawPolygon(polygon, color)
    idx++
  }
}

const demoMap = () => {
  d3.selectAll('svg').remove()
  svg = createSvgContainer()
  extent = defaultExtent

  // polygons is an object
  let mesh = makeMesh(points)
  let polygons = mesh.vor.cellPolygons()

  for (const polygon of polygons) {
    color = {
      'r': Math.floor(Math.random() * 256),
      'g': Math.floor(Math.random() * 256),
      'b': Math.floor(Math.random() * 256)
    }
    drawPolygon(polygon, color)
  }

  points.forEach(point => {
    drawCircle(point, 'black', radius=2)
  })

  mesh.verts.forEach(vert => {
    drawCircle(vert, 'red', radius=2)
  })
}
