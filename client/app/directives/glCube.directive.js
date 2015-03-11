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
        if (this.threeCube !== null) {
          var newDimension = this.threeCube.movePlaneDown();
          if (newDimension !== null)
            $scope.$broadcast('glCube::updatePlane', { 'dimension': newDimension });
        }
      });

      $scope.$on('glCube::movePlaneUp', function(){
        if (this.threeCube !== null) {
          var newDimension = this.threeCube.movePlaneUp();
          if (newDimension !== null)
            $scope.$broadcast('glCube::updatePlane', { 'dimension': newDimension });
        }
      });

      // TODO: Move this logic to the updateRSquared listener
      $scope.$on('data::loadingComplete', function(){
        glCubeCtrl.threeCube = new RCUBE.Cube('cube', data.dataset.getRSquared(), data.dataset._dimensionNames.slice().reverse());
        debug_cube = glCubeCtrl.threeCube;
      });

      $scope.$on('data::updateRSquared', function(){
        console.log("Cube: Update R Squared called");
        var rSquaredValues = data.getRSquaredValues();
        var values = Object.keys(rSquaredValues);
        glCubeCtrl.updateCube(rSquaredValues);
      });

      glCubeCtrl.updateCube = function(data) {
        console.log("glCubeCtrl.UpdateCube called");
        console.log(glCubeCtrl);
        if (glCubeCtrl.threeCube !== null) {
          console.log("Updating Three Cube");
          glCubeCtrl.threeCube.update(data);
        }
      };

      $scope.$on('heatmap::visibleSliceChanged', function(event, data){
        if (this.threeCube !== null)
          this.threeCube.setPlaneToDimension(data.dimension);
      });
    },
    controllerAs: 'glCubeCtrl'
  };
}]);
