angular.module('cube')
  .factory('data', ['$rootScope', 'ocpuBridge', function($rootScope, ocpuBridge){
    var dataService = {};
    dataService.dataset = new RCUBE.Dataset();
    dataService.defaultRegressionFormula = new RCUBE.RegressionFormula('z ~ x + y');
    dataService.regressionFormula = new RCUBE.RegressionFormula();
    dataService.calculationInProgress = false;
    dataService.currentReferenceFormula = 'none';
    // This flag is set per formula
    dataService.stopCalculation = {};

    // debug_data = dataService.dataset;

    dataService.getCurrentReferenceFormula = function(){
      if (dataService.currentReferenceFormula == 'none')
        return undefined;
      else
        return dataService.currentReferenceFormula;
    };

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

    // Helper function which sorts an array using a reference array
    // @param reference: Reference array toSort
    // @param toSort: Array which will be sorted using the reference array
    // @return: sorted array
    var sortArrayByReference = function(reference, toSort) {
      // Create position hashmap for fast access
      dimensionIndex = {};
      reference.forEach(function(dimension, index){
        dimensionIndex[dimension] = index;
      });
      // Sort the dimensions
      sorted = [];
      toSort.forEach(function(dimension) {
        // Just add it if it is the first element
        if (sorted.length === 0)
          sorted.push(dimension);
        else {
          newDimensionIndex = dimensionIndex[dimension];
          var inserted = false;
          for (var i = 0; i < sorted.length; i++) {
            // dont do anything if we already inserted the value (for some reason break; does not work as inteded)
            if (!inserted) {
              indexOfCurrentArrayDimension = dimensionIndex[sorted[i]];
              if (indexOfCurrentArrayDimension > newDimensionIndex) {
                // Insert it right before the current array dimension and leave for loop
                sorted.splice(i, 0, dimension);
                inserted = true;
              }
              // If we are at the end of the array, push the new element
              if (i === sorted.length - 1) {
                sorted.push(dimension);
                inserted = true;
              }
            }
          }
        }
      });
      return sorted;
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
        $('.fa.fa-cog.fa-spin').addClass('hidden');
        dataService.calculationInProgress = false;
        // Cache the complete result of the calculation!
        cacheFormulaResult(formula);
        $rootScope.$broadcast('data::formulaComplete');
        return;
      }

      // HACK: Get the correct dependent Variable if the dimension is 'z'
      var calculateBestDimensions = true;
      currentZDimension = dimensions[dimensions.length - 1];
      var dimensionName = null;
      if (formula.getDependentVariable() == 'z')
        dimensionName = currentZDimension;
      else {
        dimensionName = formula.getDependentVariable();
        calculateBestDimensions = false;
      }

      // Calculate the CFS dimensions only if the dependent variable changes in
      // every step (`z ~ x + y`) or the CFS have not been calculated before for
      // the static dependent variable (first dimension, e.g. gender ~ x + y + z)
      if (calculateBestDimensions || typeof dataService.best_dimensions === 'undefined') {
        ocpuBridge.getCorrelationBasedFeatureSelection(dimensionName, dataService.dataset._name).then(function(best_dimensions){
          // Only continue of there is at least one dimension, empty dimensions
          // can be caused by faulty data sets
          if (best_dimensions.length > 0) {
            // The returned features are sorted alphabetically, but this screws up our
            // visualizations when we consider the original sorting provided by the csv
            // file, so we have to sort it again using this exact sorting
            best_dimensions = sortArrayByReference(dataService.dataset._dimensionNames.slice(), best_dimensions);
            // Save the best dimensions locally if we have a fixed dependent dimension
            dataService.best_dimensions = best_dimensions;
            console.log("CFS Dimensions for " + currentZDimension);
            console.log(best_dimensions);

            dataService.dataset._cfsDimensionNames[currentZDimension] = best_dimensions;
            formulas = formula.calculateFormulasDependent(currentZDimension, best_dimensions);
              // Load the R Squared values through the R backend
              ocpuBridge.calculateRSquared(formulas, dataService.dataset._name).then(function(rSquared){
                dataService.dataset.setRSquared(rSquared, formula);
                dimensions.splice(dimensions.length - 1, 1);
                // If you are not supposed to stop for this formula, continue
                if (!dataService.stopCalculation[formula.toString()]) {
                  $rootScope.$broadcast('data::updateRSquared');
                  calculateRSquaredSequential(dimensions, formula);
                }
              });
          }
          else {
            console.log("CFS fails for" + currentZDimension);
            dimensions.splice(dimensions.length - 1, 1);
            // If you are not supposed to stop for this formula, continue
            if (!dataService.stopCalculation[formula.toString()]) {
              $rootScope.$broadcast('data::updateRSquared');
              calculateRSquaredSequential(dimensions, formula);
            }
          }
        });
      }
      // We can skip the calculation of the best dimensions, because the Dependent
      // Variable stays the same and we already calculated the dimensions for it
      // TODO: remove redundancy
      else {
        var best_dimensions = dataService.best_dimensions;
        console.log("Skipped dimension calculation");
        console.log("CFS Dimensions for " + currentZDimension);
        console.log(best_dimensions);
        dataService.dataset._cfsDimensionNames[currentZDimension] = best_dimensions;
        formulas = formula.calculateFormulasDependent(currentZDimension, best_dimensions);
        // Load the R Squared values through the R backend
        ocpuBridge.calculateRSquared(formulas, dataService.dataset._name).then(function(rSquared){
          dataService.dataset.setRSquared(rSquared, formula);
          dimensions.splice(dimensions.length - 1, 1);
          // If you are not supposed to stop for this formula, continue
          if (!dataService.stopCalculation[formula.toString()]) {
            $rootScope.$broadcast('data::updateRSquared');
            calculateRSquaredSequential(dimensions, formula);
          }
        });
        // Skip the unnecessary dimensions
        // if (best_dimensions.indexOf(currentZDimension) != -1) {
        //   dataService.dataset._cfsDimensionNames[currentZDimension] = best_dimensions;
        //   formulas = formula.calculateFormulasDependent(currentZDimension, best_dimensions);
        //   // Load the R Squared values through the R backend
        //   ocpuBridge.calculateRSquared(formulas, dataService.dataset._name).then(function(rSquared){
        //     dataService.dataset.setRSquared(rSquared, formula);
        //     dimensions.splice(dimensions.length - 1, 1);
        //     // If you are not supposed to stop for this formula, continue
        //     if (!dataService.stopCalculation[formula.toString()]) {
        //       $rootScope.$broadcast('data::updateRSquared');
        //       calculateRSquaredSequential(dimensions, formula);
        //     }
        //   });
        // }
        // else {
        //   console.log("Skipped " + currentZDimension);
        //   dimensions.splice(dimensions.length - 1, 1);
        //   // If you are not supposed to stop for this formula, continue
        //   if (!dataService.stopCalculation[formula.toString()]) {
        //     $rootScope.$broadcast('data::updateRSquared');
        //     calculateRSquaredSequential(dimensions, formula);
        //   }
        // }
      }
    };

    var applyFormula = function() {
      // Reset Best Dimensions
      dataService.best_dimensions = undefined;
      // Set calculation flag to true
      dataService.calculationInProgress = true;
      // HACK: jQuery activating the cog visibility
      $('#cog').addClass('visible');
      $('.fa.fa-cog.fa-spin').removeClass('hidden');
      // Use either default formula or new one if there was one provided
      // If the formula is not valid, fall back to the default one
      if (!dataService.regressionFormula.isValid()) {
        dataService.regressionFormula.setFormula(dataService.defaultRegressionFormula.toString());
        dataService.regressionFormula.setValidVariables(dataService.dataset.getDimensionNames().slice(0));
      }
      console.log(dataService.regressionFormula);
      // Initialize the stop flag for this formula
      // var formulaWasAlreadyLoadedBefore = Object.keys(dataService.stopCalculation).indexOf(dataService.regressionFormula.toString()) == -1;
      dataService.stopCalculation[dataService.regressionFormula.toString()] = false;
      // Broadcast event for other components to react
      $rootScope.$broadcast("data::newFormulaApplied");
      dataService.dataset.switchFormula(dataService.regressionFormula);
      // Attempt to load the data from the server if it was calculated before
      console.log("Hashed dataset name: " + dataService.dataset._name);
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
          $('.fa.fa-cog.fa-spin').addClass('hidden');
          dataService.calculationInProgress = false;
          dataService.dataset.setRSquaredGlobal(rSquared, dataService.regressionFormula);
          $rootScope.$broadcast('data::formulaComplete');
          $rootScope.$broadcast('data::updateRSquared');
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
