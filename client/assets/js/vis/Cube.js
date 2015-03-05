RCUBE.Cube = function(canvasID, data, dimensions) {
  // dimensions = dimensions.sort();
  this._canvasID = canvasID;
  // Displays the FPS Stats view if true
  this._showFPS = false;
  this._dimensions = dimensions;
  this._plane = undefined;
  this._sliceDistance = 10;
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
  var controls, attributes;
  var colors = [];
  var guiController;
  var DEBUG = false;
  // var transferfunction = new Transferfunction2D('blue', 'red');
  // GUI
  var renderMode = "ShaderMaterial";
  // /GUI
  var windowHalfX = width / 2;
  var windowHalfY = height / 2;
  var slicingPlane;
  var slicingPlanePosition = 0;
  var matrixData2D;

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
    camera.position.z = 900;
    debug_camera = camera;

    // Scene
    scene = new THREE.Scene();

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

    debug_data = data;
    // Iterate over all dimensions and check for values
    dimensions.forEach(function(dimension_z, z) {
    // ['Mammography_Left_BI_RADS'].forEach(function(dimension_z, z) {
      dimensions.forEach(function(dimension_y, y) {
        dimensions.forEach(function(dimension_x, x) {
          if (typeof data[dimension_z] != 'undefined' &&
            typeof data[dimension_z][dimension_y] != 'undefined' &&
            typeof data[dimension_z][dimension_y][dimension_x] != 'undefined') {

            // console.log("Add " + dimension_z + "," + dimension_y + "," + dimension_x + ": " + data[dimension_z][dimension_y][dimension_x]);

            var vertex = new THREE.Vector3();
            vertex.x = x * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            vertex.y = y * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            vertex.z = z * self._sliceDistance - ((dimensions.length * self._sliceDistance) / 2);
            geometry.vertices.push( vertex );

            // Since the we only store information above the matrix diagonal,
            // we have to mirror the vertex in order to create a cube
            // var vertexMirror = new THREE.Vector3();
            // vertexMirror.x = y*3 - ((dimensions.length * 3) / 2);
            // vertexMirror.y = x*3 - ((dimensions.length * 3) / 2);
            // vertexMirror.z = z*3 - ((dimensions.length * 3) / 2);
            // geometry.vertices.push( vertexMirror );

            var color = new THREE.Color(transferfunction(data[dimension_z][dimension_y][dimension_x]));
            // Two times because we also add the mirror element
            geometry.colors.push(color);
            // geometry.colors.push(color);
            // attributes.alpha.value.push(1);
            // attributes.alpha.value.push(1);
            attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
            // attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
          }
        });
      });
    });

    color = [1,1,1];
    size  = 6;

    materials = new THREE.PointCloudMaterial( {
      size: size,
      vertexColors: THREE.VertexColors
    });

    // particles = new THREE.PointCloud( geometry, shaderMaterial );
    particles = new THREE.PointCloud( geometry, materials );
    particles.rotateY(initRotation);
    debug_particles = particles;
    // particles = new THREE.Mesh( geometry, shaderMaterial );
    scene.add( particles );

    // [Geometry] Add Slicing Plane
    planeSize = (dimensions.length * self._sliceDistance) + 100;
    slicingPlane = new THREE.PlaneGeometry(planeSize, planeSize);
    var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xB0B0B0, opacity: 0.5, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( slicingPlane, slicingPlaneMaterial );
    self._plane = plane;
    debug_plane = plane;
    plane.rotateY(initRotation);
    // scene.add( plane );

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

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );
    window.addEventListener( 'resize', onWindowResize, false );

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

  function onDocumentMouseMove( event ) {
    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

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
