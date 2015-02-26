RCUBE.Dataset = function(){
  this._url = undefined;
  this._csvData = undefined;
  this._dimensionNames = [];
  this._cfsDimensionNames = {};
  this._rSquared = {};
  this._dimensionNamesToIndex = {};
  this._activeFormula = undefined;
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
    self._rSquared[formula.toString()][currentResult.z][currentResult.x][currentResult.y] = currentResult.rSquared;
  });
};

RCUBE.Dataset.prototype.getRSquared = function(){
  if (typeof this._activeFormula === 'undefined')
    return {};
  // Get the RSquared formula of the current formula
  return this._rSquared[this._activeFormula.toString()];
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

RCUBE.Dataset.prototype.getDimensionNames = function(){
  return this._dimensionNames;
};
