angular.module('cube')
.directive('glCube', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/gl-cube.html',
    controller: function($scope){
      var cubeController = this;
      this.visible = true;
      this.threeCube = undefined;

      $scope.$on('glCube::movePlaneDown', function(){
        if (typeof this.threeCube !== 'undefined') {
          var newDimension = this.threeCube.movePlaneDown();
          if (newDimension !== null)
            $scope.$broadcast('glCube::updatePlane', { 'dimension': newDimension });
        }
      });

      $scope.$on('glCube::movePlaneUp', function(){
        if (typeof this.threeCube !== 'undefined') {
          var newDimension = this.threeCube.movePlaneUp();
          if (newDimension !== null)
            $scope.$broadcast('glCube::updatePlane', { 'dimension': newDimension });
        }
      });

      $scope.$on('data::loadingComplete', function(){
        this.threeCube = new RCUBE.Cube('cube', data.dataset.getRSquared(), data.dataset._dimensionNames.slice().reverse());
        debug_cube = this.threeCube;
      });

      $scope.$on('heatmap::visibleSliceChanged', function(event, data){
        if (typeof this.threeCube !== 'undefined')
          this.threeCube.setPlaneToDimension(data.dimension);
      });
    },
    controllerAs: 'glCubeCtrl'
  };
}]);
