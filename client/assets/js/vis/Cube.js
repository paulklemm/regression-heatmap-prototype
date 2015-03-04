RCUBE.Cube = function(canvasID, data, dimensions) {
  this._canvasID = canvasID;
  this.main(canvasID, data, dimensions);
};

RCUBE.Cube.prototype.main = function (canvasID, data, dimensions){
  var width = $('#' + canvasID).width();
  var height = $('#' + canvasID).width();
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
    camera = new THREE.PerspectiveCamera( 75, width / height, 1, 3000 );
    camera.position.z = 600;

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

    // Iterate over all dimensions and check for values
    dimensions.forEach(function(dimension_z, z) {
      dimensions.forEach(function(dimension_y, y) {
        dimensions.forEach(function(dimension_x, x) {
          if (typeof data[dimension_z] != 'undefined' &&
            typeof data[dimension_z][dimension_y] != 'undefined' &&
            typeof data[dimension_z][dimension_y][dimension_x] != 'undefined') {

            var vertex = new THREE.Vector3();
            vertex.x = x*3 - ((dimensions.length * 3) / 2);
            vertex.y = y*3 - ((dimensions.length * 3) / 2);
            vertex.z = z*3 - ((dimensions.length * 3) / 2);
            geometry.vertices.push( vertex );

            // Since the we only store information above the matrix diagonal,
            // we have to mirror the vertex in order to create a cube
            var vertexMirror = new THREE.Vector3();
            vertexMirror.x = y*3 - ((dimensions.length * 3) / 2);
            vertexMirror.y = x*3 - ((dimensions.length * 3) / 2);
            vertexMirror.z = z*3 - ((dimensions.length * 3) / 2);
            geometry.vertices.push( vertexMirror );

            var color = new THREE.Color(transferfunction(data[dimension_z][dimension_y][dimension_x]));
            // Two times because we also add the mirror element
            geometry.colors.push(color);
            geometry.colors.push(color);
            // attributes.alpha.value.push(1);
            // attributes.alpha.value.push(1);
            attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
            attributes.alpha.value.push(data[dimension_z][dimension_y][dimension_x]);
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

    particles = new THREE.PointCloud( geometry, shaderMaterial );
    // particles = new THREE.Mesh( geometry, shaderMaterial );
    scene.add( particles );

    // [Geometry] Add Slicing Plane
    planeSize = (dimensions.length * 3) + 100;
    slicingPlane = new THREE.PlaneGeometry(planeSize, planeSize);
    var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xB0B0B0, opacity: 0.5, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( slicingPlane, slicingPlaneMaterial );
    scene.add( plane );

    // Renderer
    renderer = new THREE.WebGLRenderer();
    // renderer.setSize( width, height );
    renderer.setSize(width, height);
    renderer.setClearColor(0xFFFFFF, 1);
    container.appendChild( renderer.domElement );

    // Controls
    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', render );

    // Stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

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
    stats.update();

  }

  function render() {
    renderer.render( scene, camera );
  }
};
