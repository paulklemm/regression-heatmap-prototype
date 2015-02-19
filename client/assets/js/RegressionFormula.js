(function() {
RCUBE.RegressionFormula = function(formula, validVariables) {
  if (typeof(formula) == 'undefined')
    this._formula = '';
  else
    this._formula = formula;

  this._valid = false;
  this._reconstructedFormula = '';

  if (typeof(validVariables) == 'undefined')
    this._validVariables = [];
  else
    this._validVariables = validVariables;
  this._errorText = '';
  this.update(formula);
};

// constructFormula(['z','x','y'], ['~', '+', '-'], 'age', 'gender', 'bmi')
RCUBE.RegressionFormula.prototype.constructFormula = function(variables, operators, x, y, z) {
  var result_formula = '';
  var dependent_variable;
  // Iterate over all variables
  variables.forEach(function(current_variable, i){
    // Replace placeholders with current x, y and z values
    if (current_variable == 'x') current_variable = x;
    if (current_variable == 'y') current_variable = y;
    if (current_variable == 'z') current_variable = z;
    // If it is not the last variable, append it together with next operator
    if (i != variables.length - 1)
      result_formula = result_formula + current_variable + operators[i];
    else
      result_formula = result_formula + current_variable;

    if (i === 0)
      dependent_variable = current_variable;
  });
  return({formula:result_formula, dependentVariable:dependent_variable});
};

RCUBE.RegressionFormula.prototype.calculateFormulas = function(){
  var self = this;
  var currentformula = self.toString();
  var formulas = {};
  self._validVariables.forEach(function(variable_dependent, z){
  // ['bmi', 'gender'].forEach(function(variable_dependent, z){
    formulas[variable_dependent] = [];
    self._validVariables.forEach(function(variable_x, x){
      self._validVariables.forEach(function(variable_y, y){
        // Only calculate the upper part of the matrix
        if (x != y && y > x && z != x && z != y) {
          // Attach all information necessary to the current formula to project their results back
          formulaResult = self.constructFormula(self._variables, self._operators, variable_x, variable_y, variable_dependent);
          formulaResult.x = variable_x;
          formulaResult.y = variable_y;
          formulaResult.z = variable_dependent;
          formulas[variable_dependent].push(formulaResult);
        }
      });
    });
  });
  return(formulas);
};

// Return a copy of this Object
RCUBE.RegressionFormula.prototype.copy = function() {
  var validVariables;
  // Copy valid variables only if they are defined
  if (typeof this._validVariables === 'undefined')
    validVariables = [];
  else
    validVariables = this._validVariables.slice(0);
  return new RCUBE.RegressionFormula(this.toString(), validVariables);
};

RCUBE.RegressionFormula.prototype.setValidVariables = function(validVariables) {
  this._validVariables = validVariables;
  this.update();
};

RCUBE.RegressionFormula.prototype.setFormula = function(formula) {
  // this._formula = formula.slice(0);
  this._formula = formula;
  this.update();
};

RCUBE.RegressionFormula.prototype.update = function() {
  var self = this;
  this._valid = false;
  this._reconstructedFormula = '';
  // Regex formulas for variables and operators
  this._regexVariables = /([^\^\+\-\:\*\/\|\~\s]+)/g;
  this._regexOperators = /([\^\+\-\:\*\/\|\~])/g;
  // Apply regex to the input formula
  this._variables = this._formula.match(this._regexVariables);
  this._operators = this._formula.match(this._regexOperators);

  // Check the formula for validity
  this._valid = true;
  this._errorText = '';
  if (this._variables === null) {
    this._valid = false;
    this._errorText = "No variables are specified.";
  }
  if (this._valid && this._operators === null) {
    this._valid = false;
    this._errorText = "No operators are specified.";
  }
  // The first operator has to be a '~'
  if (this._valid && (this._operators.length < 1 || this._operators[0] !== '~')) {
    this._valid = false;
    this._errorText = "First operator has to be a '~'!";
  }
  if (this._valid && this._operators.length != this._variables.length - 1) {
    this._valid = false;
    this._errorText = "Number of valid operators do not match the number of variables.";
  }
  if (this._valid) {
    this._variables.forEach(function(variable, index) {
      // check if the current variable is valid using the
      // valid variables as well as x, y and z
      if (self._validVariables.indexOf(variable) == -1 && ['x', 'y', 'z'].indexOf(variable) == -1) {
        self._valid = false;
        self._errorText = "Invalid variables are specified.";
        return;
      }
    });
  }
};

RCUBE.RegressionFormula.prototype.isValid = function(){
  return this._valid;
};

RCUBE.RegressionFormula.prototype.toString = function(){
  var self = this;
  // If the string was not constructed, do it here
  if (this._reconstructedFormula === '') {
    this._variables.forEach(function(variable, index) {
      self._reconstructedFormula = self._reconstructedFormula + variable;
      // If it is not the last element, attach the operator
      if (index != self._variables.length - 1)
        self._reconstructedFormula = self._reconstructedFormula + self._operators[index];
    });
  }
  return this._reconstructedFormula;
};
})();
