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
        var stepSize = 5;
        $scope.altPressed = false;
        $scope.initYPosition = 0;
        $scope.$on('mouseevents::mousemove', function(event, mouseMoveEvent) {
          // If the alt key is not pressed, set the flag accordingly
          if (!mouseMoveEvent.altKey)
            $scope.altPressed = false;
          // Alt key is now pressed and also was before
          if ($scope.altPressed && mouseMoveEvent.altKey) {
            // If the distance in the Y coordinates excedes the necessary number,
            // broadcast the plane change events
            var distanceToInit = mouseMoveEvent.clientY - $scope.initYPosition;
            if (Math.abs(distanceToInit) > stepSize) {
              // if the distance is positive, move slice down, otherwise move it up
              if (distanceToInit > 0)
                // console.log("Change Slice down");
                $scope.$broadcast('glCube::movePlaneDown');
              else
                // console.log("Change Slice up");
                $scope.$broadcast('glCube::movePlaneUp');
              // Reset the init Y Position
              $scope.initYPosition = mouseMoveEvent.clientY;
            }
          }
          // Alt key is now pressed, but wasn't on the last mouse move event
          if (!($scope.altPressed) && mouseMoveEvent.altKey) {
            $scope.altPressed = true;
            $scope.initYPosition = mouseMoveEvent.clientY;
          }
        });
      }
    };
  });
