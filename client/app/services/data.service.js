angular.module('cube')
  .factory('data', ['$rootScope', 'ocpuBridge', function($rootScope, ocpuBridge){
    var dataService = {};
    dataService.dataset = new RCUBE.Dataset();
    dataService.defaultRegressionFormula = new RCUBE.RegressionFormula('z ~ x + y');
    dataService.regressionFormula = new RCUBE.RegressionFormula();
    dataService.calculationInProgress = false;
    // This flag is set per formula
    dataService.stopCalculation = {};

    dataService.formulaUpdate = function(formula) {
      // Stop all current operations for the current formula
      dataService.stopCalculation[dataService.regressionFormula.toString()] = true;
      // Update the active formula
      dataService.regressionFormula.setFormula(formula.toString());
      // dataService.regressionFormula.setValidVariables(dataService.dataset.getDimensionNames().slice(0));
      dataService.regressionFormula.setValidVariables(formula._validVariables.slice(0));
      applyFormula();
    };

    dataService.getRSquaredValues = function() {
      // return dataService.dataset._rSquared;
      return dataService.dataset.getRSquared();
    };

    // Called when a calculation for a formula is complete!
    // It saves copies of the Javascript objects to the R servers
    // for fast loading on switch!
    var cacheFormulaResult = function(formula) {
      // Load the rSquared data of the formula and pass it to the R Server
      ocpuBridge.cacheRSquared(formula.toString(), dataService.dataset._name, dataService.dataset.getRSquared());
    };

    var calculateRSquaredSequential = function(dimensions, formula) {
      // See how many dimensions are left in the array
      if (dimensions.length === 0) {
        // HACK: jQuery activating the cog visibility
        $('#cog').removeClass('visible');
        dataService.calculationInProgress = false;
        // Cache the complete result of the calculation!
        cacheFormulaResult(formula);
        return;
      }
      var dimensionName = dimensions[dimensions.length - 1];
      ocpuBridge.getCorrelationBasedFeatureSelection(dimensionName, dataService.dataset._name).then(function(best_dimensions){

        console.log("CFS Dimensions for " + dimensionName);

        dataService.dataset._cfsDimensionNames[dimensionName] = best_dimensions;
        console.log(best_dimensions);
        formulas = formula.calculateFormulasDependent(dimensionName, best_dimensions);
        // Load the R Squared values through the R backend
        ocpuBridge.calculateRSquared(formulas, dataService.dataset._name).then(function(rSquared){
          dataService.dataset.setRSquared(rSquared, formula);
          dimensions.splice(dimensions.length - 1, 1);
          // If you are not supposed to stop for this formula, continue
          if (!dataService.stopCalculation[formula.toString()]) {
            $rootScope.$broadcast('updateRSquared');
            calculateRSquaredSequential(dimensions, formula);
          }
        });
      });
    };

    var applyFormula = function() {
      // Set calculation flag to true
      dataService.calculationInProgress = true;
      // HACK: jQuery activating the cog visibility
      $('#cog').addClass('visible');
      // Use either default formula or new one if there was one provided
      // If the formula is not valid, fall back to the default one
      if (!dataService.regressionFormula.isValid()) {
        dataService.regressionFormula.setFormula(dataService.defaultRegressionFormula.toString());
        dataService.regressionFormula.setValidVariables(dataService.dataset.getDimensionNames().slice(0));
      }

      console.log("Calculating R^2 with formula:");
      console.log(dataService.regressionFormula);

      // Initialize the stop flag for this formula
      // var formulaWasAlreadyLoadedBefore = Object.keys(dataService.stopCalculation).indexOf(dataService.regressionFormula.toString()) == -1;
      dataService.stopCalculation[dataService.regressionFormula.toString()] = false;
      // Broadcast event for other components to react
      $rootScope.$broadcast("newFormulaApplied");
      dataService.dataset.switchFormula(dataService.regressionFormula);
      // Attempt to load the data from the server if it was calculated before
      console.log(dataService.regressionFormula.toString());
      console.log(dataService.dataset._name);
      ocpuBridge.cacheRSquared(dataService.regressionFormula.toString(), dataService.dataset._name).then(function(rSquared){
        // The cache returns an array [false] when there is no file on the r server with that name
        if (rSquared[0] === false) {// Calculate the r Squared values
          // Copy the dimensions array, since the recurive algorithm will delete its contents
          var recursionDimensions = dataService.dataset.getDimensionNames().slice(0);
          // Load the Recursion algorithm with a copy of the formula
          // This is needed because we want to assign proper R^2 values even
          // if there is a new one assigned in the meanwhile
          // calculateRSquaredSequential(dataService.regressionFormula.calculateFormulas(), dataService.regressionFormula.copy());
          calculateRSquaredSequential(recursionDimensions, dataService.regressionFormula.copy());
        }
        else { // RSquared was found on the server
          // HACK: jQuery activating the cog visibility
          $('#cog').removeClass('visible');
          dataService.calculationInProgress = false;
          dataService.dataset.setRSquaredGlobal(rSquared, dataService.regressionFormula);
          // Debug Cube
          var cubeTest = new RCUBE.Cube('threeTest', dataService.dataset.getRSquared(), dataService.dataset._dimensionNames.reverse());
          $rootScope.$broadcast('updateRSquared');
        }
      });

    };

    dataService.loadData = function(url) {
      var GetFileName = function(url)
      {
        if (url) {
          var m = url.toString().match(/.*\/(.+?)\./);
          if (m && m.length > 1)
          {
             return m[1];
          }
        }
        return "";
      };
      dataService.dataset._url = url;
      dataService.dataset._name = GetFileName(url);
      loadCSV(url, function(csvData){
        dataService.dataset.setCsvData(csvData);
        ocpuBridge.loadDataset(url).then(function(data){
          console.log("Dataset loaded for all active OpenCPU sessions");
          // apply the current formula to the newly loaded dataset!
          applyFormula();
        });
      });
    };

    var loadCSV = function(url, callback) {
      d3.csv(url, function(data){
        callback(data);
      });
    };
    return dataService;
  }])

  .factory('ocpuBridge', ['$rootScope', '$q', function($rootScope, $q){
    var ocpuBridgeService = {};
    ocpuBridgeService.sessions = [];

    ocpuBridgeService.getCorrelationBasedFeatureSelection = function(dependent, dataId){
      return $q(function(resolve, reject){
        var rsession = ocpuBridgeService.sessions[0];
        rsession.getCorrelationBasedFeatureSelection(dependent, dataId, function(cfsSession){
          $.getJSON(cfsSession.loc + "R/.val/json" , function(cfs){
            resolve(cfs);
          });
        });
      });
    };

    ocpuBridgeService.cacheRSquared = function(formula, dataId, rSquared){
      return $q(function(resolve, reject){
        var rsession = ocpuBridgeService.sessions[0];

        rsession.cacheRSquared(formula, dataId, rSquared, function(result){
          $.getJSON(result.loc + "R/.val/json" , function(resultData){
            resolve(resultData);
          });
        });
      });
    };

    ocpuBridgeService.calculateRSquared = function(formulas, dataId){
      return $q(function(resolve, reject){
        // TODO: Write distribution algorithm here!
        var rsession = ocpuBridgeService.sessions[0];

        rsession.calculateRSquaredValues(formulas, dataId, function(rsquaredSession){
          $.getJSON(rsquaredSession.loc + "R/.val/json" , function(rSquaredData){
            resolve(rSquaredData);
          });
        });
      });
    };

    // This event is called when the user uploads a new data set
    ocpuBridgeService.loadDataset = function(url) {
      return $q(function(resolve, reject){
        var numberSessionsLoaded = 0;
        ocpuBridgeService.sessions.forEach(function(rsession, i){
          rsession.loadDataset(url, function(){
            numberSessionsLoaded = numberSessionsLoaded + 1;
            if (numberSessionsLoaded == ocpuBridgeService.sessions.length)
              resolve();
          });
        });
      });
    };
    ocpuBridgeService.pushService = function(url, name){
      ocpuBridgeService.sessions.push(new RCUBE.RSession(url, name));
      console.log("Created new R Session: " + url + ", " + name);
    };
    return ocpuBridgeService;
  }]);
