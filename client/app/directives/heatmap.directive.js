angular.module('cube')
.directive('heatmap', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/heatmap.html',
    controller: function($scope){
      var heatmapCtrl = this;
      heatmapCtrl.orderVisible = false;
      heatmapCtrl.dependent = undefined;
      heatmapCtrl.heatmapRendered = false;
      //heatmapCtrl.metric = {};
      // Attach Pulse
      var pulse = new RCUBE.Pulse('#heatmap-pulse-container');

      heatmapCtrl.visible = false;

      $scope.range = {
        min: 0,
        max: 1
      };
      // http://jimhoskins.com/2012/12/17/angularjs-and-apply.html
      // https://variadic.me/posts/2013-10-15-share-state-between-controllers-in-angularjs.html
      // https://stackoverflow.com/questions/15380140/service-variable-not-updating-in-controller

      var createHeatmap = function(dependentVariable){
        // Update heatmap rendered flag to activate ui controls
        heatmapCtrl.heatmapRendered = true;
        // Remove old Heatmap container
        $('svg.heatmap').remove();
        var names = data.dataset.getDimensionNames().slice();
        // var rSquared = data.dataset.getRSquared()[dependentVariable];
        var rSquared = data.dataset.getRSquared(data.getCurrentReferenceFormula())[dependentVariable];
        var myHeatmap = new RCUBE.Heatmap(".my-heatmap", rSquared, names, $scope.metric, $scope.range.min, $scope.range.max);
        heatmapCtrl.visible = true;
      };

      // Dependent
      heatmapCtrl.dependentOptions = [];
      // Helper object, quickly checks if a dependent variable is added
      heatmapCtrl.dependentOptionsAdded = {};
      // $scope.dependentSelect = {};

      // Reset the Visualization when new Formulas are applied
      $scope.$on('data::newFormulaApplied', function(){
        $('svg.heatmap').remove();
        // Empty the dependentOption Array
        heatmapCtrl.dependentOptions.length = 0;
        heatmapCtrl.dependentOptionsAdded = {};
      });

      $scope.$on('glCube::updatePlane', function(event, args) {
        // Get the selected dimension
        var dimension = args.dimension;
        // console.log("Update Plane to " + dimension);
        // Update the select UI element
        // Get the index of the currently selected dimension
        var dependentOptionsIndex = heatmapCtrl.dependentOptionsAdded[dimension];
        // Set it to the select model
        $scope.dependentSelect = heatmapCtrl.dependentOptions[dependentOptionsIndex];
        $scope.$apply();
        // Update the heatmap
        heatmapCtrl.update(dimension);
      });

      $scope.$on('data::updateRSquared', function(){
        var rSquaredValues = data.getRSquaredValues();
        var values = Object.keys(rSquaredValues);
        // Set Heatmap to visible when we actually have rSquared values to display
        if (values.length > 0) {
          heatmapCtrl.visible = true;
          // Only add entries to the select which are not already added
          values.forEach(function(dimension){
            // Instead of just "true" values, add the index, to create a hash map,
            // which can be used later on, e.g. when updating the z-dimension from the outside
            if (typeof heatmapCtrl.dependentOptionsAdded[dimension] === 'undefined') {
              heatmapCtrl.dependentOptionsAdded[dimension] = heatmapCtrl.dependentOptions.length;
              heatmapCtrl.dependentOptions.push({label: dimension, value: dimension});
              pulse.pulse();
            }
          });
        }
      });

      // React to new reference cube
      $scope.$on('formulaSelector::setNewReference', function(event, referenceData){
        heatmapCtrl.update();
      });

      heatmapCtrl.metricChange = function(){
        if (heatmapCtrl.heatmapRendered)
          heatmapCtrl.update();
      };

      heatmapCtrl.rangeSliderChange = function(){
        if (heatmapCtrl.heatmapRendered)
          heatmapCtrl.update();
      };

      // Update the heatmap either by a redraw or by changing the current dimension
      heatmapCtrl.update = function(dimension) {
        // If no dimension is provided, simply do a redraw, otherwise
        // change the active dimension and then do a redraw
        if (typeof dimension == 'undefined')
          createHeatmap(heatmapCtrl.currentDimension);
        else {
          heatmapCtrl.currentDimension = dimension;
          createHeatmap(dimension);
        }
      };

      heatmapCtrl.selectChange = function(){
        heatmapCtrl.update($scope.dependentSelect.label);
        $rootScope.$broadcast('heatmap::visibleSliceChanged', { 'dimension':this.currentDimension });
      };
    },
  controllerAs: 'heatmapCtrl'
};
}]);
