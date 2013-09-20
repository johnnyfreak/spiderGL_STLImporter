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
				"aColor"  : [ 0.4, 0.4, 0.8, 1.0 ]
			},
			globals : {
				"uWorldViewProjectionMatrix" : { semantic : "WORLD_VIEW_PROJECTION_MATRIX", value : SglMat4.identity() },
				"uViewSpaceNormalMatrix"     : { semantic : "VIEW_SPACE_NORMAL_MATRIX",     value : SglMat3.identity() },
				"uViewSpaceLightDirection"   : { semantic : "VIEW_SPACE_LIGHT_DIRECTION",   value : [ 0.0, 0.0, -1.0 ] }
			}
		});
		log(this.technique.program.log);

		this.model = null;
		var that = this;
		sglRequestBinary("models/tete_complete.stl", {
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
		this.angle += 90.0 * dt;
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
		xform.projection.perspective(sglDegToRad(50.0), width/height, 0.1, 10.0);

		xform.view.loadIdentity();
		xform.view.lookAt([0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);

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

function parseSTL(d){
	var header =  String.fromCharCode.apply(null, new Uint8Array(d.slice(0,80)));
	var parsingSuccess = false;
	var checkHeader = header.startsWith("solid");			
	var byteData = new Uint8Array(d);			
	var obj ={
                     version: "0.0.1.0 EXP",
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


	log("header: " +header);

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
			
	if(parsingSuccess) {
		log("file parsed");
	}else{
		log("failed to parse");
		
	}
	return obj;
}

function parseSTL_Binary(data) { 
	var triangles = parseBinaryAux(data);
	var modelDescriptor = {
                     version: "0.0.1.0 EXP",
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

	var faceCount = triangles.length;
	var vertexCount = faceCount * 3;
	modelDescriptor.data.vertexBuffers["vb0"] = { typedArray: new Float32Array(9 * vertexCount) };
	var arrayBuffer = modelDescriptor.data.vertexBuffers["vb0"].typedArray;
	for(var i = 0; i < vertexCount; i++)
	{
		arrayBuffer[i*3]   = triangles[i].vertex1.x;
		arrayBuffer[i*3+1] = triangles[i].vertex1.y;
		arrayBuffer[i*3+2] = triangles[i].vertex1.z;

		arrayBuffer[i*3+3] = triangles[i].vertex2.x;
		arrayBuffer[i*3+4] = triangles[i].vertex2.y;
		arrayBuffer[i*3+5] = triangles[i].vertex2.z;

		arrayBuffer[i*3+6] = triangles[i].vertex3.x;
		arrayBuffer[i*3+7] = triangles[i].vertex3.y;
		arrayBuffer[i*3+8] = triangles[i].vertex3.z;
	}

	modelDescriptor.data.indexBuffers["ib0"] = { typedArray: new Uint16Array(3 * facesCount) };
	var indexBuffer = modelDescriptor.data.indexBuffers["ib0"].typedArray;
	for(var i = 0; i < 3* facesCount; i++) {
		indexBuffer[i] = i;
	}


	modelDescriptor.access.vertexStreams["vertices0"] = { //see glVertexAttribPointer
	        buffer: "vb0",
	        size: 3,
	        type: SpiderGL.Type.FLOAT32,
	        stride: 12,
	        offset: 0,
	        normalized: true 
	};
	
	modelDescriptor.access.primitiveStreams["ps0"] = { //see glDrawElements
	        buffer: "ib0",
	        mode: SpiderGL.Type.TRIANGLES,
	        count: vertexCount,
	        type: SpiderGL.Type.UINT16,
	        offset: 0
	};
	
	modelDescriptor.semantic.bindings["bd0"] = { vertexStreams: { POSITION: ["vertices0"] }, primitiveStreams: { FILL: ["ps0"] }};
	modelDescriptor.semantic.chunks["ch0"] = { techniques: { common: { binding: "bd0" } } };
	modelDescriptor.logic.parts["pt0"] = { chunks: ["ch0"] };

	modelDescriptor.parsingSuccess = obj.parsingSuccess;

}

function parseBinaryAux(data){
	var obj = {};
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

function parseSTL_ASCII(data){
	var lines = data.split('\n');
	for(var j=0; j<lines.length; j++){ 
		lines[j] = lines[j].trim(); 
		lines[j] = lines[j].replace(/ +(?= )/g,'');
	}

	var modelDescriptor = {
                     version: "0.0.1.0 EXP",
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
	
	var vertexCount = positions.length / 3;
	var facesCount = vertexCount / 3;

	modelDescriptor.data.vertexBuffers["vb0"] = { typedArray: new Float32Array(3 * vertexCount) };
	var arrayBuffer = modelDescriptor.data.vertexBuffers["vb0"].typedArray;
	for(var i = 0; i < vertexCount * 3; i++)
	{
		arrayBuffer[i] = parseFloat(positions[i]);
	}

	modelDescriptor.data.indexBuffers["ib0"] = { typedArray: new Uint16Array(3 * facesCount) };
	var indexBuffer = modelDescriptor.data.indexBuffers["ib0"].typedArray;
	for(var i = 0; i < 3* facesCount; i++) {
		indexBuffer[i] = i;
	}


	modelDescriptor.access.vertexStreams["vertices0"] = { //see glVertexAttribPointer
	        buffer: "vb0",
	        size: 3,
	        type: SpiderGL.Type.FLOAT32,
	        stride: 12,
	        offset: 0,
	        normalized: true 
	};
	
	modelDescriptor.access.primitiveStreams["ps0"] = { //see glDrawElements
	        buffer: "ib0",
	        mode: SpiderGL.Type.TRIANGLES,
	        count: vertexCount,
	        type: SpiderGL.Type.UINT16,
	        offset: 0
	};
	
	modelDescriptor.semantic.bindings["bd0"] = { vertexStreams: { POSITION: ["vertices0"] }, primitiveStreams: { FILL: ["ps0"] }};
	modelDescriptor.semantic.chunks["ch0"] = { techniques: { common: { binding: "bd0" } } };
	modelDescriptor.logic.parts["pt0"] = { chunks: ["ch0"] };

	modelDescriptor.parsingSuccess = obj.parsingSuccess;

	return modelDescriptor;	

}


sglHandleCanvasOnLoad("draw-canvas", new CanvasHandler());

