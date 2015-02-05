angular.module('cube')
  .directive('formulaEditor', ['$rootScope', 'data', function($rootScope, data) {
    return {
      restrict: 'E',
      require: 'ngModel',
      templateUrl: 'app/directives/formula-editor.html',

      controller: function($scope) {
        var editorController = this;
        this.enabled = false;
        this.popup = {};
        this.popup.lastTextCompleteWord = '';
        this.popup.show = false;
        this.popup.defaultHeader = 'Available commands';
        this.popup.defaultContentOperators = 'Available Operators: ~, +, -, :, *, /, |';
        // The default dimensions are fetched in the watch statement
        this.popup.defaultContentDimensions = '';
        this.popup.textCompleteVisible = false;
        this.popup.header = editorController.popup.defaultHeader;
        this.popup.content = editorController.popup.defaultContentOperators;
        this.regressionFormula = new RCUBE.RegressionFormula();

        this.formulaChange = function(){
          this.regressionFormula.setFormula($scope.formulaInput);
          this.updatePopup();
        };

        this.submitFormula = function(){
          data.formulaUpdate(this.regressionFormula);
        };

        this.updatePopup = function(name){
          if (name !== undefined){
            editorController.popup.header = name;
            // $scope.$apply(editorController.popup.content = name);
            editorController.popup.content = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
          }
          else {
            // Only update the popup if there is currently no textcomplete visible
            if (!this.popup.textCompleteVisible) {
              editorController.popup.header = editorController.popup.defaultHeader;
              editorController.popup.content = editorController.popup.defaultContentOperators + '\nDimensions:\n' + editorController.popup.defaultContentDimensions + '\n' + editorController.regressionFormula._errorText;
            }
          }
        };

        // Watch the dimension array
        $scope.dimensions = data.dataset.getDimensionNames();
        // Attach typeahead logic to the UI
        $scope.$watchCollection('dimensions', function(dimensions) {
          // Only attach the typeahead logic if there are dimensions available
          if (dimensions.length > 0) {
            // Attach X and Y variables to the dimension list
            // We copy the dimensions list to not interfere with it in other controllers
            var typeaheadDimensions = dimensions.slice(0);
            typeaheadDimensions.splice(0, 0, 'x', 'y', 'z');

            // Update Dimension String for default tooltip
            var dimensionsAsString = '';
            dimensions.forEach(function(dimension) {
              dimensionsAsString = dimensionsAsString + dimension + ', ';
            });
            editorController.popup.defaultContentDimensions = dimensionsAsString;

            // Update valid dimensions for formula check
            editorController.regressionFormula.setValidVariables(typeaheadDimensions);

            // Update textcomplete Plugin
            $('#formula-input').textcomplete([{
              words: typeaheadDimensions,
              match: /\b(\w{0,})$/,
              search: function(term, callback) {
                callback($.map(this.words, function(word) {
                  var currentWord = word.indexOf(term) === 0 ? word : null;
                  if (currentWord !== null)
                    editorController.popup.lastTextCompleteWord = currentWord;
                  return word.indexOf(term) === 0 ? word : null;
                }));
              },
              index: 1,
              replace: function(word) {
                return word + ' ';
              }
            }])
            .on({
              'textComplete:show': function (e) {
                editorController.popup.textCompleteVisible = true;
                $scope.$apply(editorController.updatePopup(editorController.popup.lastTextCompleteWord));
              },
              'textComplete:hide': function (e) {
                editorController.popup.textCompleteVisible = false;
                $scope.$apply(editorController.updatePopup());
              }
            });
            // Enable the element
            editorController.enabled = true;
          }
        });
      },
      controllerAs: 'editor'
    };
  }]);
