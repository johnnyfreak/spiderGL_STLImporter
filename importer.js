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

	changeMesh : function(gl)
	{
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

	},

	load : function(gl)
	{
		this.gl = gl;
		log("SpiderGL Version : " + SGL_VERSION_STRING + "\n");

		/*************************************************************/
		this.xform     = new SglTransformStack();
		this.angle     = 0.0;
		this.primitives = "triangles";
		/*************************************************************/


		/*************************************************************/
		var simpleVsrc = sglNodeText("SIMPLE_VERTEX_SHADER");
		var simpleFsrc = sglNodeText("SIMPLE_FRAGMENT_SHADER");
		var simpleProg = new SglProgram(gl, [simpleVsrc], [simpleFsrc]);
		log(simpleProg.log);
		this.simpleProg = simpleProg;
		/*************************************************************/


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

	keyPress : function(gl, keyCode, keyString)
	{
		switch (keyString)
		{
			case "1": this.primitives = "triangles"; break;
			case "2": this.primitives = "edges";     break;
			case "3": this.primitives = "vertices";  break;
			default : break;			
		}
	},

	update : function(gl, dt)
	{
		this.angle += 90.0 * dt;
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
				obj = parseSTL_Binary(result);
				parsingSuccess = obj.parsingSuccess;
			}
			
			if(!parsingSuccess) {
				log("failed to parse");
			}else{
				log("file parsed");
				theViewer.changeMesh(theViewer.gl);	
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
	for(var j=0; j<lines.length; j++){ lines[j] = lines[j].trim(); }

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
	obj.parsingSucces = true;
	var dataview = new DataView(data);
	var triangles = [];
	/*
UINT8[80] – Header
UINT32 – Number of triangles

foreach triangle
REAL32[3] – Normal vector
REAL32[3] – Vertex 1
REAL32[3] – Vertex 2
REAL32[3] – Vertex 3
UINT16 – Attribute byte count
end
	*/

	var headerSize = 80 * 1 ; // 80 x Uint8 
	var header = new Uint8Array(data.slice(0,headerSize));
	// check header?
	var numberOfTriangles = dataview.getUint32(headerSize, true);
	var bodyOffset = headerSize + 4 ; // 1 x Uint32
	var vectorSize = 4*3; // each triangle is defined by 4 vectors, each vector has 3 x Float32
	var triangleSize = 4*vectorSize + 2; // we have 4 vectors and a Uint16.
	function getVector(offset)
	{
		var vect = {};
		vect.x = dataview.getFloat32(offset + 0, true);
		vect.y = dataview.getFloat32(offset + 4, true);
		vect.z = dataview.getFloat32(offset + 8, true);
		return vect;
	}
	for (var i=0; i<numberOfTriangles; i++)
	{
		var triangleOffset = bodyOffset + i*triangleSize;
		var norm = getVector(triangleOffset);
		var vertex1 = getVector(triangleOffset + vectorSize);
		var vertex2 = getVector(triangleOffset + 2*vectorSize);
		var vertex3 = getVector(triangleOffset + 3*vectorSize);
		var attribute = dataview.getUint16(triangleOffset + 4*vectorSize);
		var triangle = {};
		triangle.normal = norm;
		triangle.vertex1 = vertex1;
		triangle.vertex2 = vertex2;
		triangle.vertex3 = vertex3;
		triangle.attrib = attribute;
		triangles.push(triangle);
	}
	return triangles;
}
	
function fileHandler()
{
	document.getElementById('files').addEventListener('change', handleFileSelect, false)	
}
