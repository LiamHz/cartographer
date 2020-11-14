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

const drawCircle = (point, color='black', radius=2) => {
  // Center each point on the origin and
  // scale its range to the canvas' dimensions
  svg.append('circle')
    .attr('cx', point[0] * CANVAS_WIDTH + CANVAS_WIDTH/2)
    .attr('cy', point[1] * CANVAS_HEIGHT + CANVAS_HEIGHT/2)
    .attr('r', radius)
    .attr('fill', color)
}

const drawPolygon = (points, color='black') => {
  points.forEach(point => {
    point[0] = point[0] * CANVAS_WIDTH + CANVAS_WIDTH/2
    point[1] = point[1] * CANVAS_HEIGHT + CANVAS_HEIGHT/2
  })
  svg.append('polygon')
    .attr('points', points.join(" "))
    .attr('fill', color)
}

const demoRandomPoints = n => {
  d3.selectAll('svg').remove()
  svg = createSvgContainer()

  const points = generateRandomPoints(n)
  points.forEach(point => {
    drawCircle(point)
  })
}

const demoVoronoi = n => {
  d3.selectAll('svg').remove()
  svg = createSvgContainer()

  const points = generateRandomPoints(n)
  colors = ['red', 'orange', 'green', 'blue', 'purple']

  // polygons is an object
  const polygons = voronoi(points).cellPolygons()
  for (const polygon of polygons) {
    color = colors[Math.floor(Math.random() * colors.length)]
    drawPolygon(polygon, color)
  }

  points.forEach(point => {
    drawCircle(point, 'black', radius=3)
  })
}
