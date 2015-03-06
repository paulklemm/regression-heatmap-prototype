angular.module('cube')
.directive('glCube', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/gl-cube.html',
    controller: function($scope){
      var cubeController = this;
      console.log("Initialzed GL Cube Directive");
      this.visible = true;
    },
    controllerAs: 'glCube'
  };
}]);
