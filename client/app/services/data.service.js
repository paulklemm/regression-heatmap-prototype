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

    var calculateRSquaredSequential = function(dimensions, formula) {
      // See how many dimensions are left in the array
      if (dimensions.length === 0) {
        // HACK: jQuery activating the cog visibility
        $('#cog').removeClass('visible');
        dataService.calculationInProgress = false;
        return;
      }
      var dimensionName = dimensions[dimensions.length - 1];
      ocpuBridge.getCorrelationBasedFeatureSelection(dimensionName).then(function(best_dimensions){
        console.log("CFS Dimensions for " + dimensionName);
        console.log(best_dimensions);
        formulas = formula.calculateFormulasDependent(dimensionName, best_dimensions);
        // console.log(formulas);
        ocpuBridge.calculateRSquared(formulas, formula).then(function(rSquared){
          dataService.dataset.setRSquared(rSquared, formula);
          dimensions.splice(dimensions.length - 1, 1);
          // If you are not supposed to stop for this formula, continue
          if (!dataService.stopCalculation[formula.toString()]) {
            $rootScope.$broadcast('updateRSquared');
            calculateRSquaredSequential(dimensions, formula);
          }
        });
      });
      // ocpuBridge.calculateRSquared(dimension_formulas[dimensionName], formula).then(function(rSquared){
      //   dataService.dataset.setRSquared(rSquared, formula);
      //   delete dimension_formulas[dimensionName];
      //   // If you are not supposed to stop for this formula, continue
      //   if (!dataService.stopCalculation[formula.toString()]) {
      //     $rootScope.$broadcast('updateRSquared');
      //     calculateRSquaredSequential(dimension_formulas, formula);
      //   }
      // });
    };

    // var calculateRSquaredSequential = function(dimension_formulas, formula) {
    //   // See how many dimensions are left in the array
    //   var dimensions = Object.keys(dimension_formulas);
    //   if (dimensions.length === 0) {
    //     // HACK: jQuery activating the cog visibility
    //     $('#cog').removeClass('visible');
    //     dataService.calculationInProgress = false;
    //     return;
    //   }
    //   var dimensionName = dimensions[dimensions.length - 1];
    //   // ocpuBridge.getCorrelationBasedFeatureSelection()
    //   ocpuBridge.calculateRSquared(dimension_formulas[dimensionName], formula).then(function(rSquared){
    //     dataService.dataset.setRSquared(rSquared, formula);
    //     delete dimension_formulas[dimensionName];
    //     // If you are not supposed to stop for this formula, continue
    //     if (!dataService.stopCalculation[formula.toString()]) {
    //       $rootScope.$broadcast('updateRSquared');
    //       calculateRSquaredSequential(dimension_formulas, formula);
    //     }
    //   });
    // };

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
      // Copy the dimensions array, since the recurive algorithm will delete its contents
      var recursionDimensions = dataService.dataset.getDimensionNames().slice(0);
      // Load the Recursion algorithm with a copy of the formula
      // This is needed because we want to assign proper R^2 values even
      // if there is a new one assigned in the meanwhile
      // calculateRSquaredSequential(dataService.regressionFormula.calculateFormulas(), dataService.regressionFormula.copy());
      calculateRSquaredSequential(recursionDimensions, dataService.regressionFormula.copy());
    };

    dataService.loadData = function(url) {
      dataService.dataset._url = url;
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

    ocpuBridgeService.getCorrelationBasedFeatureSelection = function(dependent){
      return $q(function(resolve, reject){
        var rsession = ocpuBridgeService.sessions[0];
        rsession.getCorrelationBasedFeatureSelection(dependent, function(cfsSession){
          $.getJSON(cfsSession.loc + "R/.val/json" , function(cfs){
            resolve(cfs);
          });
        });
      });
    };

    ocpuBridgeService.calculateRSquared = function(formulas){
      return $q(function(resolve, reject){
        // TODO: Write distribution algorithm here!
        var rsession = ocpuBridgeService.sessions[0];

        rsession.calculateRSquaredValues(formulas, function(rsquaredSession){
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
