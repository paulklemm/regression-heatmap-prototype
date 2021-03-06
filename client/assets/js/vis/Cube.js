(function() {
RCUBE.Cube = function(canvasID, data, dimensions, normalizeUsingRays) {
  // Since the Heatmap visualization is also sorted by name, we do the same thing here!
  this._canvasID = canvasID;
  // Displays the FPS Stats view if true
  this._showFPS = false;
  this._dimensions = dimensions;
  this._plane = undefined;
  this._currentPlaneDimension = null;
  this._currentPlaneDimensionGeometry = null;
  this._sliceDistanceZ = 20;
  this._sliceDistanceX = 10;
  this._sliceDistanceY = 10;
  this._glScene = undefined;
  this._glSliceGeometry = undefined;
  this._glCubeGeometry = null;
  this._glCubeParticles = null;
  this._data = data;
  if (typeof normalizeUsingRays == 'undefined')
    this._normalizeUsingRays = false;
  else
  this._normalizeUsingRays = normalizeUsingRays;
  console.log("Normalize using rays is " + this._normalizeUsingRays);
  this._dimensionsAlreadyAdded = {};
  this.createRegressionMaps();
  this.main(canvasID, data, dimensions);
};

// At the moment, this is the exact copy of the function found in heatmap.js
RCUBE.Cube.prototype.createRegressionMaps = function() {
  // Regression types are converted using IDs. These IDs are mapped onto
  // a ColorBrewer array later on in the visualization to determine the color
  this._regressionTypeToId = {
    'logistic': 0,
    'linear': 1,
    'median': 2
  };
  // Create array to also project this back
  this._regressionIdToType = [];
  for (var regressionType in this._regressionTypeToId) {
    var id = this._regressionTypeToId[regressionType];
    this._regressionIdToType[id] = regressionType;
  }
};

RCUBE.Cube.prototype.update = function(data, dimensions, metric, min, max) {
  var self = this;

  console.log("updated cube with metric " + metric);

  // Check if dimensions are defined
  if (typeof dimensions == 'undefined')
    dimensions = self._dimensions.slice();

  // Check if data are defined
  if (typeof data == 'undefined')
    data = self._data;
  else
    self._data = data;

  var dimensionsSorted = dimensions.slice().sort();

  // identify the dimensions, which need updates
  var rSquaredDimensions = Object.keys(data);
  var dimensionsToProcess = [];
  // console.log("Update Dimensions");
  // console.log(rSquaredDimensions);
  rSquaredDimensions.forEach(function(currentDimension){
    if (self._dimensionsAlreadyAdded[currentDimension] !== true) {
      dimensionsToProcess.push(currentDimension);
    }
  });

  attributesPlane = {
    alpha: { type: 'f', value: [] },
  };

  // uniforms
  uniforms = {
    color: { type: "c", value: new THREE.Color( 0xff0000 ) },
  };

  shaderMaterial = new THREE.ShaderMaterial( {

    uniforms:       uniforms,
    vertexColors:   THREE.VertexColors,
    attributes:     attributesPlane,
    vertexShader:   document.getElementById( 'vertexshader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
    // Depth Test: https://github.com/mrdoob/three.js/issues/1928
    depthTest:false,
    transparent: true

  });

  // Geometry
  // if (self._glCubeGeometry === null)
  //   geometryPlane = new THREE.Geometry();
  // else
  // geometryPlane = self._glCubeGeometry;
  geometryPlane = new THREE.Geometry();

  var transferfunction = d3.scale.linear()
    .domain([0, 1])
    .range(['#fff7fb', '#023858']);

  var sliceGeometry = {};
  self._glSliceGeometry = sliceGeometry;

  var colorPlane = new THREE.Color("#1f77b4");
  var regressionIdToColor = d3.scale.category10().domain(d3.range(10));
  var colorPlaneSelection = new THREE.Color("#ff7f0e");
  // Used to normalize the overall F statistics
  var maxFStatistic = 0;
  var maxAIC = 0;

  // Only calculate the mean values, if the current formula has a fixed target feature
  // if (self._normalizeUsingRays) {
    var targetStatisticMeanCount = {};
    dimensions.forEach(function(dimension_z, z) {
      dimensionsSorted.forEach(function(dimension_y, y) {
        dimensionsSorted.forEach(function(dimension_x, x) {
          if (typeof data[dimension_z] != 'undefined' &&
            typeof data[dimension_z][dimension_y] != 'undefined' &&
            typeof data[dimension_z][dimension_y][dimension_x] != 'undefined') {
              if (typeof targetStatisticMeanCount[dimension_y] == 'undefined')
                targetStatisticMeanCount[dimension_y] = {};
              if (typeof targetStatisticMeanCount[dimension_y][dimension_x] == 'undefined')
                targetStatisticMeanCount[dimension_y][dimension_x] = {};
              if (typeof targetStatisticMeanCount[dimension_y][dimension_x].featureSum == 'undefined') {
                targetStatisticMeanCount[dimension_y][dimension_x].featureSum = 0;
                targetStatisticMeanCount[dimension_y][dimension_x].featureCount = 0;
              }
              var currentFeature;
              var regressionType = data[dimension_z][dimension_y][dimension_x].regressionType;
              // Typecheck metric
              if (metric == 'aic') {
                currentFeature = parseFloat(data[dimension_z][dimension_y][dimension_x].aic);
                // Increase the maximum AIC to adjust the transfer function
                if (currentFeature > maxAIC)
                  maxAIC = currentFeature;
              }
              else if (metric == 'rSquared' || regressionType != 'linear')
                currentFeature = parseFloat(data[dimension_z][dimension_y][dimension_x].rSquared);
              else if (metric == 'adjrSquared')
                currentFeature = parseFloat(data[dimension_z][dimension_y][dimension_x].adjrSquared);
              else if (metric == 'fstatistic') {
                currentFeature = parseFloat(data[dimension_z][dimension_y][dimension_x].fstatistic);
                // Increase the maximum F Statistic to adjust the transfer function
                if (currentFeature > maxFStatistic)
                  maxFStatistic = currentFeature;
              }

              if (!isNaN(currentFeature)) {
                targetStatisticMeanCount[dimension_y][dimension_x].featureSum += currentFeature;
              // console.log(parseFloat(data[dimension_z][dimension_y][dimension_x].rSquared));
                targetStatisticMeanCount[dimension_y][dimension_x].featureCount += 1;
              }
          }
        });
      });
    });
  // }

  // Set the transfer functions for the opacity as well as for the f statistic
  var transferfunctionOpacity = d3.scale.linear()
    .domain([min, max]);
  var fScoreRange = d3.scale.linear().domain([0, maxFStatistic]);
  var aicRange = d3.scale.linear().domain([maxAIC, 0]);


  // HACK:
  var firstcolor = null;

  // Iterate over all dimensions and check for values
  // dimensions.forEach(function(dimension_z, z) {
  // console.log(self._dimensionsAlreadyAdded);
  dimensions.forEach(function(dimension_z, z) {
    // console.log("self._dimensionsAlreadyAdded[dimension_z]");
    // console.log(self._dimensionsAlreadyAdded[dimension_z]);
    // if (self._dimensionsAlreadyAdded[dimension_z] !== true && typeof data[dimension_z] != 'undefined') {
    if (typeof data[dimension_z] != 'undefined') {
      self._dimensionsAlreadyAdded[dimension_z] = true;
      // console.log("ATTACHING DIMENSION " + dimension_z);
    // ["smoking", "age"].forEach(function(dimension_z, z) {
    // ['Mammography_Left_BI_RADS'].forEach(function(dimension_z, z) {
      geometryPlaneSelection = new THREE.Geometry();
      attributesPlaneSelection = {
        alpha: { type: 'f', value: [] },
      };
      // uniforms
      uniformsSlice = {
        color: { type: "c", value: new THREE.Color( 0xff0000 ) },
      };

      sliceShaderMaterial = new THREE.ShaderMaterial( {

        uniforms:       uniformsSlice,
        vertexColors:   THREE.VertexColors,
        attributes:     attributesPlaneSelection,
        vertexShader:   document.getElementById( 'vertexshaderCurrentSlice' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        // Depth Test: https://github.com/mrdoob/three.js/issues/1928
        depthTest:false,
        transparent: true
      });

      dimensionsSorted.forEach(function(dimension_y, y) {
        dimensionsSorted.forEach(function(dimension_x, x) {
          if (typeof data[dimension_z] != 'undefined' &&
            typeof data[dimension_z][dimension_y] != 'undefined' &&
            typeof data[dimension_z][dimension_y][dimension_x] != 'undefined') {

            // console.log("Add " + dimension_x + "," + dimension_y + "," + dimension_z + ": " + data[dimension_z][dimension_y][dimension_x]);
            // console.log(x + ", " + y + ", " + z);

            var vertexPlane = new THREE.Vector3();
            var vertexPlaneSelection = new THREE.Vector3();
            vertexPlane.z = z * self._sliceDistanceZ - ((dimensions.length * self._sliceDistanceZ) / 2);
            vertexPlaneSelection.z = z * self._sliceDistanceZ - ((dimensions.length * self._sliceDistanceZ) / 2);
            if (x < y) {
              vertexPlane.x = x * self._sliceDistanceX - ((dimensions.length * self._sliceDistanceX) / 2);
              vertexPlane.y = y * self._sliceDistanceY - ((dimensions.length * self._sliceDistanceY) / 2);
              vertexPlaneSelection.x = y * self._sliceDistanceX - ((dimensions.length * self._sliceDistanceX) / 2);
              vertexPlaneSelection.y = x * self._sliceDistanceY - ((dimensions.length * self._sliceDistanceY) / 2);
            }
            else {
              vertexPlane.x = y * self._sliceDistanceX - ((dimensions.length * self._sliceDistanceX) / 2);
              vertexPlane.y = x * self._sliceDistanceY - ((dimensions.length * self._sliceDistanceY) / 2);
              vertexPlaneSelection.x = x * self._sliceDistanceX - ((dimensions.length * self._sliceDistanceX) / 2);
              vertexPlaneSelection.y = y * self._sliceDistanceY - ((dimensions.length * self._sliceDistanceY) / 2);
            }
            geometryPlane.vertices.push( vertexPlane );
            geometryPlaneSelection.vertices.push( vertexPlaneSelection );

            // var colorPlane = new THREE.Color(transferfunction(data[dimension_z][dimension_y][dimension_x]));
            // Calculate the color for the current element from the regression type
            var regressionType = data[dimension_z][dimension_y][dimension_x].regressionType;
            var regressionId = self._regressionTypeToId[regressionType];
            var regressionColor = regressionIdToColor(regressionId);
            regressionColor = new THREE.Color(regressionColor);
            if (firstcolor === null)
              firstcolor = regressionColor;

            geometryPlane.colors.push(regressionColor);
            geometryPlaneSelection.colors.push(regressionColor);
            // geometryPlane.colors.push(firstcolor);
            // geometryPlaneSelection.colors.push(firstcolor);

            // Determine the proper target metric
            var currentStatistic;
            if (metric == 'aic')
              currentStatistic = 'aic';
            else if (metric == 'rSquared' || regressionType != 'linear')
              currentStatistic = "rSquared";
            else if (metric == 'adjrSquared')
              currentStatistic = "adjrSquared";
            else if (metric == 'fstatistic')
              currentStatistic = "fstatistic";

            // Do not normalize using the rays, use plain rSquared features
            if (self._normalizeUsingRays) {
              var meanStatisticForRay = targetStatisticMeanCount[dimension_y][dimension_x].featureSum / targetStatisticMeanCount[dimension_y][dimension_x].featureCount;
              // console.log("targetStatisticMeanCount[dimension_y][dimension_x].featureSum " + targetStatisticMeanCount[dimension_y][dimension_x].featureSum);
              // console.log("targetStatisticMeanCount[dimension_y][dimension_x].featureCount " + targetStatisticMeanCount[dimension_y][dimension_x].featureCount);
              // console.log("meanStatisticForRay: " + meanStatisticForRay);
              var meanStatistic = Math.abs(data[dimension_z][dimension_y][dimension_x][currentStatistic] - meanStatisticForRay);
              // console.log("rSquared: " + data[dimension_z][dimension_y][dimension_x].rSquared);
              // console.log("meanStatistic: " + meanStatistic);
              // TODO: The transfer function does not work as inteneded here, since the meanValue is derived from normalizing all
              // values along the ray. Maybe it should be disabled for normalized values?
              if (metric == 'fstatistic')
                attributesPlane.alpha.value.push(transferfunctionOpacity(fScoreRange(meanStatistic)));
              else if (metric == 'aic')
                attributesPlane.alpha.value.push(transferfunctionOpacity(aicRange(meanStatistic)));
              else
                attributesPlane.alpha.value.push(transferfunctionOpacity(meanStatistic));
            }
            else if (metric == 'aic')
              attributesPlane.alpha.value.push(transferfunctionOpacity(aicRange(data[dimension_z][dimension_y][dimension_x][currentStatistic])));
            else if (metric == 'fstatistic' && regressionType == 'linear')
              attributesPlane.alpha.value.push(transferfunctionOpacity(fScoreRange(data[dimension_z][dimension_y][dimension_x][currentStatistic])));
            else
              attributesPlane.alpha.value.push(transferfunctionOpacity(data[dimension_z][dimension_y][dimension_x][currentStatistic]));

            if (metric == 'fstatistic' && regressionType == 'linear')
              attributesPlaneSelection.alpha.value.push(transferfunctionOpacity(fScoreRange(data[dimension_z][dimension_y][dimension_x][currentStatistic])));
            else if (metric == 'aic')
              attributesPlaneSelection.alpha.value.push(transferfunctionOpacity(aicRange(data[dimension_z][dimension_y][dimension_x][currentStatistic])));
            else
              attributesPlaneSelection.alpha.value.push(transferfunctionOpacity(data[dimension_z][dimension_y][dimension_x][currentStatistic]));
          }
        });
      });
      var sliceParticles = new THREE.PointCloud( geometryPlaneSelection, sliceShaderMaterial );
      sliceGeometry[dimension_z] = sliceParticles;
    }
  });

  size  = 6;

  materials = new THREE.PointCloudMaterial( {
    size: size,
    vertexColors: THREE.VertexColors
  });

  particles = new THREE.PointCloud( geometryPlane, shaderMaterial );

  self._glCubeGeometry = geometryPlane;
  if (self._glCubeParticles !== null)
    self._glScene.remove( self._glCubeParticles );

  self._glCubeParticles = particles;

  self._glScene.add(self._glCubeParticles);
  return particles;
};

RCUBE.Cube.prototype.movePlaneUp = function() {
  // If the current plane is not defined, set it to the first dimension
  if (this._currentPlaneDimension === null)
    this._currentPlaneDimension = this._dimensions[0];

  // Get the index of the current dimension
  var currentIndex = this._dimensions.indexOf(this._currentPlaneDimension);
  // Move the plane up if it isn't already at the last element
  if (currentIndex != -1 && currentIndex != this._dimensions.length - 1) {
    this.setPlaneToDimension(this._dimensions[currentIndex + 1]);
    // Return the new dimension
    return this._dimensions[currentIndex + 1];
  }
  else
    return null;
};

RCUBE.Cube.prototype.movePlaneDown = function() {
  // Get the index of the current dimension
  var currentIndex = this._dimensions.indexOf(this._currentPlaneDimension);
  // Move the plane up if it isn't already at the last element
  if (currentIndex != -1 && currentIndex !== 0) {
    this.setPlaneToDimension(this._dimensions[currentIndex - 1]);
    // Return the new dimension
    return this._dimensions[currentIndex - 1];
  }
  else
    return null;
};

RCUBE.Cube.prototype.setPlaneToDimension = function(dimensionName) {
  // Get the necessary variables
  var sliceDistance = this._sliceDistanceZ;
  var dimensionNumber = this._dimensions.indexOf(dimensionName);
  var planePositionOfFirstDimension = 0 - ((this._dimensions.length * sliceDistance) / 2);
  // Calculate z position of the plane
  var planeZ = planePositionOfFirstDimension + dimensionNumber * sliceDistance;
  this._plane.visible = true;
  this._plane.position.setZ(planeZ);

  // Remove the last Geometry added
  // if (typeof this._currentPlaneDimension !== "undefined")
  if (this._currentPlaneDimensionGeometry !== null)
    // this._glScene.remove( this._glSliceGeometry[this._currentPlaneDimension] );
    this._glScene.remove( this._currentPlaneDimensionGeometry );
  // Set the current plane
  this._glScene.add(this._glSliceGeometry[dimensionName]);
  // And update the global variable
  this._currentPlaneDimension = dimensionName;
  this._currentPlaneDimensionGeometry = this._glSliceGeometry[dimensionName];
};

RCUBE.Cube.prototype.main = function (canvasID, data, dimensions){
  var self = this;
  var width = $('#' + canvasID).width();
  var height = $('#' + canvasID).width();
  // var initRotation = Math.PI + 0.5;
  var initRotation = 0;
  var container, stats;
  var camera, scene, renderer, particles, geometryPlane, i, h, color, size;
  var shaderMaterial, materials = [];
  var controls, attributesPlane;
  var colors = [];
  var guiController;
  // GUI
  var renderMode = "ShaderMaterial";
  // /GUI
  var windowHalfX = width / 2;
  var windowHalfY = height / 2;
  var slicingPlane;
  var slicingPlanePosition = 0;
  var matrixData2D;

  var dimensionsSorted = dimensions.slice().sort();

  if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
  var view = this;

  init(data, dimensions);
  animate();

  function init(data, dimensions) {
    // DOM
    container = document.createElement( 'div' );

    document.getElementById(canvasID).appendChild(container);
    // camera
    camera = new THREE.PerspectiveCamera( 75, width / height, 1, 100000 );
    // Scene
    scene = new THREE.Scene();
    self._glScene = scene;

    // Get correct initial Camera Position
    // TODO: Automatically calculate z distance
    rotation = 0.1;
    camera.position.x = Math.sin(rotation) * 500;
    camera.position.z = Math.cos(rotation) * 500 + 2000;
    camera.up = new THREE.Vector3(0,0,1);
    camera.lookAt( scene.position );

    var cubeParticles = self.update(data, dimensions, 'rSquared', 0, 1);


    // [Geometry] Add Slicing Plane
    // var planeSizeX = (dimensions.length * self._sliceDistanceX) + 100;
    // var planeSizeY = (dimensions.length * self._sliceDistanceY) + 100;
    planeSizeX = (dimensions.length * self._sliceDistanceX);
    planeSizeY = (dimensions.length * self._sliceDistanceY);
    slicingPlane = new THREE.PlaneGeometry(planeSizeX, planeSizeY);
    var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xB0B0B0, opacity: 0.8, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( slicingPlane, slicingPlaneMaterial );
    self._plane = plane;
    // Plane gets visible as soon as a plane is selected
    plane.visible = false;
    // plane.rotateY(initRotation);
    scene.add( plane );

    // Side Planes
    var sidePlaneBackMaterial = new THREE.MeshBasicMaterial( {color: 0x000000, opacity: 0.03, side: THREE.DoubleSide} );
    var planeBackGeo = new THREE.PlaneGeometry(dimensions.length * self._sliceDistanceX, dimensions.length * self._sliceDistanceY);
    var planeBack = new THREE.Mesh( planeBackGeo, sidePlaneBackMaterial );
    planeBack.position.setZ(-1 * ((dimensions.length * self._sliceDistanceZ) / 2));
    scene.add( planeBack );

    var sidePlaneSideMaterial = new THREE.MeshBasicMaterial( {color: 0x000000, opacity: 0.03, side: THREE.DoubleSide} );
    var planeSideGeo = new THREE.PlaneGeometry(dimensions.length * self._sliceDistanceX, dimensions.length * self._sliceDistanceZ);
    var planeSide = new THREE.Mesh( planeSideGeo, sidePlaneSideMaterial );
    planeSide.rotateX(90 * (Math.PI / 180));
    planeSide.position.setY((dimensions.length * self._sliceDistanceY) / 2);
    scene.add( planeSide );

    var sidePlaneBottomMaterial = new THREE.MeshBasicMaterial( {color: 0x000000, opacity: 0.06, side: THREE.DoubleSide} );
    var planeBottomGeo = new THREE.PlaneGeometry(dimensions.length * self._sliceDistanceZ, dimensions.length * self._sliceDistanceX);
    var planeBottom = new THREE.Mesh( planeBottomGeo, sidePlaneBottomMaterial );
    planeBottom.rotateY(90 * (Math.PI / 180));
    planeBottom.position.setX(-1*(dimensions.length * self._sliceDistanceX) / 2);
    scene.add( planeBottom );
    debug_plane = planeBottom;



    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha:true });
    renderer.setSize(width, height);
    // renderer.setClearColor(0xFFFFFF, 1);
    renderer.setClearColor(0x000000, 0);
    container.appendChild( renderer.domElement );

    // Controls
    // TODO: Restrict z Axis: https://github.com/mrdoob/three.js/issues/1230
    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.rotateSpeed = 0.5;
    // controls.zoomSpeed = 1.2;
    // controls.panSpeed = 0.8;
    // controls.noZoom = false;
    // controls.noPan = true;
    // controls.staticMoving = true;
    // controls.dynamicDampingFactor = 0.3;
    // controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', render );

    // Stats
    if (self._showFPS) {
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      container.appendChild( stats.domElement );
    }

    window.addEventListener( 'resize', onWindowResize, false );

    rotation = 0;
    // Initialize GUI
    // addDatGui();
  }

  function onWindowResize() {

    windowHalfX = width / 2;
    windowHalfY = height / 2;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );

  }

  function animate() {
    // console.log(rotation);
    // rotation += 0.05;
    // camera.position.x = 0;
    // camera.position.y = Math.sin(rotation) * 500;
    // camera.position.z = Math.cos(rotation) * 500;
    // camera.lookAt( scene.position ); // the origin
    controls.update();
    requestAnimationFrame( animate );

    render();
    if (self._showFPS)
      stats.update();
  }

  function render() {
    renderer.render( scene, camera );
  }
};
})();
