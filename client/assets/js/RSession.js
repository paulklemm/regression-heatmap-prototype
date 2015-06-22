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
    "/library/regressionHeatmap/R",
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

// Calculate Correlation based feature selection values of the given formulas
RCUBE.RSession.prototype.getCorrelationBasedFeatureSelection = function(dependent, dataId, callback) {
  self = this;
  this._openCPUConnection.execute(
    "/library/regressionHeatmap/R",
    'correlation_based_feature_selection_cached',
  {"data": self._datasetSession, "dependent": dependent, "data_id": dataId},
  function(_session){
    // _session.getConsole(function(content){console.log(content);});
    if (typeof callback !== undefined)
      callback(_session);
  },
  function(req) {
    console.error("Error: " + req.responseText);
  });
};

RCUBE.RSession.prototype.cacheRSquared = function(formula, dataId, rSquared, callback) {
  self = this;
  this._openCPUConnection.execute(
    "/library/regressionHeatmap/R",
    'cache_r_squared_matrix',
  {"r_squared": rSquared, "formula": formula, "data_id": dataId},
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


// Calculate RSquared values of the given formulas
RCUBE.RSession.prototype.calculateRSquaredValues = function(formulas, dataId, callback) {
  self = this;
  this._openCPUConnection.execute(
    "/library/regressionHeatmap/R",
    'r_squared_matrix_formula',
  {"data": self._datasetSession, "formulas": formulas, "data_id": dataId},
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
