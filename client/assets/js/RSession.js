RCUBE.RSession = function(URLToOpenCPUServer, name) {
  this._name = name;
  this._openCPUConnection = new RCUBE.Helper.OpenCPUConnection(URLToOpenCPUServer);
  this._datasetSession = undefined;
  this._rSquaredSession = undefined;
  this._rSquaredJSON = undefined;
};

RCUBE.RSession.prototype.loadDataset = function(csvFilePath, callback) {
  self = this;
  this._openCPUConnection.execute(
    "/library/regressionCube/R",
    'load_dataset',
  {"csv_file": csvFilePath},
  function(session){
    self._datasetSession = session;
    if (callback != undefined) callback(session);
  },
  function(req) {
    console.error("Error: " + req.responseText);
  });
};

// Calculate RSquared values of the given formulas
RCUBE.RSession.prototype.calculateRSquaredValues = function(formulas, callback) {
  self = this;
  this._openCPUConnection.execute(
    "/library/regressionCube/R",
    'r_squared_matrix_formula',
  {"data": self._datasetSession, "formulas": formulas},
  function(_session){
    // _session.getConsole(function(content){console.log(content);});
    self._rSquaredSession = _session;
    if (typeof callback !== undefined)
      callback(_session);
  },
  function(req) {
    console.error("Error: " + req.responseText);
  });
};
