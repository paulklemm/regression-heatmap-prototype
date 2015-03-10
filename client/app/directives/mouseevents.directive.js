// https://stackoverflow.com/questions/23272169/what-is-the-best-way-to-bind-to-a-global-event-in-a-angularjs-directive
angular.module('cube')
  .directive('mousedown', function($window) {
    return {
      link: function(scope) {
        angular.element($window).on('mousedown', function(e) {
          // Namespacing events with name of directive + event to avoid collisions
          scope.$broadcast('mouseevents::mousedown', e);
        });
      }
    };
  });

angular.module('cube')
  .directive('handleMouseEvents', function() {
    return {
      link: function($scope, element) {
        $scope.$on('mouseevents::mousedown', function(event, mouseDownEvent) {
          // doSomethingFancy(element);
          console.log("Catching Mouse Down");
          console.log(mouseDownEvent);
          console.log(element);
        });
      }
    };
  });
