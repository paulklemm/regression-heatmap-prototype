RCUBE.Heatmap = function(canvasID, rSquared, names) {
  this._canvasID = canvasID;
  this._lowerMatrix = true;
  this._data = this.createHeatmapInput(rSquared, names);
  this.main(canvasID, this._data);
};

// Create hashmap of sorted names for faster access
RCUBE.Heatmap.prototype.getSortedNames = function(names){
  sortedNames = {};
  names = names.sort();
  names.forEach(function(name, index){
    sortedNames[name] = index;
  });
  return sortedNames;
};

RCUBE.Heatmap.prototype.createHeatmapInput = function(rSquared, names) {
  self = this;
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

  var sortedNames = this.getSortedNames(names);

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
      var value = rSquared[dependent][independent];

      if (self._lowerMatrix) {
        // Create a lower matrix diagonal
        if (sortedNames[dependent] > sortedNames[independent]) {
          // Create new link
          var link = {};
          link.source = nodesIndex[dependent];
          link.target = nodesIndex[independent];
          link.value = value;
          links.push(link);
        }
        else {
          // Since we only calculate the upper matrix, we also add the mirror to
          // the data structure
          var link_mirror = {};
          link_mirror.source = nodesIndex[independent];
          link_mirror.target = nodesIndex[dependent];
          link_mirror.value = value;
          links.push(link_mirror);
        }
      }
      else {
        // Create new link
        var link = {};
        link.source = nodesIndex[dependent];
        link.target = nodesIndex[independent];
        link.value = value;
        links.push(link);
        // Since we only calculate the upper matrix, we also add the mirror to
        // the data structure
        var link_mirror = {};
        link_mirror.source = nodesIndex[independent];
        link_mirror.target = nodesIndex[dependent];
        link_mirror.value = value;
        links.push(link_mirror);
      }
    });
  });
  // Set the proper names array for reference in the mouse-over event
  this._names = Object.keys(nodesIndex);
  console.log(nodesIndex);
  return {"nodes": nodes, "links": links};
};

RCUBE.Heatmap.prototype.main = function (canvasID, heatmapData) {
  var self = this;
  var nodes = heatmapData.nodes;
  var margin = {
    top: 10,
    right: 0,
    bottom: 200,
    left: 200
  },
  width = 720,
  height = 720;

  var sortedNames = this.getSortedNames(self._names);

  console.log(heatmapData);

  var x = d3.scale.ordinal().rangeBands([0, width]),
  // z = d3.scale.linear().domain([0, 4]).clamp(true),
  z = d3.scale.linear().domain([0, 1]).clamp(true),
  category = d3.scale.category10().domain(d3.range(10));

  var svg = d3.select(canvasID).append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .classed("heatmap", true)
  // .style("margin-left", +margin.left + "px")
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

  // Remove all matrix data above the diagonal
  // for (var i = matrix.length - 1; i >= 0; i--) {
  //   for (var j = matrix.length - 1; j >= 0; j--) {
  //     if (j >= i)
  //       matrix[i].splice(j, 1);
  //   }
  // }

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
  .each(row_);
  console.log(matrix);

  if (self._lowerMatrix) {
    row.append("line")
    // Only draw the line as far as the current cell requires
    .attr("x2", function(d, i) {
      var nodeName = nodes[d[i].x].name;
      var index = sortedNames[nodeName];
      return index * x.rangeBand();
      });
  }
  else {
    row.append("line")
    .attr("x2", width);
  }

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

  if (self._lowerMatrix) {
    column.append("line")
    .attr("x1", function(d, i) {
      var nodeName = nodes[d[i].x].name;
      var index = sortedNames[nodeName];
      return 0 - (index * x.rangeBand());
      })
    .attr("x2", -width);
  }
  else {
    column.append("line")
    .attr("x1", -width);
  }

  column.append("text")
  .attr("x", height + 10)
  // .attr("x", 0)
  // .attr("y", x.rangeBand() / 2)
  .attr("y", (x.rangeBand() / 2) - x.rangeBand())
  .attr("dy", ".32em")
  .attr("transform", "rotate(180, 0, 0)")
  // .attr("transform", "rotate(45, 10, 50)")
  .classed("mono", true)
  .attr("text-anchor", "start")
  .text(function(d, i) {
    return nodes[i].name;
  });

  // Debug
  debug_x = x;

  function row_(_row) {
    // Iterate over all row entries and remove the ones above
    // the matrix diagonal to only have the lower matrix represented
    // for (var i = _row.length - 1; i >= 0; i--) {
    //   if (_row[i].x >= _row[i].y)
    //     _row.splice(i, 1);
    // }
    var cell = d3.select(this).selectAll(".cell")
    .data(_row.filter(function(d) {
      return d.z;
    }))
    .enter().append("rect")
    .attr("class", "cell")
    .attr("x", function(d) {
      return x(d.x);
    })
    .attr("width", x.rangeBand()-1)
    .attr("height", x.rangeBand()-1)
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
