RCUBE.Scatterplot = function(canvasID, data) {
  // this.main(canvasID, data);
  this.main(canvasID, this.createDataset(data));
};

RCUBE.Scatterplot.prototype.createDataset = function(data) {
  var scatterplotDataset = [];
  data.forEach(function(currentElement, currentPosition){
    scatterplotDataset.push([currentPosition,currentElement]);
  });
  return scatterplotDataset;
};

RCUBE.Scatterplot.prototype.main = function(canvasID, data) {

  var margin = {
      top: 10,
      right: 10,
      bottom: 30,
      left: 30
    },
    width = 300 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

  var x = d3.scale.linear()
    .domain([d3.min(data, function(d) { return d[0]; }), d3.max(data, function(d) { return d[0]; })])
    .range([0, width]);

  var y = d3.scale.linear()
    .domain([ d3.min(data, function(d) { return d[1]; }) , d3.max(data, function(d) { return d[1]; }) ])
    .range([height, 0]);

  var chart = d3.select(canvasID)
    .append('svg:svg')
    .attr('width', width + margin.right + margin.left)
    .attr('height', height + margin.top + margin.bottom)
    .attr('class', 'scatterplot');

  var main = chart.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main');

  // draw the x axis
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom');

  main.append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .attr('class', 'main axis date')
    .call(xAxis);

  // draw the y axis
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left');

  main.append('g')
    .attr('transform', 'translate(0,0)')
    .attr('class', 'main axis date')
    .call(yAxis);

  var g = main.append("svg:g");

  g.selectAll("scatter-dots")
    .data(data)
    .enter().append("svg:circle")
    .attr("cx", function(d, i) {
      return x(d[0]);
    })
    .attr("cy", function(d) {
      return y(d[1]);
    })
    .attr("r", 2);
};
