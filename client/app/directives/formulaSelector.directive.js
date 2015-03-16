angular.module('cube')
.directive('formulaSelector', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/formula-selector.html',
    controller: function($scope){
      var selectorCtrl = this;
      selectorCtrl.visible = true;
      selectorCtrl.formulaOptions = [];
      selectorCtrl.formulaOptions.push({label: 'dimension', value: 'dimension'});

      // ToDo Trigger difference view
      selectorCtrl.selectChange = function(){

      };
    },
  controllerAs: 'selectorCtrl'
};
}]);
