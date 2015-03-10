// https://stackoverflow.com/questions/23272169/what-is-the-best-way-to-bind-to-a-global-event-in-a-angularjs-directive
angular.module('cube')
  .directive('mousedown', function($window) {
    return {
      link: function(scope) {
        angular.element($window).on('mousedown', function(e) {
          scope.$broadcast('mouseevents::mousedown', e);
        });
      }
    };
  })
  .directive('mousemove', function($window) {
    return {
      link: function(scope) {
        angular.element($window).on('mousemove', function(e) {
          scope.$broadcast('mouseevents::mousemove', e);
        });
      }
    };
  })
  .directive('mouseup', function($window) {
    return {
      link: function(scope) {
        angular.element($window).on('mouseup', function(e) {
          scope.$broadcast('mouseevents::mouseup', e);
        });
      }
    };
  });

angular.module('cube')
  .directive('handleSliceMouseEvents', function() {
    return {
      link: function($scope, element) {
        $scope.mousedown = false;
        $scope.$on('mouseevents::mousedown', function(event, mouseDownEvent) {
          $scope.mousedown = true;
        });
        $scope.$on('mouseevents::mousemove', function(event, mouseDownEvent) {
          if ($scope.mousedown) {
            console.log("Mousedown");
          }
        });
        $scope.$on('mouseevents::mouseup', function(event, mouseDownEvent) {
          $scope.mousedown = false;
        });
      }
    };
  });
