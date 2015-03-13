angular.module('cube')
.directive('glCube', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/gl-cube.html',
    controller: function($scope){
      var glCubeCtrl = this;
      this.visible = true;
      this.threeCube = null;

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

      $scope.$on('data::updateRSquared', function(){
        if(glCubeCtrl.threeCube === null) {
          // HACK: For some reason, when initialized inside of a Angular controlled
          // Div, the THREE.js Trackball Controls dont work as expected
          // Launching the cube delayed works fine
          setTimeout(function(){
            glCubeCtrl.threeCube = new RCUBE.Cube('cube', data.dataset.getRSquared(), data.dataset.getDimensionNames().slice().reverse());
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
          glCubeCtrl.threeCube.update(data, dimensions);
        }
      };

      $scope.$on('heatmap::visibleSliceChanged', function(event, data){
        if (glCubeCtrl.threeCube !== null)
          glCubeCtrl.threeCube.setPlaneToDimension(data.dimension);
      });
    },
    controllerAs: 'glCubeCtrl'
  };
}]);
