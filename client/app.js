(function() {
var app = angular.module('cube', ['flow', 'ngAnimate']);
// Constructor Code
app.run(['$rootScope', '$http', 'ocpuBridge', 'data', function($rootScope, $http, ocpuBridge, data) {
  // Load the file containing all servers
  $http.get('config.json')
    .then(function(result){
      $rootScope.debugMode = result.data.debugMode;
      // and fill it with new Server connections
      result.data.servers.forEach(function(server){
        // $rootScope.ocpuBridge.push(new RCUBE.RSession(server.url, server.name));
        ocpuBridge.pushService(server.url, server.name);
      });
      // DEBUG Emit loading event, which would otherwise be triggered through flow
      if ($rootScope.debugMode)
        data.loadData(document.URL + result.data.dataSetName);
    });
}]);

app.config(['flowFactoryProvider', function (flowFactoryProvider) {
  flowFactoryProvider.defaults = {
    target: '/upload',
    // Test Chunks looks for already uploaded chunks before
    // uploading them again. This may be suitable for large data sets
    testChunks: true,
    progressCallbacksInterval: 0,
    permanentErrors:[404, 500, 501]
  };
  // You can also set default events:
  flowFactoryProvider.on('catchAll', function (event) {
    // Uncomment to see all Flow Events
    // console.log('catchAll', arguments);
  });
}]);

})();
