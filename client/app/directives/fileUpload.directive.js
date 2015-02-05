angular.module('cube')
.directive('fileUpload', ['$rootScope', 'data', function($rootScope, data){
  return {
    restrict: 'E',
    templateUrl: 'app/directives/file-upload.html',
    controller: function($scope){
      var thisController = this;
      if ($rootScope.debugMode)
        this.visible = false;
      else this.visible = true;
      this.uploadEnabled = false;
      this.hideUploadButton = false;
      this.progressbar = {
        "visible": false,
        "percent": 0
      };
      // Has to be defined on the Scope, because `input`s don't have an angular change event
      // See https://stackoverflow.com/questions/17922557/angularjs-how-to-check-for-changes-in-file-input-fields
      $scope.fileNameChanged = function(){
        thisController.uploadEnabled = true;
      };

      $scope.uploader = {};
      this.upload = function() {
        this.uploadEnabled = false;
        this.hideUploadButton = true;
        $scope.uploader.flow.upload();
      };

      $scope.uploader.flowUploadStart = function(){
        thisController.progressbar.visible = true;
      };

      $scope.uploader.flowFileProgress = function($file){
        thisController.progressbar.percent = $file.progress() * 100;
      };

      $scope.uploader.flowFileSuccess = function ($flow, $file, $message) {
        thisController.visible = false;
        // TODO: Write logic to replace filename with hashed one to transmit to R
        var response = JSON.parse($message);
        console.log("Response filename is " + response.filename);
        //data.loadData(document.URL + $file.name);
        data.loadData(document.URL + response.filename);
      };
    },
    controllerAs: 'myUploader'
  };
}]);
