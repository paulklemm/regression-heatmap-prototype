angular.module('cube')
.directive('glCube', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/gl-cube.html',
    controller: function($scope){
      var glCubeCtrl = this;
      this.visible = true;
      this.threeCube = null;
      glCubeCtrl.sliderMin = 0;
      glCubeCtrl.sliderMax = 1;
      glCubeCtrl.metric = 'rSquared';

      $scope.$on('glCube::movePlaneDown', function(){
        if (glCubeCtrl.threeCube !== null) {
          var newDimension = glCubeCtrl.threeCube.movePlaneDown();
          if (newDimension !== null)
            $scope.$broadcast('glCube::updatePlane', { 'dimension': newDimension });
        }
      });

      $scope.$on('glCube::movePlaneUp', function(){
        if (glCubeCtrl.threeCube !== null) {
          var newDimension = glCubeCtrl.threeCube.movePlaneUp();
          if (newDimension !== null)
            $scope.$broadcast('glCube::updatePlane', { 'dimension': newDimension });
        }
      });

      $scope.$on('data::newFormulaApplied', function(){
        if (glCubeCtrl.threeCube !== null) {
          $('gl-cube canvas').remove();
          glCubeCtrl.threeCube = null;
        }
      });

      $scope.$on('heatmap::rangeSliderChanged', function(event, sliderSettings){
        glCubeCtrl.sliderMin = sliderSettings.min;
        glCubeCtrl.sliderMax = sliderSettings.max;
        glCubeCtrl.updateCube();
      });

      $scope.$on('heatmap::metricChanged', function(event, metricSettings){
        glCubeCtrl.metric = metricSettings.metric;
        glCubeCtrl.updateCube();
      });

      $scope.$on('data::updateRSquared', function(){
        if(glCubeCtrl.threeCube === null) {
          // HACK: For some reason, when initialized inside of a Angular controlled
          // Div, the THREE.js Trackball Controls dont work as expected
          // Launching the cube delayed works fine

          setTimeout(function(){
            glCubeCtrl.threeCube = new RCUBE.Cube('cube', data.dataset.getRSquared(), data.dataset.getDimensionNames().slice().reverse(), data.regressionFormula.dependentVariableIsStatic());
          }, 10);
        }
        else {
          var rSquaredValues = data.getRSquaredValues();
          var values = Object.keys(rSquaredValues);
          // glCubeCtrl.updateCube(rSquaredValues, data.dataset.getDimensionNames().slice().reverse());
          glCubeCtrl.updateCube(rSquaredValues);
        }
      });

      glCubeCtrl.updateCube = function(data, dimensions) {
        if (glCubeCtrl.threeCube !== null) {
          glCubeCtrl.threeCube.update(data, dimensions, glCubeCtrl.metric, glCubeCtrl.sliderMin, glCubeCtrl.sliderMax);
        }
      };
      // Update when a new Reference formula is added
      $scope.$on('formulaSelector::setNewReference', function(event, referenceData){
        if (glCubeCtrl.threeCube !== null) {
          var rSquared = data.dataset.getRSquared(data.getCurrentReferenceFormula());
          glCubeCtrl.threeCube.update(rSquared);
        }
      });

      $scope.$on('heatmap::visibleSliceChanged', function(event, data){
        if (glCubeCtrl.threeCube !== null)
          glCubeCtrl.threeCube.setPlaneToDimension(data.dimension);
      });
    },
    controllerAs: 'glCubeCtrl'
  };
}]);
