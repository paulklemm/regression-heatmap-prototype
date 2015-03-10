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
        console.log("GlCube::MovePlaneDown");
        this.threeCube.movePlaneDown();
      });

      $scope.$on('glCube::movePlaneUp', function(){
        console.log("GlCube::MovePlaneUp");
        this.threeCube.movePlaneUp();
      });

      $scope.$on('loadingComplete', function(){
        this.threeCube = new RCUBE.Cube('cube', data.dataset.getRSquared(), data.dataset._dimensionNames.slice().reverse());
        debug_cube = this.threeCube;
      });

      $scope.$on('visibleSliceChanged', function(event, data){
        if (typeof this.threeCube !== 'undefined')
          this.threeCube.setPlaneToDimension(data.dimension);
      });
    },
    controllerAs: 'glCubeCtrl'
  };
}]);
