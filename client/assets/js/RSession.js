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

// Calculate RSquared value of z'th plane
RCUBE.RSession.prototype.calculateRSquaredValues = function(z, formula, callback) {
  self = this;
  this._openCPUConnection.execute(
    "/library/regressionCube/R",
    'r_squared_matrix',
  {"data": self._datasetSession, "z": z, "operators": formula._operators, "variables": formula._variables},
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
