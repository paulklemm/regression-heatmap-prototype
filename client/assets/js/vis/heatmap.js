RCUBE.Heatmap = function(canvasID, rSquared, names) {
  this._canvasID = canvasID;
  // this._data = this.createHeatmapInput(rSquared, names);
  this._data = this.createHeatmapInputNames(rSquared, names);
  console.log(this._data);
  this._names = names;
  this.main(canvasID, this._data);
};

RCUBE.Heatmap.prototype.createHeatmapInputNames = function(rSquared, names) {
  var createNode = function(name, index) {
    var node = {};
    node.count = 0;
    node.name = name;
    node.index = index;
    return(node);
  };
  var nodes = [];
  var nodesIndex = {};
  var links = [];

  var dependentVariables = Object.keys(rSquared);
  dependentVariables.forEach(function(dependent, dependent_index){
    var independentVariables = Object.keys(rSquared[dependent]);
    independentVariables.forEach(function(independent, independent_index){
      // Check if there is a node added for the dependent and independent variable
      if (nodesIndex[dependent] === undefined) {
        nodes.push(createNode(dependent, nodes.length));
        nodesIndex[dependent] = nodes.length - 1;
      }
      if (nodesIndex[independent] === undefined) {
        nodes.push(createNode(independent, nodes.length));
        nodesIndex[independent] = nodes.length - 1;
      }

      // Create new link
      var value = rSquared[dependent][independent];
      var link = {};
      link.source = nodesIndex[dependent];
      link.target = nodesIndex[independent]
      link.value = value;
      links.push(link);
      // Since we only calculate the upper matrix, we also add the mirror to
      // the data structure
      var link_mirror = {};
      link_mirror.source = nodesIndex[independent];
      link_mirror.target = nodesIndex[dependent];
      link_mirror.value = value;
      links.push(link_mirror);
    });
  });
  return {"nodes": nodes, "links": links};
};

RCUBE.Heatmap.prototype.createHeatmapInput = function(rSquared, names) {
  var nodes = [];
  var links = [];

  names.forEach(function(value, i){
    var node = {};
    node.count = 0;
    node.name = value;
    node.index = i;
    nodes.push(node);
  });
  names.forEach(function(value_i, i){
    names.forEach(function(value_j, j){
      // Check of the current entry is given through the rSquared dataset
      if (rSquared[i] !== undefined && rSquared[i][j] !== undefined) {
        var value = rSquared[i][j];
        var link = {};
        link.source = i;
        link.target = j;
        link.value = value;
        links.push(link);
        // Since we only calculate the upper matrix, we also add the mirror to
        // the data structure
        var link_mirror = {};
        link_mirror.source = j;
        link_mirror.target = i;
        link_mirror.value = value;
        links.push(link_mirror);
      }
    });
  });
  return {"nodes": nodes, "links": links};
};

