RCUBE.Cube = function(canvasID, rSquared, names) {
  this._canvasID = canvasID;
  this.main(canvasID, this._data);
};

RCUBE.Cube.prototype.main = function (canvasID, data){
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
	var windowHalfX = window.innerWidth / 2;
	var windowHalfY = window.innerHeight / 2;
	var slicingPlane;
	var slicingPlanePosition = 0;
	var matrixData3D;
	var matrixData2D;
	// Load data at the start!
	// d3.json('data/matrix3D.json', function(_matrixData3D) {
	d3.json('data/cube_back_pain_last_3_month.json', function(_matrixData3D) {
		d3.json('data/matrix2D.json', function(_matrixData2D) {
      matrixData3D = _matrixData3D;
			matrixData2D = _matrixData2D;

		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
		var view = this;

		function addDatGui(){
			var gui = new dat.GUI();
			slicingPlanePosition 	= gui.add(this, "slicingPlanePosition", -200, 200);
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

		init();
		animate();

		function init() {
			// DOM
			container = document.createElement( 'div' );

			document.getElementById(canvasID).appendChild(container);
			// camera
			camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
			camera.position.z = 600;

			// Scene
			scene = new THREE.Scene();
			// scene.fog = new THREE.FogExp2( 0x000000, 0.0007 );

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
			if (DEBUG)
				var num_z = num_y = num_x = 20;
			else
				var num_z = num_y = num_x = matrixData3D.length;

			var transferfunction = d3.scale.linear()
				.domain([0, 1])
				.range(['blue', 'red']);

			for ( var z = 0; z < num_z; z++) {
				for ( var y = 0; y < num_y; y++) {
					for ( var x = 0; x < num_x; x++) {
            var vertex = new THREE.Vector3();
						vertex.x = x*3 - ((num_x * 3) / 2);
						vertex.y = y*3 - ((num_y * 3) / 2);
						vertex.z = z*3 - ((num_z * 3) / 2);
						geometry.vertices.push( vertex );

						var color = new THREE.Color(transferfunction(matrixData2D[x][y]));
						geometry.colors.push(color);
						attributes.alpha.value.push(matrixData3D[x][y][z]);
					}
				}
			}

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
			planeSize = (num_x * 3) + 100;
			slicingPlane = new THREE.PlaneGeometry(planeSize, planeSize);
			// var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
			var slicingPlaneMaterial = new THREE.MeshBasicMaterial( {color: 0xB0B0B0, opacity: 0.5, side: THREE.DoubleSide} );
			var plane = new THREE.Mesh( slicingPlane, slicingPlaneMaterial );
			scene.add( plane );

			// Renderer
			renderer = new THREE.WebGLRenderer();
			// renderer.setSize( window.innerWidth, window.innerHeight );
      renderer.setSize(200, 200);
			// renderer.setClearColor(0xF0F0F0, 1)
			renderer.setClearColor(0xFFFFFF, 1)
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

			windowHalfX = window.innerWidth / 2;
			windowHalfY = window.innerHeight / 2;

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			renderer.setSize( window.innerWidth, window.innerHeight );

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
	}); // Closing D3.fromJSON call
}); // Closing D3.fromJSON call
};
