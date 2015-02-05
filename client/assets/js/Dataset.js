RCUBE.Dataset = function(){
  this._url = undefined;
  this._csvData = undefined;
  this._dimensionNames = [];
  this._rSquared = {};
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

RCUBE.Dataset.prototype.setRSquared = function(dimensionName, rSquared, formula) {
  if (typeof formula === 'undefined')
    formula = this._activeFormula;
  this._rSquared[formula.toString()][dimensionName] = rSquared;
};

RCUBE.Dataset.prototype.getRSquared = function(){
  if (typeof this._activeFormula === 'undefined')
    return {};
  // Get the RSquared formula of the current formula
  return this._rSquared[this._activeFormula.toString()];
};

RCUBE.Dataset.prototype.setCsvData = function(csvData) {
  this._csvData = csvData;
  // Reset dimensionNames array to not loose angular watch
  this._dimensionNames.length = 0;
  var _dimensionNamesReference = this._dimensionNames;
  Object.keys(this._csvData[0]).forEach(function(name){
    _dimensionNamesReference.push(name);
  });
};

RCUBE.Dataset.prototype.getDimensionNames = function(){
  return this._dimensionNames;
};