RCUBE.Heatmap.prototype.main = function (canvasID, heatmapData){
  var self = this;
  var names = heatmapData.names;
  var nodes = heatmapData.nodes;
  var margin = {
    top: 80,
    right: 0,
    bottom: 10,
    left: 100
  },
  width = 720,
  height = 720;

  var x = d3.scale.ordinal().rangeBands([0, width]),
  // z = d3.scale.linear().domain([0, 4]).clamp(true),
  z = d3.scale.linear().domain([0, 0.5]).clamp(true),
  category = d3.scale.category10().domain(d3.range(10));

  var svg = d3.select(canvasID).append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .classed("heatmap", true)
  .style("margin-left", +margin.left + "px")
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var matrix = [],
  n = nodes.length;

  // Compute index per node.
  nodes.forEach(function(node, i) {
    node.index = i;
    node.count = 0;
    matrix[i] = d3.range(n).map(function(j) {
      return {
        x: j,
        y: i,
        z: 0
      };
    });
  });

  // Convert links to matrix; count character occurrences.
  heatmapData.links.forEach(function(link) {
    matrix[link.source][link.target].z += parseFloat(link.value);
    nodes[link.source].count += parseFloat(link.value);
  });

  console.log(matrix);
  // Parse matrix and if a column does not have any elements, remove them
  // emptyDimensions = [];
  // matrix.forEach(function(x, index_x) {
  //   hasValues = false;
  //   x.forEach(function(y){
  //     if (y.z !== 0)
  //       hasValues = true;
  //   });
  //   if (!hasValues)
  //     emptyDimensions.push(index_x);
  // });
  // console.log("emptyDimensions");
  // console.log(emptyDimensions);
  // for (var i = emptyDimensions.length; i >= 0; i--)
  //   matrix.splice(emptyDimensions[i], 1);
  // matrix.forEach(function(x, index_x) {
  //   for (var i = emptyDimensions.length; i >= 0; i--)
  //     x.splice(emptyDimensions[i], 1);
  // });
  // Precompute the orders.
  var orders = {
    name: d3.range(n).sort(function(a, b) {
      return d3.ascending(nodes[a].name, nodes[b].name);
    }),
    count: d3.range(n).sort(function(a, b) {
      return nodes[b].count - nodes[a].count;
    })
  };

  // Get default sort from select field
  var sort = $('#order-heatmap').val();
  if (sort == 'name')
    x.domain(orders.name);
  else if (sort == 'count')
    x.domain(orders.count);

  svg.append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height);

  var row = svg.selectAll(".row")
  .data(matrix)
  .enter().append("g")
  .attr("class", "row")
  .attr("transform", function(d, i) {
    return "translate(0," + x(i) + ")";
  })
  .each(row);

  row.append("line")
  .attr("x2", width);

  row.append("text")
  .attr("x", -6)
  .attr("y", x.rangeBand() / 2)
  .attr("dy", ".32em")
  .attr("text-anchor", "end")
  .classed("mono", true)
  .text(function(d, i) {
    return nodes[i].name;
  });

  var column = svg.selectAll(".column")
  .data(matrix)
  .enter().append("g")
  .attr("class", "column")
  .attr("transform", function(d, i) {
    return "translate(" + x(i) + ")rotate(-90)";
  });

  column.append("line")
  .attr("x1", -width);

  column.append("text")
  .attr("x", 6)
  .attr("y", x.rangeBand() / 2)
  .attr("dy", ".32em")
  .classed("mono", true)
  .attr("text-anchor", "start")
  .text(function(d, i) {
    return nodes[i].name;
  });

  function row(row) {
    var cell = d3.select(this).selectAll(".cell")
    .data(row.filter(function(d) {
      return d.z;
    }))
    .enter().append("rect")
    .attr("class", "cell")
    .attr("x", function(d) {
      return x(d.x);
    })
    .attr("width", x.rangeBand())
    .attr("height", x.rangeBand())
    .style("fill-opacity", function(d) {
      return z(d.z);
    })
    .style("fill", function(d) {
      return category(0);
    })
    .on("mouseover", mouseover)
    .on("mouseout", mouseout);
  }

  function mouseover(p) {
    d3.select(this).classed("cell-hover", true);
    d3.selectAll(".row text").classed("active", function(d, i) {
      return i == p.y;
    });
    d3.selectAll(".column text").classed("active", function(d, i) {
      return i == p.x;
    });
    //Update the tooltip position and value
    d3.select("#tooltip-heatmap")
    .style("left", (d3.event.pageX + 10) + "px")
    .style("top", (d3.event.pageY - 10) + "px")
    .select("#value")
    .text("X: " + self._names[p.x] + "Y: " + self._names[p.y] + "\nValue: " + p.z);
    //Show the tooltip
    d3.select("#tooltip-heatmap").classed("hidden", false);
  }

  function mouseout() {
    d3.selectAll("text").classed("active", false);
    d3.selectAll("rect").classed("cell-hover", false);
    d3.select("#tooltip-heatmap").classed("hidden", true);
  }

  d3.select("#order-heatmap").on("change", function() {
    order(this.value);
  });

  function order(value) {
    x.domain(orders[value]);

    var t = svg.transition().duration(1500);

    t.selectAll(".row")
    .delay(function(d, i) {
      return x(i) * 2;
    })
    .attr("transform", function(d, i) {
      return "translate(0," + x(i) + ")";
    })
    .selectAll(".cell")
    .delay(function(d) {
      return x(d.x) * 2;
    })
    .attr("x", function(d) {
      return x(d.x);
    });

    t.selectAll(".column")
    .delay(function(d, i) {
      return x(i) * 2;
    })
    .attr("transform", function(d, i) {
      return "translate(" + x(i) + ")rotate(-90)";
    });
  }
};
