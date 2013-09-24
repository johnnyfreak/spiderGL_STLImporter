if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

function log(msg) {
	var textarea = document.getElementById("log-area");
	textarea.innerHTML += (msg + "\n");
	textarea.scrollTop = textarea.scrollHeight;
}

SpiderGL.openNamespace();

function CanvasHandler() {
}

CanvasHandler.prototype = {
	onInitialize : function () {
		var gl = this.ui.gl;

		this.technique = new SglTechnique(gl, {
			vertexShader : "\
				precision highp float;                                                \n\
																					  \n\
				uniform   mat4 uWorldViewProjectionMatrix;                            \n\
				uniform   mat3 uViewSpaceNormalMatrix;                                \n\
																					  \n\
				attribute vec3 aPosition;                                             \n\
				attribute vec3 aNormal;                                               \n\
				attribute vec3 aColor;                                                \n\
																					  \n\
				varying   vec3 vNormal;                                               \n\
				varying   vec3 vColor;                                                \n\
																					  \n\
				void main(void)                                                       \n\
				{                                                                     \n\
					vNormal     = uViewSpaceNormalMatrix * aNormal;                   \n\
					vColor      = aColor;                                             \n\
																					  \n\
					gl_Position = uWorldViewProjectionMatrix * vec4(aPosition, 1.0);  \n\
				}                                                                     \n\
			",
			fragmentShader : "\
				precision highp float;                                                \n\
																					  \n\
				uniform   vec3      uViewSpaceLightDirection;                         \n\
																					  \n\
				varying   vec3 vNormal;                                               \n\
				varying   vec3 vColor;                                                \n\
																					  \n\
				void main(void)                                                       \n\
				{                                                                     \n\
					vec3  normal    = normalize(vNormal);                             \n\
					float nDotL     = dot(normal, -uViewSpaceLightDirection);         \n\
					float lambert   = max(0.0, nDotL);                                \n\
																					  \n\
					vec3  baseColor = vec3(1.0);                                      \n\
					vec3  diffuse   = vColor * baseColor * lambert;                   \n\
																					  \n\
					gl_FragColor    = vec4(diffuse, 1.0);                             \n\
				}                                                                     \n\
			",
			vertexStreams : {
				"aNormal" : [ 0.0, 0.0, 1.0, 0.0 ],
				"aColor"  : [ 0.6, 0.6, 0.6, 1.0 ]
			},
			globals : {
				"uWorldViewProjectionMatrix" : { semantic : "WORLD_VIEW_PROJECTION_MATRIX", value : SglMat4.identity() },
				"uViewSpaceNormalMatrix"     : { semantic : "VIEW_SPACE_NORMAL_MATRIX",     value : SglMat3.identity() },
				"uViewSpaceLightDirection"   : { semantic : "VIEW_SPACE_LIGHT_DIRECTION",   value : [ 0.1, 0.1, -1.0 ] }
			}
		});
		log(this.technique.program.log);

		this.model = null;
		var that = this;
		//sglRequestBinary("models/tire_v.stl", {
		// sglRequestBinary("models/ship.stl", {
		// sglRequestBinary("models/knot.stl", {
		// sglRequestBinary("models/porsche.stl", {
		// sglRequestBinary("models/sampleBinary.stl", {
		// sglRequestBinary("models/tete_complete.stl", {
		 sglRequestBinary("models/tete_complete2.stl", {
		// sglRequestBinary("models/Sample.STL", {
		// sglRequestBinary("models/sample1.stl", {
		// sglRequestBinary("models/leonardo.stl", {
		// sglRequestBinary("models/cubo.stl", {
			onSuccess : function (req) {
				var data = req.buffer;
				var modelDescriptor = parseSTL(data);
				that.model = new SglModel(that.ui.gl, modelDescriptor);
				that.ui.postDrawEvent();
			}
		});

		this.renderer = new SglModelRenderer(gl);
		this.xform    = new SglTransformationStack();
		this.angle    = 0.0;

		this.ui.animateRate = 60;

		var that = this;
		setInterval(function() {
			document.getElementById("fps-div").innerHTML = "FPS: " + that.ui.framesPerSecond;
		}, 1000);
	},

	onAnimate : function (dt) {
		this.angle += 30.0 * dt;
		this.ui.postDrawEvent();
	},

	onDraw : function () {
		var gl       = this.ui.gl;
		var width    = this.ui.width;
		var height   = this.ui.height;
		var xform    = this.xform;
		var renderer = this.renderer;

		gl.clearColor(0.4, 0.4, 0.4, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

		if (!this.model) return;

		gl.viewport(0, 0, width, height);

		xform.projection.loadIdentity();
		xform.projection.perspective(sglDegToRad(60.0), width/height, 0.1, 50.0);

		xform.view.loadIdentity();
		xform.view.lookAt([0.0, 0.0, 20.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);

		xform.model.loadIdentity();
		xform.model.rotate(sglDegToRad(this.angle), [0.0, 1.0, 0.0]);

		var globals = {
			"WORLD_VIEW_PROJECTION_MATRIX" : xform.modelViewProjectionMatrix,
			"VIEW_SPACE_NORMAL_MATRIX"     : xform.viewSpaceNormalMatrix
		};

		gl.enable(gl.DEPTH_TEST);

		renderer.begin();
			renderer.setTechnique(this.technique);
			renderer.setDefaultGlobals();
			renderer.setPrimitiveMode("FILL");
			renderer.setGlobals(globals);
			renderer.setModel(this.model);
			renderer.renderModel();
		renderer.end();

		gl.disable(gl.DEPTH_TEST);
	}
};

function getEmptyDescriptor() { 
	return { version: "0.0.1.0 EXP",
                     meta: {
                     },
                     data: {
                         vertexBuffers: {
                         },
                         indexBuffers: {
                         }
                     },
                     access: {
                         vertexStreams: {
                         },
                         primitiveStreams: {
                         }
                     },
                     semantic: {
                         bindings: {
                         },
                         chunks: {
                         }
                     },
                     logic: {
                         parts: {
                         }
                     },
                     control: {
                     },
                     extra: {
                     }
                 };
}

function parseSTL(d){
	var header =  String.fromCharCode.apply(null, new Uint8Array(d.slice(0,80)));
	var checkHeader = header.startsWith("solid");			
	var byteData = new Uint8Array(d);
	var obj = null;
	var parsingSuccess = false;
	
	//check data header parse according to file type
	if(checkHeader){
		var data = "";
		var start = 0;
		var end = Math.min(10, d.byteLength-1);
		while(start < end){
			data += String.fromCharCode.apply(null, new Uint8Array(d.slice(start, end)));
			start += 10
			end = Math.min(end+10, d.byteLength-1);
		}
		obj = parseSTL_ASCII(data);
		parsingSuccess = obj.parsingSuccess;
	}

	if(!parsingSuccess || !checkHeader){
		obj = parseSTL_Binary(d);
		parsingSuccess = obj.parsingSuccess;
	}
		

	var descriptor = getEmptyDescriptor();	
	if(parsingSuccess) {
		log("file parsed");
		//create model descriptor
		obj = normalizeData(obj, 4.0);
		descriptor = getDescriptor(obj);

	}else{
		log("failed to parse");
		
	}
	
	return descriptor;		
}

function normalizeData(info, scale){
	var positions = info.positions;
	var normals = info.normals;

	var vertexCount = positions.length / 3;
	var facesCount = vertexCount / 3;

	var avgx = 0.0;
	var avgy = 0.0;
	var avgz = 0.0;
	var maxx = 0.0;
	var maxy = 0.0;
	var maxz = 0.0;

	for(var i=0; i<positions.length;i+=3){
		avgx += positions[i];
		maxx = Math.max(maxx, positions[i]);
		avgy += positions[i+1];
		maxy = Math.max(maxy, positions[i]);
		avgz += positions[i+2];
		maxz = Math.max(maxz, positions[i]);

	}

	avgx /= positions.length;	
	avgy /= positions.length;	
	avgz /= positions.length;	

	var norm = scale/Math.sqrt(maxx* maxx + maxy *maxy, maxz *maxz);

	for(var i=0; i<positions.length; i+=3){
		positions[i]   = (positions[i] - avgx)*norm;
		positions[i+1]   = (positions[i+1] - avgy)*norm;
		positions[i+2]   = (positions[i+2] - avgz)*norm;
	}
	
	return info;

}

function getDescriptor(info){
	var positions = info.positions;
	var normals = info.normals;
	var vertexCount = positions.length / 3;
	var facesCount = vertexCount / 3;

	//creating model descriptor
	var chunkSize = 9000;
	var iterations = parseInt(vertexCount / chunkSize)+1;
	var v = vertexCount;
	var offset = 0;
	var noff = 0;
	var modelDescriptor = getEmptyDescriptor();
	for(var t=0; t<iterations; t++)
	{
		var localVertices = Math.min(v, chunkSize);
		modelDescriptor.data.vertexBuffers["vb" + t] = { typedArray: new Float32Array(3 * localVertices) };
		var arrayBuffer = modelDescriptor.data.vertexBuffers["vb" + t].typedArray;
		for(var i = 0; i < localVertices * 3; i++)
		{
			arrayBuffer[i] = parseFloat(positions[offset + i]);
		}
		offset += localVertices * 3;
		var localFaceCount = localVertices / 3;

		modelDescriptor.data.indexBuffers["ib"+t] = { typedArray: new Uint16Array(3 * localFaceCount) };
		var indexBuffer = modelDescriptor.data.indexBuffers["ib"+t].typedArray;
		for(var i = 0; i < 3* localFaceCount; i++) {
			indexBuffer[i] = i;
		}

		modelDescriptor.access.vertexStreams["vertices"+t] = { //see glVertexAttribPointer
	        buffer: "vb"+t,
	        size: 3,
	        type: SpiderGL.Type.FLOAT32,
	        stride: 12,
	        offset: 0,
	        normalized: true 
		};
	
		modelDescriptor.access.primitiveStreams["ps"+t] = { //see glDrawElements
	        buffer: "ib"+t,
	        mode: SpiderGL.Type.TRIANGLES,
	        count: localVertices,
	        type: SpiderGL.Type.UINT16,
	        offset: 0
		};
	
		modelDescriptor.data.vertexBuffers["normalVBuffer"+t] = { typedArray: new Float32Array(localVertices * 3) };
		var normalBuffer = modelDescriptor.data.vertexBuffers["normalVBuffer"+t].typedArray;

		for(var x = 0; x < localFaceCount; x++) {
        		for (var y = 0; y < 3; y++) {
         			for (var k = 0; k < 3; k++)
          				normalBuffer[3*(3*x+y)+k] = normals[noff + 3*x+k];
         		}
		}
		noff += localVertices;
		modelDescriptor.access.vertexStreams["normals"+t] = {
			buffer: "normalVBuffer"+t,
	        	size: 3,
	  	      	type: SpiderGL.Type.FLOAT32,
	 	       	stride: 12,
	 	       	offset: 0,
	 	       	normalized: true 
		}

		modelDescriptor.semantic.bindings["bd"+t] = { vertexStreams: { POSITION: ["vertices"+t], NORMAL: ["normals"+t] }, primitiveStreams: { FILL: ["ps"+t] }};
		modelDescriptor.semantic.chunks["ch"+t] = { techniques: { common: { binding: "bd"+t } } };
		modelDescriptor.logic.parts["pt"+t] = { chunks: ["ch"+t] };

		v -= chunkSize;
	}
	modelDescriptor.parsingSuccess = info.parsingSuccess;

	return modelDescriptor;	
}

function convertTrianglesToArrays(triangles){
	var arr = { normals: [], positions: [] };

	for(var i =0; i<triangles.length; i++){
		arr.normals.push(triangles[i].normal.x);
		arr.normals.push(triangles[i].normal.y);
		arr.normals.push(triangles[i].normal.z);

		arr.positions.push(triangles[i].vertex1.x);
		arr.positions.push(triangles[i].vertex1.x);
		arr.positions.push(triangles[i].vertex1.x);

		arr.positions.push(triangles[i].vertex2.x);
		arr.positions.push(triangles[i].vertex2.x);
		arr.positions.push(triangles[i].vertex2.x);

		arr.positions.push(triangles[i].vertex3.x);
		arr.positions.push(triangles[i].vertex3.x);
		arr.positions.push(triangles[i].vertex3.x);
	}

	return arr;
}

function parseSTL_Binary(data) { 
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

	var arr = convertTrianglesToArrays(triangles);
	return arr;
}

function parseSTL_ASCII(data){
	var lines = data.split('\n');
	for(var j=0; j<lines.length; j++){ 
		lines[j] = lines[j].trim(); 
		lines[j] = lines[j].replace(/ +(?= )/g,'');
	}

	var positions = [];
	var normals = [];
	var obj = { parsingSuccess : false };
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

sglHandleCanvasOnLoad("draw-canvas", new CanvasHandler());

