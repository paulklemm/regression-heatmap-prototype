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
  this.main(canvasID, data, dimensions);
  debug_dimensions = dimensions;
};

RCUBE.Cube.prototype.setPlaneToDimension = function(dimensionName) {
  // Get the necessary variables
  var sliceDistance = this._sliceDistance;
  var dimensionNumber = this._dimensions.indexOf(dimensionName);
  var planePositionOfFirstDimension = 0 - ((this._dimensions.length * sliceDistance) / 2);
  // Calculate z position of the plane
  var planeZ = planePositionOfFirstDimension + dimensionNumber * sliceDistance;
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
  var camera, scene, renderer, particles, geometry, i, h, color, size;
  var shaderMaterial, materials = [];
  var mouseX = 0, mouseY = 0;
  var mouseXDown = 0, mouseYDown = 0;
  var mouseDown = false;
  var controls, attributes;
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
        particles = new THREE.PointCloud( geometry, shaderMaterial );
      else
        particles = new THREE.PointCloud( geometry, materials );
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
    // TODO: Automatically calculate z distance
    camera.position.z = 10;
    debug_camera = camera;

    // Scene
    scene = new THREE.Scene();
    self._glScene = scene;
    debug_scene = scene;

    // Get correct initial Camera Position
    rotation = 0.1;
    camera.position.x = Math.sin(rotation) * 500;
    camera.position.z = Math.cos(rotation) * 500;
    camera.up = new THREE.Vector3(0,0,1);
    camera.lookAt( scene.position );

    // attributes
    attributes = {
      alpha: { type: 'f', value: [] },
    };

    // uniforms
    uniforms = {
      color: { type: "c", value: new THREE.Color( 0xff0000 ) },
    };

    shaderMaterial = new THREE.ShaderMaterial( {

      uniforms:       uniforms,
      vertexColors:   THREE.VertexColors,
      attributes:     attributes,
      vertexShader:   document.getElementById( 'vertexshader' ).textContent,
      fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
      // Depth Test: https://github.com/mrdoob/three.js/issues/1928
      depthTest:false,
      transparent: true

    });

    // Geometry
    geometry = new THREE.Geometry();

    var transferfunction = d3.scale.linear()
      .domain([0, 1])
      .range(['#fff7fb', '#023858']);

    var sliceGeometry = {};
    self._glSliceGeometry = sliceGeometry;

    debug_data = data;

    var color = new THREE.Color("#1f77b4");
    var colorSlice = new THREE.Color("#ff7f0e");

    // Iterate over all dimensions and check for values
    // dimensions.forEach(function(dimension_z, z) {
    dimensions.forEach(function(dimension_z, z) {
    // ["smoking", "age"].forEach(function(dimension_z, z) {
    // ['Mammography_Left_BI_RADS'].forEach(function(dimension_z, z) {
      geometrySlice = new THREE.Geometry();
      attributesSlice = {
        alpha: { type: 'f', value: [] },
      };
      // uniforms
      uniformsSlice = {
        color: { type: "c", value: new THREE.Color( 0xff0000 ) },
      };

      sliceShaderMaterial = new THREE.ShaderMaterial( {

        uniforms:       uniformsSlice,
        vertexColors:   THREE.VertexColors,
        attributes:     attributesSlice,
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

            var vertexCube = new THREE.Vector3();
            var vertexSlice = new THREE.Vector3();
            vertexCube.z = z * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            vertexSlice.z = z * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            if (x < y) {
              vertexCube.x = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexCube.y = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexSlice.x = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexSlice.y = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            }
            else {
              vertexCube.x = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexCube.y = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexSlice.x = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
              vertexSlice.y = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            }
            geometry.vertices.push( vertexCube );
            geometrySlice.vertices.push( vertexSlice );

            // var color = new THREE.Color(transferfunction(data[dimension_z][dimension_y][dimension_x]));
            // Two times because we also add the mirror element
            geometry.colors.push(color);
            geometrySlice.colors.push(colorSlice);
            // geometry.colors.push(color);
            // attributes.alpha.value.push(1);
            attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
            // attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
            // attributes.alpha.value.push(1);
            // attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
            // attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);


            attributesSlice.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
          }
        });
      });
      var sliceParticles = new THREE.PointCloud( geometrySlice, sliceShaderMaterial );
      sliceGeometry[dimension_z] = sliceParticles;
      // scene.add(sliceParticles);
    });

    size  = 6;

    materials = new THREE.PointCloudMaterial( {
      size: size,
      vertexColors: THREE.VertexColors
    });

    particles = new THREE.PointCloud( geometry, shaderMaterial );
    // particles = new THREE.PointCloud( geometry, materials );
    // particles.rotateY(initRotation);
    debug_particles = particles;
    // particles = new THREE.Mesh( geometry, shaderMaterial );
    scene.add( particles );

    // [Geometry] Add Slicing Plane
    planeSize = (dimensions.length * self._sliceDistance) + 100;
    slicingPlane = new THREE.PlaneGeometry(planeSize, planeSize);
    var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xB0B0B0, opacity: 0.8, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( slicingPlane, slicingPlaneMaterial );
    self._plane = plane;
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

    // document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    // document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    // document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    // document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    // document.addEventListener( 'touchmove', onDocumentTouchMove, false );
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

  function onDocumentMouseDown( event ) {
    mouseXDown = event.clientX - windowHalfX;
    mouseYDown = event.clientY - windowHalfY;
    mouseDown = true;
    console.log("Mouse Down event at position " + mouseXDown + ", " + mouseYDown);
  }

  function onDocumentMouseUp( event ) {
    mouseDown = false;
    console.log("Mouse Up event");
  }

  function onDocumentMouseMove( event ) {
    console.log("Mouse Move event");
    if (mouseDown) {
      mouseX = event.clientX - windowHalfX;
      mouseY = event.clientY - windowHalfY;
      // Check if the SHIFT Key is pressed
      if (event.shiftKey === true) {
        if (Math.abs(mouseYDown - mouseY) > 5) {
          console.log("Switch Plane");
        }
      }
    }
  }

  function onDocumentTouchStart( event ) {

    if ( event.touches.length === 1 ) {

      event.preventDefault();

      mouseX = event.touches[ 0 ].pageX - windowHalfX;
      mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

  }

  function onDocumentTouchMove( event ) {

    if ( event.touches.length === 1 ) {

      event.preventDefault();

      mouseX = event.touches[ 0 ].pageX - windowHalfX;
      mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

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
