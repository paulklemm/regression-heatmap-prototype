/**
 * This class acts as connection to a OpenCPU instance and handles the communication to it.
 *
 * @class OpenCPUConnection
 * @param URL: Url to the OpenCPU Server (e.g. "http://localhost:8054/ocpu")
 */
RCUBE.Helper.OpenCPUConnection = function(URLToOpenCPUServer) {
  if (!("ocpu" in window)) {
    console.err("OpenCPU Javascript API is not loaded.");
    return;
  }
  this._URLToOpenCPUServer = URLToOpenCPUServer;
};

/**
 * This method exectes a R command through the OpenCPU bridge and makes
 * the results available through callback functions
 *
 * @method execute
 * @param {String} namespace Namespace of the R function (e.g. "/library/regressionCube/R")
 * @param {String} command Name of the R function
 * @param {Object} parameters JSON config object of the R command
 * @param {String} config.name The name on the config object
 * @param {Function} callbackSuccess Callback function for successfull command (gets handed the session object)
 * @param {Function} callbackFail Callback function for failed command (gets handed the error object)
 */
RCUBE.Helper.OpenCPUConnection.prototype.execute = function(namespace, command, parameters, callbackSuccess, callbackFail) {
  if (parameters == undefined) parameters = {};
  ocpu.seturl(this._URLToOpenCPUServer + namespace)
  ocpu.call(command, parameters, function(session) {
    if (callbackSuccess != undefined) callbackSuccess(session);
  }).fail(function() {
    if (callbackFail != undefined) callbackFail(req);
  });
}
