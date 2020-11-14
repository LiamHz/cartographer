CANVAS_WIDTH = 512
CANVAS_HEIGHT = 512

// Add a svg element to the page, and style it
let svg = d3.select('body')
  .append('svg')
  .attr('width', CANVAS_WIDTH)
  .attr('height', CANVAS_HEIGHT)
  .style('border', '1px solid black')

// Create a circle
// Set its xpos, ypos, radius, and style
let c1 = svg.append('circle')
  .attr('cx', CANVAS_WIDTH / 2)
  .attr('cy', CANVAS_HEIGHT / 2)
  .attr('r', 25)
  .style('fill', 'black')
