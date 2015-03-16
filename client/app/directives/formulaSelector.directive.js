angular.module('cube')
.directive('formulaSelector', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/formula-selector.html',
    controller: function($scope){
      var selectorCtrl = this;
      selectorCtrl.visible = true;
      selectorCtrl.formulaOptions = [];
      selectorCtrl.formulaOptions.push({label: 'none', value: 'none'});
      $scope.formulaSelect = selectorCtrl.formulaOptions[0];

      $scope.$on('data::formulaComplete', function(){
        var currentFormulaAsString = data.regressionFormula.toString();
        selectorCtrl.formulaOptions.push({label: currentFormulaAsString, value: currentFormulaAsString});
      });

      selectorCtrl.selectChange = function() {
        selectorCtrl.currentFormula = $scope.formulaSelect.label;
        data.currentReferenceFormula = selectorCtrl.currentFormula;
        $rootScope.$broadcast('formulaSelector::setNewReference', { 'formula': selectorCtrl.currentFormula });
        console.log("Select Change with " + selectorCtrl.currentFormula);
      };
    },
  controllerAs: 'selectorCtrl'
};
}]);
