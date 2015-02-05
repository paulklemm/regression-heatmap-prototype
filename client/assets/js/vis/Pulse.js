RCUBE.Pulse = function(canvasID) {
  this._canvasID = canvasID;
  this.main(canvasID);
};

RCUBE.Pulse.prototype.main = function(canvasID) {
  var svg = d3.select(canvasID)
    .append("svg")
    .attr("width", 20)
    .attr("height", 30)
    .classed('pulse-svg', true)
    .append("g");
  svg.selectAll("circle")
    .data([0])
    .enter()
    .append("circle")
    .classed('pulse', true);
};

RCUBE.Pulse.prototype.pulse = function() {
  d3.select(this._canvasID + " circle")
    .attr("stroke-width", 5)
    .attr("r", 1)
    .attr("cx", 10)
    .attr("cy", 10)
    .transition()
    .duration(1000)
    .attr('stroke-width', 0)
    .attr("r", 10)
    .ease('sine');
};
