RCUBE.Cube = function(canvasID, data, dimensions) {
  // Since the Heatmap visualization is also sorted by name, we do the same thing here!
  this._canvasID = canvasID;
  // Displays the FPS Stats view if true
  this._showFPS = false;
  this._dimensions = dimensions;
  this._plane = undefined;
  this._currentPlaneDimension = undefined;
  this._sliceDistance = 10;
  this._glScene = undefined;
  this._glSliceGeometry = undefined;
  this._dimensionsAlreadyAdded = {};
  this.main(canvasID, data, dimensions);
  debug_dimensions = dimensions;
};

RCUBE.Cube.prototype.update = function(data) {
  var self = this;
  // identify the dimensions, which need updates
  var dimensions = Object.keys(data);
  var dimensionsToProcess = [];
  console.log("Update Dimensions");
  console.log(dimensions);
  dimensions.forEach(function(currentDimension){
    if (self._dimensionsAlreadyAdded[currentDimension] !== true) {
      dimensionsToProcess.push(currentDimension);
    }
  });
  console.log("Dimensions to Add");
  console.log(dimensionsToProcess);


};

RCUBE.Cube.prototype.movePlaneUp = function() {
  // If the current plane is not defined, set it to the first dimension
  if (typeof this._currentPlaneDimension === 'undefined')
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
  var sliceDistance = this._sliceDistance;
  var dimensionNumber = this._dimensions.indexOf(dimensionName);
  var planePositionOfFirstDimension = 0 - ((this._dimensions.length * sliceDistance) / 2);
  // Calculate z position of the plane
  var planeZ = planePositionOfFirstDimension + dimensionNumber * sliceDistance;
  this._plane.visible = true;
  this._plane.position.setZ(planeZ);

  // Remove the last Geometry added
  if (typeof this._currentPlaneDimension !== "undefined")
    this._glScene.remove( this._glSliceGeometry[this._currentPlaneDimension] );
  // Set the current plane
  this._glScene.add(this._glSliceGeometry[dimensionName]);
  // And update the global variable
  this._currentPlaneDimension = dimensionName;
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
  var DEBUG = false;
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

  function addDatGui(){
    var gui = new dat.GUI();
    slicingPlanePosition   = gui.add(this, "slicingPlanePosition", -200, 200);
    slicingPlanePosition.onChange(function(value) {
      slicingPlane.vertices[0].z = value;
      slicingPlane.vertices[1].z = value;
      slicingPlane.vertices[2].z = value;
      slicingPlane.vertices[3].z = value;
      slicingPlane.verticesNeedUpdate = true;
    });
    renderModeGUI = gui.add(this, "renderMode", ['ShaderMaterial', 'PointCloudMaterial']);
    renderModeGUI.onChange( function(value) {
      scene.remove( particles );
      if (value == 'ShaderMaterial')
        particles = new THREE.PointCloud( geometryPlane, shaderMaterial );
      else
        particles = new THREE.PointCloud( geometryPlane, materials );
      scene.add(particles);
    });
  }

  init(data, dimensions);
  animate();

  function init(data, dimensions) {
    // DOM
    container = document.createElement( 'div' );

    document.getElementById(canvasID).appendChild(container);
    // camera
    camera = new THREE.PerspectiveCamera( 75, width / height, 1, 6000 );
    debug_camera = camera;

    // Scene
    scene = new THREE.Scene();
    self._glScene = scene;
    debug_scene = scene;

    // Get correct initial Camera Position
    // TODO: Automatically calculate z distance
    rotation = 0.1;
    camera.position.x = Math.sin(rotation) * 500;
    camera.position.z = Math.cos(rotation) * 500 + 2000;
    camera.up = new THREE.Vector3(0,0,1);
    camera.lookAt( scene.position );

    // attributesPlane
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
    geometryPlane = new THREE.Geometry();

    var transferfunction = d3.scale.linear()
      .domain([0, 1])
      .range(['#fff7fb', '#023858']);

    var sliceGeometry = {};
    self._glSliceGeometry = sliceGeometry;

    debug_data = data;

    var colorPlane = new THREE.Color("#1f77b4");
    var colorPlaneSelection = new THREE.Color("#ff7f0e");

    // Iterate over all dimensions and check for values
    // dimensions.forEach(function(dimension_z, z) {
    dimensions.forEach(function(dimension_z, z) {
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
            vertexPlane.z = z * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            vertexPlaneSelection.z = z * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            if (x < y) {
              vertexPlane.x = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexPlane.y = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexPlaneSelection.x = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexPlaneSelection.y = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            }
            else {
              vertexPlane.x = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexPlane.y = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexPlaneSelection.x = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexPlaneSelection.y = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            }
            geometryPlane.vertices.push( vertexPlane );
            geometryPlaneSelection.vertices.push( vertexPlaneSelection );

            // var colorPlane = new THREE.Color(transferfunction(data[dimension_z][dimension_y][dimension_x]));
            // Two times because we also add the mirror element
            geometryPlane.colors.push(colorPlane);
            geometryPlaneSelection.colors.push(colorPlaneSelection);
            attributesPlane.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
            attributesPlaneSelection.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
          }
        });
      });
      var sliceParticles = new THREE.PointCloud( geometryPlaneSelection, sliceShaderMaterial );
      sliceGeometry[dimension_z] = sliceParticles;
    });

    size  = 6;

    materials = new THREE.PointCloudMaterial( {
      size: size,
      vertexColors: THREE.VertexColors
    });

    particles = new THREE.PointCloud( geometryPlane, shaderMaterial );
    debug_particles = particles;
    scene.add( particles );

    // [Geometry] Add Slicing Plane
    planeSize = (dimensions.length * self._sliceDistance) + 100;
    slicingPlane = new THREE.PlaneGeometry(planeSize, planeSize);
    var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xB0B0B0, opacity: 0.8, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( slicingPlane, slicingPlaneMaterial );
    self._plane = plane;
    // Plane gets visible as soon as a plane is selected
    plane.visible = false;
    debug_plane = plane;
    // plane.rotateY(initRotation);
    scene.add( plane );

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
