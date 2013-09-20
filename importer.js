var parsedMesh = null;
var loaded = false;

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

function log(msg) {
	var textarea = document.getElementById("LOG");
	textarea.innerHTML += (msg + "\n");
	textarea.scrollTop = textarea.scrollHeight;
}

function viewer()  { ; }

viewer.prototype = {

	changeMesh : function(gl, mesh)
	{
		var vertexCount = mesh.positions.length / 3;
		var facesCount = vertexCount / 3;
		var boxPositions = new Float32Array(vertexCount * 3);
		var boxColors = new Float32Array(vertexCount * 3);
		var boxNormals = new Float32Array(vertexCount * 3);
		var boxTrianglesIndices = new Uint16Array(facesCount * 3);

		for(var i = 0; i < vertexCount * 3; i++)
		{
			boxColors[i] = 0.5;
			boxPositions[i] = mesh.positions[i];
		}

		for(var i = 0; i < facesCount; i++) {
			for (var j = 0; j < 3; j++) {
				boxTrianglesIndices[3*i+j] = 3*i+j;
				for (var k = 0; k < 3; k++)
					boxNormals[3*(3*i+j)+k] = mesh.normals[3*i+k];
			}
		}

		var box = new SglMeshGL(gl);
		box.addVertexAttribute("position", 3, boxPositions);
		box.addVertexAttribute("color", 3, boxColors);
		box.addIndexedPrimitives("triangles", gl.TRIANGLES, boxTrianglesIndices);
		box.addVertexAttribute("normal", 3, mesh.normals);
		this.boxMesh = box;

	},

	load : function(gl)
	{
		this.bkgColor = [ 0.2, 0.2, 0.6, 1.0 ];
		this.centerMatrix = sglIdentityM4();
		this.boxMatrix    = sglIdentityM4();
	
		this.gl = gl;
		log("SpiderGL Version : " + SGL_VERSION_STRING + "\n");

		/*************************************************************/
	
		this.angle     = 0.0;
		this.primitives = "triangles";

		this.xform      = new SglTransformStack();
		this.viewMatrix = sglLookAtM4C(0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
		this.trackball  = new SglTrackball();
		this.setupTransform();
		/*************************************************************/

		var lightVsrc = sglNodeText("LIGHT_PASS_VERTEX_SHADER");
		var lightFsrc = sglNodeText("LIGHT_PASS_FRAGMENT_SHADER");

		/*************************************************************/
		var simpleVsrc = sglNodeText("SIMPLE_VERTEX_SHADER");
		var simpleFsrc = sglNodeText("SIMPLE_FRAGMENT_SHADER");
		var simpleProg = new SglProgram(gl, [simpleVsrc,lightVsrc], [simpleFsrc,lightFsrc]);
		this.worldLightDir = sglNormalizedV3([ -1.0, -1.0, -1.0 ]);		
		log(simpleProg.log);
		this.simpleProg = simpleProg;
		/*************************************************************/

		var boxPositions = new Float32Array
		([
			-0.5, -0.5,  0.5,
			 0.5, -0.5,  0.5,
			-0.5,  0.5,  0.5,
			 0.5,  0.5,  0.5,
			-0.5, -0.5, -0.5,
			 0.5, -0.5, -0.5,
			-0.5,  0.5, -0.5,
			 0.5,  0.5, -0.5
		]);

		var boxColors = new Float32Array
		([
			0.0, 0.0, 1.0,
			1.0, 0.0, 1.0,
			0.0, 1.0, 1.0,
			1.0, 1.0, 1.0,
			0.0, 0.0, 0.0,
			1.0, 0.0, 0.0,
			0.0, 1.0, 0.0,
			1.0, 1.0, 0.0
		]);

		var boxTrianglesIndices = new Uint16Array
		([
			0, 1, 2,  2, 1, 3,  // front
			5, 4, 7,  7, 4, 6,  // back
			4, 0, 6,  6, 0, 2,  // left
			1, 5, 3,  3, 5, 7,  // right
			2, 3, 6,  6, 3, 7,  // top
			4, 5, 0,  0, 5, 1   // bottom
		]);

		var box = new SglMeshGL(gl);
		box.addVertexAttribute("position", 3, boxPositions);
		box.addVertexAttribute("color", 3, boxColors);
		box.addIndexedPrimitives("triangles", gl.TRIANGLES, boxTrianglesIndices);

		this.boxMesh = box;


		/*************************************************************/
	},

	setupTransform : function () {
		this.xform      = new SglTransformStack();
		this.viewMatrix = sglLookAtM4C(0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
		this.trackball  = new SglTrackball();
	},

	setupMesh : function (m, url) {
		if (this.mesh) {
			this.meshURL = "";
			this.mesh.destroy();
			this.mesh = null;
			this.bbox = new SglBox3();
			this.meshInfo.vertexAttributes = [ ];
			this.meshInfo.verticesCount    = 0;
			this.meshInfo.trianglesCount   = 0;
		}
		if (!m) return;

		this.meshURL = url;

		for (var v in m.vertices.attributes) {
			this.meshInfo.vertexAttributes.push(v);
		}
		this.meshInfo.verticesCount  = m.vertices.length;
		this.meshInfo.trianglesCount = m.connectivity.primitives["triangles"].length / 3;
		this.mesh = m.toPackedMeshGL(this.ui.gl, "triangles", 65000);
		this.bbox = m.calculateBoundingBox("position");
		var bc = this.bbox.center;
		var bs = this.bbox.size;
		var s  = 1.0 / this.bbox.diagonal;
		this.centerMatrix = sglMulM4(sglScalingM4C(s, s, s), sglTranslationM4C(-bc[0], -bc[1], -bc[2]));
		//this.boxMatrix    = sglMulM4(sglTranslationM4C(bc[0], bc[1], bc[2]), sglScalingM4C(1.0/bs[0], 1.0/bs[1], 1.0/bs[2]));
		//this.boxMatrix    = sglScalingM4C(s*bs[0], s*bs[1], s*bs[2]);
		//this.boxMatrix    = sglIdentityM4();
		this.boxMatrix    = sglScalingM4C(s*bs[0], s*bs[1], s*bs[2]);
		this.trackball.reset();

		this.signalOnLoad();
		this.refresh();
	},

	update : function(gl, dt)
	{
		this.angle += 90.0 * dt;
	},

	mouseDown : function(gl, button, x, y) {
		;
	},

	mouseUp : function(gl, button, x, y) {
		;
	},

	mouseMove : function(gl, x, y) {
		var ui = this.ui;
		var ax1 = (x / (ui.width  - 1)) * 2.0 - 1.0;
		var ay1 = (y / (ui.height - 1)) * 2.0 - 1.0;
		var action = SGL_TRACKBALL_NO_ACTION;
		if ((ui.mouseButtonsDown[0] && ui.keysDown[17]) || ui.mouseButtonsDown[1]) {
			action = SGL_TRACKBALL_PAN;
		}
		else if (ui.mouseButtonsDown[0]) {
			action = SGL_TRACKBALL_ROTATE;
		}
		this.trackball.action = action;
		this.trackball.track(this.viewMatrix, ax1, ay1, 0.0);
		this.trackball.action = SGL_TRACKBALL_NO_ACTION;
	},

	mouseWheel: function(gl, wheelDelta, x, y) {
		var action = (this.ui.keysDown[16]) ? (SGL_TRACKBALL_DOLLY) : (SGL_TRACKBALL_SCALE);
		var factor = (action == SGL_TRACKBALL_DOLLY) ? (wheelDelta * 0.3) : ((wheelDelta < 0.0) ? (1.10) : (0.90));
		this.trackball.action = action;
		this.trackball.track(this.viewMatrix, 0.0, 0.0, factor);
		this.trackball.action = SGL_TRACKBALL_NO_ACTION;
	},

	click : function(gl, button, x, y) {
		;
	},

	dblClick : function(gl, button, x, y) {
		;
	},

	resize : function(gl, width, height) {
		;
	},

	draw2 : function(gl) {
		var w = this.ui.width;
		var h = this.ui.height;

		gl.clearColor(this.bkgColor[0], this.bkgColor[1], this.bkgColor[2], this.bkgColor[3]);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

		gl.viewport(0, 0, w, h);

		this.xform.projection.loadIdentity();
		this.xform.projection.perspective(sglDegToRad(45.0), w/h, 0.1, 10.0);

		this.xform.view.load(this.viewMatrix);

		this.xform.model.load(this.trackball.matrix);

			gl.enable(gl.DEPTH_TEST);
			gl.enable(gl.CULL_FACE);

			this.xform.model.push();
				this.xform.model.multiply(this.centerMatrix);

				var attributes = { };
				/*
				for (var a in this.attributes) {
					var src = this.attributes[a];
					attributes[a] = src.value;
				}
				*/

				var uniforms = { };
				for (var u in this.uniforms) {
					var src   = this.uniforms[u];
					var value = null;
					if (this.semantics[src.name] != undefined) {
						value = this.semantics[src.name].func();
					}
					else {
						value = src.value;
					}
					uniforms[u] = value;
				}

				var samplers = { };
				for (var s in this.samplers) {
					var src     = this.samplers[s];
					if (src.tex) {
						if (src.tex.isValid) {
							samplers[s] = src.tex;
						}
					}
				}

				var boxUniforms = { u_mvp : this.xform.modelViewProjectionMatrix };
				sglRenderMeshGLPrimitives(this.boxMesh, this.primitives, this.simpleProg, null, boxUniforms);

				//sglRenderMeshGLPrimitives(this.boxMesh, "triangles", this.simpleProg, attributes, uniforms, samplers);
			this.xform.model.pop();
		
	},

	draw : function(gl)
	{
		var w = this.ui.width;
		var h = this.ui.height;

		gl.clearColor(0.2, 0.2, 0.6, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

		gl.viewport(0, 0, w, h);

		this.xform.projection.loadIdentity();
		this.xform.projection.perspective(sglDegToRad(60.0), w/h, 0.1, 100.0);

		this.xform.view.loadIdentity();
		this.xform.view.lookAt(0.0, 2.0, 3.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

		this.xform.model.loadIdentity();
		this.xform.model.rotate(sglDegToRad(this.angle), 0.0, 1.0, 0.0);
		this.xform.model.scale(1.5, 1.5, 1.5);

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);

		var boxUniforms = { u_mvp : this.xform.modelViewProjectionMatrix };
		sglRenderMeshGLPrimitives(this.boxMesh, this.primitives, this.simpleProg, null, boxUniforms);

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);

	}


};

var theViewer = new viewer();
sglRegisterCanvas("importer_canvas", theViewer, 60.0);




function handleFileSelect(evt){
	log("handling files");
	var files = evt.target.files;
	var output = [];

	for(var i=0, f; f=files[i]; i++)
	{
		var reader = new FileReader();
		reader.onload = function(evt) { 
			var result = evt.target.result;
			log("File Content: " + result);

			var header =  String.fromCharCode.apply(null, new Uint8Array(result.slice(0,80)));
			var parsingSuccess = false;
			var checkHeader = header.startsWith("solid");			
			var byteData = new Uint8Array(result);			
			var obj = null;

			log("header: " +header);

			if(checkHeader){
				var data = "";
				var start = 0;
				var end = Math.min(10, result.byteLength-1);
				while(start < end){
					data += String.fromCharCode.apply(null, new Uint8Array(result.slice(start, end)));
					start += 10
					end = Math.min(end+10, result.byteLength-1);
				}
				obj = parseSTL_ASCII(data);
				parsingSuccess = obj.parsingSuccess;
			}

			if(!parsingSuccess || !checkHeader){
				obj = parseSTL_Binary(byteData);
				parsingSuccess = obj.parsingSuccess;
			}
			
			if(!parsingSuccess) {
				log("failed to parse");
			}else{
				log("file parsed");
				theViewer.changeMesh(theViewer.gl, obj);	
			}
		};

		reader.onerror = function(evt) {
    			log("File could not be read! Code " + evt.target.error.code);
		};
		
		reader.readAsArrayBuffer(f);
	}
}

function parseSTL_ASCII(data){
	var lines = data.split('\n');
	for(var j=0; j<lines.length; j++){ 
		lines[j] = lines[j].trim(); 
		lines[j] = lines[j].replace(/ +(?= )/g,'');
	}

	var obj = {};

	obj.parsingSuccess = false;
	var positions = [];
	var normals = [];
	
	var i=1;
	while(i < lines.length)
	{
		if(lines[i].startsWith("facet normal")){
			var helper = lines[i].split(" ");
			normals.push(parseFloat(helper[2]));
			normals.push(parseFloat(helper[3]));
			normals.push(parseFloat(helper[4]));
			i++;
			if(lines[i] == "outer loop")
			{
								
				var j = 3;
				var vertexok = true;
				while(j > 0)
				{
					i++;
					helper = lines[i].split(" ");
					if(helper[0] != "vertex"){
						vertexok = false;
						break;
					}
					positions.push(parseFloat(helper[1]));
					positions.push(parseFloat(helper[2]));
					positions.push(parseFloat(helper[3]));
					j--;
				}

				if(!vertexok){
					log("parse error, bad vertex on line: " + i);
					break;
				}

				i++;
				if(!lines[i].startsWith("endloop")){
					log("parse error, bad loop on line: " + i);
					break;
				}
				i++;
				if(!lines[i].startsWith("endfacet")){
					log("parse error, bad facet on line: " + i);
					break;
				} 
				i++
			}else{
				log("parse error, bad facet on line" + i);
				break;
			}
		}else{
			if(lines[i].startsWith("endsolid")){
				obj.parsingSuccess = true;
				break;
			}

			log("parse error, bad facet on line " + i);
			break;
		}
	}
	log("Parsing Ended");

	obj.normals = normals;
	obj.positions = positions;
	
	return obj;	

}

function parseSTL_Binary(data) { 
	var obj = {};
	obj.parsingSucces = false;
	return obj;
}
	
function fileHandler()
{
	document.getElementById('files').addEventListener('change', handleFileSelect, false)	
}
