angular.module('cube')
.directive('heatmap', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/heatmap.html',
    controller: function($scope){
      var heatmapCtrl = this;
      heatmapCtrl.dependent = undefined;
      // Attach Pulse
      var pulse = new RCUBE.Pulse('#heatmap-pulse-container');

      heatmapCtrl.visible = false;
      // http://jimhoskins.com/2012/12/17/angularjs-and-apply.html
      // https://variadic.me/posts/2013-10-15-share-state-between-controllers-in-angularjs.html
      // https://stackoverflow.com/questions/15380140/service-variable-not-updating-in-controller

      var createHeatmap = function(dependentVariable){
        // Remove old Heatmap container
        $('svg.heatmap').remove();
        var names = data.dataset.getDimensionNames();
        var rSquared = data.dataset.getRSquared()[dependentVariable];
        var myHeatmap = new RCUBE.Heatmap(".my-heatmap", rSquared, names);
        heatmapCtrl.visible = true;
      };

      // Dependent
      heatmapCtrl.dependentOptions = [];
      // Helper object, quickly checks if a dependent variable is added
      heatmapCtrl.dependentOptionsAdded = {};
      $scope.dependentSelect = heatmapCtrl.dependentOptions[0];

      // Reset the Visualization when new Formulas are applied
      $scope.$on('newFormulaApplied', function(){
        $('svg.heatmap').remove();
        // Empty the dependentOption Array
        heatmapCtrl.dependentOptions.length = 0;
        heatmapCtrl.dependentOptionsAdded = {};
      });

      $scope.$on('glCube::updatePlane', function(event, args) {
        // Get the selected dimension
        var dimension = args.dimension;
        console.log("Update Plane to " + dimension);
        // Update the select UI element
        $scope.dependentSelect.value = dimension;
        $scope.dependentSelect.label = dimension;
        $scope.$apply();
        // Update the heatmap
        heatmapCtrl.changeZ(dimension);
      });

      $scope.$on('updateRSquared', function(){
        var rSquaredValues = data.getRSquaredValues();
        var values = Object.keys(rSquaredValues);
        // Set Heatmap to visible when we actually have rSquared values to display
        if (values.length > 0) {
          heatmapCtrl.visible = true;
          // Only add entries to the select which are not already added
          values.forEach(function(dimension){
            if (heatmapCtrl.dependentOptionsAdded[dimension] !== true) {
              heatmapCtrl.dependentOptionsAdded[dimension] = true;
              heatmapCtrl.dependentOptions.push({label: dimension, value: dimension});
              pulse.pulse();
            }
          });
        }
      });

      heatmapCtrl.changeZ = function(dimension) {
        heatmapCtrl.currentDimension = dimension;
        createHeatmap(dimension);
      };

      heatmapCtrl.selectChange = function(){
        heatmapCtrl.changeZ($scope.dependentSelect.label);
        $rootScope.$broadcast('heatmap::visibleSliceChanged', { 'dimension':this.currentDimension });
      };
    },
  controllerAs: 'heatmapCtrl'
};
}]);
