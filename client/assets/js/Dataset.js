RCUBE.Dataset = function(){
  this._url = undefined;
  this._csvData = undefined;
  this._dimensionNames = [];
  this._cfsDimensionNames = {};
  this._rSquared = {};
  this._dimensionNamesToIndex = {};
  this._activeFormula = undefined;
};

// This is a helper function, not sure how it will be of use later on
RCUBE.Dataset.prototype.getNumberOfRSquaredValues = function() {
  var cntr = 0;
  var rSquared = this.getRSquared();
  dimensions = Object.keys(rSquared);
  dimensions.forEach(function(dimension_z, z){
    dimensions_y_keys = Object.keys(rSquared[dimension_z]);
    dimensions_y_keys.forEach(function(dimension_y, y){
      dimensions_x_keys = Object.keys(rSquared[dimension_z][dimension_y]);
      dimensions_x_keys.forEach(function(dimension_x, z){
        cntr += 1;
      });
    });
  });
  return cntr;
};

RCUBE.Dataset.prototype.switchFormula = function(formula) {
  var formulaString = formula.toString();
  var formulaExists = Object.keys(this._rSquared).indexOf(formulaString) != -1;
  this._activeFormula = formula;
  // Create new Object for the formula if it does not exist
  if (!formulaExists) {
    this._rSquared[formulaString] = {};
  }
};

RCUBE.Dataset.prototype.setRSquaredGlobal = function(rSquared, formula) {
  var self = this;
  self._rSquared[formula.toString()] = rSquared;
};

RCUBE.Dataset.prototype.setRSquared = function(formulaResults, formula) {
  if (typeof formula === 'undefined')
    formula = this._activeFormula;

  var self = this;
  // Iterate over all formula results
  formulaResults.forEach(function(currentResult){

    // Check if result object contains object for dependent variable
    if (typeof self._rSquared[formula.toString()][currentResult.z] === 'undefined')
      self._rSquared[formula.toString()][currentResult.z] = {};

    // Check if result object contains object for independent x
    if (typeof self._rSquared[formula.toString()][currentResult.z][currentResult.x] === 'undefined')
      self._rSquared[formula.toString()][currentResult.z][currentResult.x] = {};

    // Attach RSquared value to the corresponding position
    // self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y] = currentResult.rSquared;

    // New format contains an object per result
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y] = {};
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y].rSquared = currentResult.rSquared;
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y].confidenceIntervals = currentResult.confidenceIntervals;
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y].coefficients = currentResult.coefficients;
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y].regressionType = currentResult.regressionType;
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y].featureCount = currentResult.featureCount;
  });
};

RCUBE.Dataset.prototype.getRSquared = function(comparisonFormula){
  if (typeof this._activeFormula === 'undefined')
    return {};

  if (typeof comparisonFormula === 'undefined')
    // Get the RSquared formula of the current formula
    return this._rSquared[this._activeFormula.toString()];

  var activeRSquared = this._rSquared[this._activeFormula.toString()];
  //var referenceRSquared = this._rSquared[comparisonFormula.toString()];
  var referenceRSquared = this._rSquared[comparisonFormula];
  var resultRSquared = {};
  var self = this;
  Object.keys(referenceRSquared).forEach(function(zDimension, zIndex) {
    resultRSquared[zDimension] = {};
    var currentZDimension = referenceRSquared[zDimension];
    Object.keys(currentZDimension).forEach(function(yDimension, yIndex) {
      resultRSquared[zDimension][yDimension] = {};
      var currentYDimension = referenceRSquared[zDimension][yDimension];
      Object.keys(currentYDimension).forEach(function(xDimension, xIndex) {
        // Subtract
        if (typeof activeRSquared[zDimension] !== 'undefined' &&
            typeof activeRSquared[zDimension][yDimension] !== 'undefined' &&
            typeof activeRSquared[zDimension][yDimension][xDimension] !== 'undefined') {
          var reference = parseFloat(referenceRSquared[zDimension][yDimension][xDimension].rSquared);
          var active = parseFloat(activeRSquared[zDimension][yDimension][xDimension].rSquared);
          // console.log(referenceRSquared[zDimension][yDimension][xDimension]);
          // console.log(activeRSquared[zDimension][yDimension][xDimension]);
          // console.log("z: " + zDimension + " y: " + yDimension + " x: " + xDimension);
          // console.log("reference - active");
          // console.log(reference + " - " + active);

          // Create (possibly messy) result object
          resultRSquared[zDimension][yDimension][xDimension] = JSON.parse(JSON.stringify(activeRSquared[zDimension][yDimension][xDimension]));
          if (isNaN(active) || isNaN(reference)) {
            resultRSquared[zDimension][yDimension][xDimension].rSquared = 0;
          }
          else
            resultRSquared[zDimension][yDimension][xDimension].rSquared = Math.abs(reference-active);
        }
        // else
        //   resultRSquared[zDimension][yDimension][xDimension].rSquared = 0;
      });
    });
  });
  return resultRSquared;
};

// This also sets the dimensionsnames array
RCUBE.Dataset.prototype.setCsvData = function(csvData) {
  this._csvData = csvData;
  // Reset dimensionNames array to not loose angular watch
  this._dimensionNames.length = 0;
  this._dimensionNamesToIndex = {};
  var self = this;
  Object.keys(this._csvData[0]).forEach(function(name, index) {
    self._dimensionNames.push(name);
    self._dimensionNamesToIndex[name] = index;
  });
};

// Return Copy of the dimension names array
RCUBE.Dataset.prototype.getDimensionNames = function(){
  // return this._dimensionNames.slice();
  return this._dimensionNames;
};
