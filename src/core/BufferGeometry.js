/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */

THREE.BufferGeometry = function () {

	Object.defineProperty( this, 'id', { value: THREE.GeometryIdCount ++ } );

	this.uuid = THREE.Math.generateUUID();

	this.name = '';
	this.type = 'BufferGeometry';

	this.attributes = {};

	this.morphAttributes = [];

	this.drawcalls = [];
	this.offsets = this.drawcalls; // backwards compatibility

	this.boundingBox = null;
	this.boundingSphere = null;

};

THREE.BufferGeometry.prototype = {

	constructor: THREE.BufferGeometry,

	addAttribute: function ( name, attribute ) {

		if ( attribute instanceof THREE.BufferAttribute === false && attribute instanceof THREE.InterleavedBufferAttribute === false ) {

			console.warn( 'THREE.BufferGeometry: .addAttribute() now expects ( name, attribute ).' );

			this.attributes[ name ] = { array: arguments[ 1 ], itemSize: arguments[ 2 ] };

			return;

		}

		this.attributes[ name ] = attribute;

	},

	getAttribute: function ( name ) {

		return this.attributes[ name ];

	},

	addDrawCall: function ( start, count, indexOffset ) {

		this.drawcalls.push( {

			start: start,
			count: count,
			index: indexOffset !== undefined ? indexOffset : 0

		} );

	},

	clearDrawCalls: function () {

		this.drawcalls = [];
		this.offsets = this.drawcalls;

	},

	applyMatrix: function ( matrix ) {

		var position = this.attributes.position;

		if ( position !== undefined ) {

			matrix.applyToVector3Array( position.array );
			position.needsUpdate = true;

		}

		var normal = this.attributes.normal;

		if ( normal !== undefined ) {

			var normalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );

			normalMatrix.applyToVector3Array( normal.array );
			normal.needsUpdate = true;

		}

		if ( this.boundingBox !== null ) {

			this.computeBoundingBox();

		}

		if ( this.boundingSphere !== null ) {

			this.computeBoundingSphere();

		}

	},

	copy: function ( geometry ) {

		// TODO Clear attributes? Clear drawcalls? Copy morphTargets?

		var attributes = geometry.attributes;
		var offsets = geometry.offsets;

		for ( var name in attributes ) {

			var attribute = attributes[ name ];

			this.addAttribute( name, attribute.clone() );

		}

		for ( var i = 0, il = offsets.length; i < il; i ++ ) {

			var offset = offsets[ i ];
			this.addDrawCall( offset.start, offset.count, offset.index );

		}

		return this;

	},

	center: function () {

		this.computeBoundingBox();

		var offset = this.boundingBox.center().negate();

		this.applyMatrix( new THREE.Matrix4().setPosition( offset ) );

		return offset;

	},

	setFromObject: function ( object ) {

		console.log( 'THREE.BufferGeometry.setFromObject(). Converting', object, this );

		var geometry = object.geometry;
		var material = object.material;

		if ( object instanceof THREE.PointCloud || object instanceof THREE.Line ) {

			var positions = new THREE.Float32Attribute( geometry.vertices.length * 3, 3 );
			var colors = new THREE.Float32Attribute( geometry.colors.length * 3, 3 );

			this.addAttribute( 'position', positions.copyVector3sArray( geometry.vertices ) );
			this.addAttribute( 'color', colors.copyColorsArray( geometry.colors ) );

			if ( geometry.lineDistances && geometry.lineDistances.length === geometry.vertices.length ) {

				var lineDistances = new THREE.Float32Attribute( geometry.lineDistances.length, 1 );

				this.addAttribute( 'lineDistance',  lineDistances.copyArray( geometry.lineDistances ) );

			}

			if ( geometry.boundingSphere !== null ) {

				this.boundingSphere = geometry.boundingSphere.clone();

			}

			if ( geometry.boundingBox !== null ) {

				this.boundingBox = geometry.boundingBox.clone();

			}

		} else if ( object instanceof THREE.Mesh ) {

			if ( geometry instanceof THREE.Geometry ) {

				this.fromGeometry( geometry );

			}

		}

		return this;

	},

	updateFromObject: function ( object ) {

		var geometry = object.geometry;

		if ( object instanceof THREE.Mesh ) {

			var direct = geometry.__directGeometry;

			direct.verticesNeedUpdate = geometry.verticesNeedUpdate;
			direct.normalsNeedUpdate = geometry.normalsNeedUpdate;
			direct.colorsNeedUpdate = geometry.colorsNeedUpdate;
			direct.uvsNeedUpdate = geometry.uvsNeedUpdate;
			direct.tangentsNeedUpdate = geometry.tangentsNeedUpdate;

			geometry.verticesNeedUpdate = false;
			geometry.normalsNeedUpdate = false;
			geometry.colorsNeedUpdate = false;
			geometry.uvsNeedUpdate = false;
			geometry.tangentsNeedUpdate = false;

			geometry = direct;

		}

		if ( geometry.verticesNeedUpdate === true ) {

			var attribute = this.attributes.position;

			if ( attribute !== undefined ) {

				attribute.copyVector3sArray( geometry.vertices );
				attribute.needsUpdate = true;

			}

			geometry.verticesNeedUpdate = false;

		}

		if ( geometry.normalsNeedUpdate === true ) {

			var attribute = this.attributes.normal;

			if ( attribute !== undefined ) {

				attribute.copyVector3sArray( geometry.normals );
				attribute.needsUpdate = true;

			}

			geometry.normalsNeedUpdate = false;

		}

		if ( geometry.colorsNeedUpdate === true ) {

			var attribute = this.attributes.color;

			if ( attribute !== undefined ) {

				attribute.copyColorsArray( geometry.colors );
				attribute.needsUpdate = true;

			}

			geometry.colorsNeedUpdate = false;

		}

		if ( geometry.tangentsNeedUpdate === true ) {

			var attribute = this.attributes.tangent;

			if ( attribute !== undefined ) {

				attribute.copyVector4sArray( geometry.tangents );
				attribute.needsUpdate = true;

			}

			geometry.tangentsNeedUpdate = false;

		}

		if ( geometry.lineDistancesNeedUpdate ) {

			var attribute = this.attributes.lineDistance;

			if ( attribute !== undefined ) {

				attribute.copyArray( geometry.lineDistances );
				attribute.needsUpdate = true;

			}

			geometry.lineDistancesNeedUpdate = false;

		}

		return this;

	},

	fromGeometry: function ( geometry ) {

		geometry.__directGeometry = new THREE.DirectGeometry().fromGeometry( geometry );

		return this.fromDirectGeometry( geometry.__directGeometry );

	},

	fromDirectGeometry: function ( geometry ) {

		var positions = new Float32Array( geometry.vertices.length * 3 );
		this.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ).copyVector3sArray( geometry.vertices ) );

		if ( geometry.normals.length > 0 ) {

			var normals = new Float32Array( geometry.normals.length * 3 );
			this.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ).copyVector3sArray( geometry.normals ) );

		}

		if ( geometry.colors.length > 0 ) {

			var colors = new Float32Array( geometry.colors.length * 3 );
			this.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ).copyColorsArray( geometry.colors ) );

		}

		if ( geometry.uvs.length > 0 ) {

			var uvs = new Float32Array( geometry.uvs.length * 2 );
			this.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ).copyVector2sArray( geometry.uvs ) );

		}

		if ( geometry.uvs2.length > 0 ) {

			var uvs2 = new Float32Array( geometry.uvs2.length * 2 );
			this.addAttribute( 'uv2', new THREE.BufferAttribute( uvs2, 2 ).copyVector2sArray( geometry.uvs2 ) );

		}

		if ( geometry.tangents.length > 0 ) {

			var tangents = new Float32Array( geometry.tangents.length * 4 );
			this.addAttribute( 'tangent', new THREE.BufferAttribute( tangents, 4 ).copyVector4sArray( geometry.tangents ) );

		}

		if ( geometry.indices.length > 0 ) {

			var indices = new Uint16Array( geometry.indices.length * 3 );
			this.addAttribute( 'index', new THREE.BufferAttribute( indices, 1 ).copyIndicesArray( geometry.indices ) );

		}

		// morphs

		if ( geometry.morphTargets.length > 0 ) {

			var morphTargets = geometry.morphTargets;

			for ( var i = 0, l = morphTargets.length; i < l; i ++ ) {

				var morphTarget = morphTargets[ i ];

				var attribute = new THREE.Float32Attribute( morphTarget.length * 3, 3 );

				this.morphAttributes.push( attribute.copyVector3sArray( morphTarget ) );

			}

			// TODO normals, colors

		}

		// skinning

		if ( geometry.skinIndices.length > 0 ) {

			var skinIndices = new THREE.Float32Attribute( geometry.skinIndices.length * 4, 4 );
			this.addAttribute( 'skinIndex', skinIndices.copyVector4sArray( geometry.skinIndices ) );

		}

		if ( geometry.skinWeights.length > 0 ) {

			var skinWeights = new THREE.Float32Attribute( geometry.skinWeights.length * 4, 4 );
			this.addAttribute( 'skinWeight', skinWeights.copyVector4sArray( geometry.skinWeights ) );

		}

		//

		if ( geometry.boundingSphere !== null ) {

			this.boundingSphere = geometry.boundingSphere.clone();

		}

		if ( geometry.boundingBox !== null ) {

			this.boundingBox = geometry.boundingBox.clone();

		}

		return this;

	},

	computeBoundingBox: function () {

		var vector = new THREE.Vector3();

		return function () {

			if ( this.boundingBox === null ) {

				this.boundingBox = new THREE.Box3();

			}

			var positions = this.attributes.position.array;

			if ( positions ) {

				var bb = this.boundingBox;
				bb.makeEmpty();

				for ( var i = 0, il = positions.length; i < il; i += 3 ) {

					vector.fromArray( positions, i );
					bb.expandByPoint( vector );

				}

			}

			if ( positions === undefined || positions.length === 0 ) {

				this.boundingBox.min.set( 0, 0, 0 );
				this.boundingBox.max.set( 0, 0, 0 );

			}

			if ( isNaN( this.boundingBox.min.x ) || isNaN( this.boundingBox.min.y ) || isNaN( this.boundingBox.min.z ) ) {

				console.error( 'THREE.BufferGeometry.computeBoundingBox: Computed min/max have NaN values. The "position" attribute is likely to have NaN values.', this );

			}

		};

	}(),

	computeBoundingSphere: function () {

		var box = new THREE.Box3();
		var vector = new THREE.Vector3();

		return function () {

			if ( this.boundingSphere === null ) {

				this.boundingSphere = new THREE.Sphere();

			}

			var positions = this.attributes.position.array;

			if ( positions ) {

				box.makeEmpty();

				var center = this.boundingSphere.center;

				for ( var i = 0, il = positions.length; i < il; i += 3 ) {

					vector.fromArray( positions, i );
					box.expandByPoint( vector );

				}

				box.center( center );

				// hoping to find a boundingSphere with a radius smaller than the
				// boundingSphere of the boundingBox: sqrt(3) smaller in the best case

				var maxRadiusSq = 0;

				for ( var i = 0, il = positions.length; i < il; i += 3 ) {

					vector.fromArray( positions, i );
					maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( vector ) );

				}

				this.boundingSphere.radius = Math.sqrt( maxRadiusSq );

				if ( isNaN( this.boundingSphere.radius ) ) {

					console.error( 'THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.', this );

				}

			}

		};

	}(),

	computeFaceNormals: function () {

		// backwards compatibility

	},

	computeVertexNormals: function () {

		var attributes = this.attributes;

		if ( attributes.position ) {

			var positions = attributes.position.array;

			if ( attributes.normal === undefined ) {

				this.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( positions.length ), 3 ) );

			} else {

				// reset existing normals to zero

				var normals = attributes.normal.array;

				for ( var i = 0, il = normals.length; i < il; i ++ ) {

					normals[ i ] = 0;

				}

			}

			var normals = attributes.normal.array;

			var vA, vB, vC,

			pA = new THREE.Vector3(),
			pB = new THREE.Vector3(),
			pC = new THREE.Vector3(),

			cb = new THREE.Vector3(),
			ab = new THREE.Vector3();

			// indexed elements

			if ( attributes.index ) {

				var indices = attributes.index.array;

				if ( this.drawcalls.length === 0 ) {

					this.addDrawCall( 0, indices.length, 0 );

				}

				for ( var j = 0, jl = this.drawcalls.length; j < jl; ++ j ) {

					var start = this.drawcalls[ j ].start;
					var count = this.drawcalls[ j ].count;
					var index = this.drawcalls[ j ].index;

					for ( var i = start, il = start + count; i < il; i += 3 ) {

						vA = ( index + indices[ i     ] ) * 3;
						vB = ( index + indices[ i + 1 ] ) * 3;
						vC = ( index + indices[ i + 2 ] ) * 3;

						pA.fromArray( positions, vA );
						pB.fromArray( positions, vB );
						pC.fromArray( positions, vC );

						cb.subVectors( pC, pB );
						ab.subVectors( pA, pB );
						cb.cross( ab );

						normals[ vA     ] += cb.x;
						normals[ vA + 1 ] += cb.y;
						normals[ vA + 2 ] += cb.z;

						normals[ vB     ] += cb.x;
						normals[ vB + 1 ] += cb.y;
						normals[ vB + 2 ] += cb.z;

						normals[ vC     ] += cb.x;
						normals[ vC + 1 ] += cb.y;
						normals[ vC + 2 ] += cb.z;

					}

				}

			} else {

				// non-indexed elements (unconnected triangle soup)

				for ( var i = 0, il = positions.length; i < il; i += 9 ) {

					pA.fromArray( positions, i );
					pB.fromArray( positions, i + 3 );
					pC.fromArray( positions, i + 6 );

					cb.subVectors( pC, pB );
					ab.subVectors( pA, pB );
					cb.cross( ab );

					normals[ i     ] = cb.x;
					normals[ i + 1 ] = cb.y;
					normals[ i + 2 ] = cb.z;

					normals[ i + 3 ] = cb.x;
					normals[ i + 4 ] = cb.y;
					normals[ i + 5 ] = cb.z;

					normals[ i + 6 ] = cb.x;
					normals[ i + 7 ] = cb.y;
					normals[ i + 8 ] = cb.z;

				}

			}

			this.normalizeNormals();

			attributes.normal.needsUpdate = true;

		}

	},

	computeTangents: function () {

		// based on http://www.terathon.com/code/tangent.html
		// (per vertex tangents)

		if ( this.attributes.index === undefined ||
			 this.attributes.position === undefined ||
			 this.attributes.normal === undefined ||
			 this.attributes.uv === undefined ) {

			console.warn( 'THREE.BufferGeometry: Missing required attributes (index, position, normal or uv) in BufferGeometry.computeTangents()' );
			return;

		}

		var indices = this.attributes.index.array;
		var positions = this.attributes.position.array;
		var normals = this.attributes.normal.array;
		var uvs = this.attributes.uv.array;

		var nVertices = positions.length / 3;

		if ( this.attributes.tangent === undefined ) {

			this.addAttribute( 'tangent', new THREE.BufferAttribute( new Float32Array( 4 * nVertices ), 4 ) );

		}

		var tangents = this.attributes.tangent.array;

		var tan1 = [], tan2 = [];

		for ( var k = 0; k < nVertices; k ++ ) {

			tan1[ k ] = new THREE.Vector3();
			tan2[ k ] = new THREE.Vector3();

		}

		var vA = new THREE.Vector3(),
			vB = new THREE.Vector3(),
			vC = new THREE.Vector3(),

			uvA = new THREE.Vector2(),
			uvB = new THREE.Vector2(),
			uvC = new THREE.Vector2(),

			x1, x2, y1, y2, z1, z2,
			s1, s2, t1, t2, r;

		var sdir = new THREE.Vector3(), tdir = new THREE.Vector3();

		function handleTriangle( a, b, c ) {

			vA.fromArray( positions, a * 3 );
			vB.fromArray( positions, b * 3 );
			vC.fromArray( positions, c * 3 );

			uvA.fromArray( uvs, a * 2 );
			uvB.fromArray( uvs, b * 2 );
			uvC.fromArray( uvs, c * 2 );

			x1 = vB.x - vA.x;
			x2 = vC.x - vA.x;

			y1 = vB.y - vA.y;
			y2 = vC.y - vA.y;

			z1 = vB.z - vA.z;
			z2 = vC.z - vA.z;

			s1 = uvB.x - uvA.x;
			s2 = uvC.x - uvA.x;

			t1 = uvB.y - uvA.y;
			t2 = uvC.y - uvA.y;

			r = 1.0 / ( s1 * t2 - s2 * t1 );

			sdir.set(
				( t2 * x1 - t1 * x2 ) * r,
				( t2 * y1 - t1 * y2 ) * r,
				( t2 * z1 - t1 * z2 ) * r
			);

			tdir.set(
				( s1 * x2 - s2 * x1 ) * r,
				( s1 * y2 - s2 * y1 ) * r,
				( s1 * z2 - s2 * z1 ) * r
			);

			tan1[ a ].add( sdir );
			tan1[ b ].add( sdir );
			tan1[ c ].add( sdir );

			tan2[ a ].add( tdir );
			tan2[ b ].add( tdir );
			tan2[ c ].add( tdir );

		}

		var i, il;
		var j, jl;
		var iA, iB, iC;

		if ( this.drawcalls.length === 0 ) {

			this.addDrawCall( 0, indices.length, 0 );

		}

		var drawcalls = this.drawcalls;

		for ( j = 0, jl = drawcalls.length; j < jl; ++ j ) {

			var start = drawcalls[ j ].start;
			var count = drawcalls[ j ].count;
			var index = drawcalls[ j ].index;

			for ( i = start, il = start + count; i < il; i += 3 ) {

				iA = index + indices[ i ];
				iB = index + indices[ i + 1 ];
				iC = index + indices[ i + 2 ];

				handleTriangle( iA, iB, iC );

			}

		}

		var tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
		var n = new THREE.Vector3(), n2 = new THREE.Vector3();
		var w, t, test;

		function handleVertex( v ) {

			n.fromArray( normals, v * 3 );
			n2.copy( n );

			t = tan1[ v ];

			// Gram-Schmidt orthogonalize

			tmp.copy( t );
			tmp.sub( n.multiplyScalar( n.dot( t ) ) ).normalize();

			// Calculate handedness

			tmp2.crossVectors( n2, t );
			test = tmp2.dot( tan2[ v ] );
			w = ( test < 0.0 ) ? - 1.0 : 1.0;

			tangents[ v * 4     ] = tmp.x;
			tangents[ v * 4 + 1 ] = tmp.y;
			tangents[ v * 4 + 2 ] = tmp.z;
			tangents[ v * 4 + 3 ] = w;

		}

		for ( j = 0, jl = drawcalls.length; j < jl; ++ j ) {

			var start = drawcalls[ j ].start;
			var count = drawcalls[ j ].count;
			var index = drawcalls[ j ].index;

			for ( i = start, il = start + count; i < il; i += 3 ) {

				iA = index + indices[ i ];
				iB = index + indices[ i + 1 ];
				iC = index + indices[ i + 2 ];

				handleVertex( iA );
				handleVertex( iB );
				handleVertex( iC );

			}

		}

	},

	/*
	Compute the draw offset for large models by chunking the index buffer into chunks of 65k addressable vertices.
	This method will effectively rewrite the index buffer and remap all attributes to match the new indices.
	WARNING: This method will also expand the vertex count to prevent sprawled triangles across draw offsets.
	size - Defaults to 65535 or 4294967296 if extension OES_element_index_uint supported, but allows for larger or smaller chunks.
	*/
	computeOffsets: function ( size ) {

		if ( size === undefined ) size = THREE.BufferGeometry.MaxIndex;

		var indices = this.attributes.index.array;
		var vertices = this.attributes.position.array;

		var facesCount = ( indices.length / 3 );

		var UintArray = ( ( vertices.length / 3 ) > 65535 && THREE.BufferGeometry.MaxIndex > 65535 ) ? Uint32Array : Uint16Array;

		/*
		console.log("Computing buffers in offsets of "+size+" -> indices:"+indices.length+" vertices:"+vertices.length);
		console.log("Faces to process: "+(indices.length/3));
		console.log("Reordering "+verticesCount+" vertices.");
		*/

		var sortedIndices = new UintArray( indices.length );

		var indexPtr = 0;
		var vertexPtr = 0;

		var tmpOffsets = [ { start:0, count:0, index:0 } ];
		var offset = tmpOffsets[ 0 ];

		var duplicatedVertices = 0;
		var newVerticeMaps = 0;
		var faceVertices = new Int32Array( 6 );
		var vertexMap = new Int32Array( vertices.length );
		var revVertexMap = new Int32Array( vertices.length );
		for ( var j = 0; j < vertices.length; j ++ ) { vertexMap[ j ] = - 1; revVertexMap[ j ] = - 1; }

		/*
			Traverse every face and reorder vertices in the proper offsets of 65k.
			We can have more than 'size' entries in the index buffer per offset, but only reference 'size' values.
		*/
		for ( var findex = 0; findex < facesCount; findex ++ ) {
			newVerticeMaps = 0;

			for ( var vo = 0; vo < 3; vo ++ ) {
				var vid = indices[ findex * 3 + vo ];
				if ( vertexMap[ vid ] === - 1 ) {
					//Unmapped vertex
					faceVertices[ vo * 2 ] = vid;
					faceVertices[ vo * 2 + 1 ] = - 1;
					newVerticeMaps ++;
				} else if ( vertexMap[ vid ] < offset.index ) {
					//Reused vertices from previous block (duplicate)
					faceVertices[ vo * 2 ] = vid;
					faceVertices[ vo * 2 + 1 ] = - 1;
					duplicatedVertices ++;
				} else {
					//Reused vertex in the current block
					faceVertices[ vo * 2 ] = vid;
					faceVertices[ vo * 2 + 1 ] = vertexMap[ vid ];
				}
			}

			var faceMax = vertexPtr + newVerticeMaps;
			if ( faceMax > ( offset.index + size ) ) {
				var new_offset = { start:indexPtr, count:0, index:vertexPtr };
				tmpOffsets.push( new_offset );
				offset = new_offset;

				//Re-evaluate reused vertices in light of new offset.
				for ( var v = 0; v < 6; v += 2 ) {
					var new_vid = faceVertices[ v + 1 ];
					if ( new_vid > - 1 && new_vid < offset.index )
						faceVertices[ v + 1 ] = - 1;
				}
			}

			//Reindex the face.
			for ( var v = 0; v < 6; v += 2 ) {
				var vid = faceVertices[ v ];
				var new_vid = faceVertices[ v + 1 ];

				if ( new_vid === - 1 )
					new_vid = vertexPtr ++;

				vertexMap[ vid ] = new_vid;
				revVertexMap[ new_vid ] = vid;
				sortedIndices[ indexPtr ++ ] = new_vid - offset.index; //XXX overflows at 16bit
				offset.count ++;
			}
		}

		/* Move all attribute values to map to the new computed indices , also expand the vertex stack to match our new vertexPtr. */
		this.reorderBuffers( sortedIndices, revVertexMap, vertexPtr );

		this.clearDrawCalls();
		for ( var i = 0; i < tmpOffsets.length; i ++ ) {

			var offset = tmpOffsets[ i ];
			this.addDrawCall( offset.start, offset.count, offset.index );

		}

		/*
		var orderTime = Date.now();
		console.log("Reorder time: "+(orderTime-s)+"ms");
		console.log("Duplicated "+duplicatedVertices+" vertices.");
		console.log("Compute Buffers time: "+(Date.now()-s)+"ms");
		console.log("Draw tmpOffsets: "+tmpOffsets.length);
		*/

	},

	merge: function ( geometry, offset ) {

		if ( geometry instanceof THREE.BufferGeometry === false ) {

			console.error( 'THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.', geometry );
			return;

		}

		if ( offset === undefined ) offset = 0;

		var attributes = this.attributes;

		for ( var key in attributes ) {

			if ( geometry.attributes[ key ] === undefined ) continue;

			var attribute1 = attributes[ key ];
			var attributeArray1 = attribute1.array;

			var attribute2 = geometry.attributes[ key ];
			var attributeArray2 = attribute2.array;

			var attributeSize = attribute2.itemSize;

			for ( var i = 0, j = attributeSize * offset; i < attributeArray2.length; i ++, j ++ ) {

				attributeArray1[ j ] = attributeArray2[ i ];

			}

		}

		return this;

	},

	normalizeNormals: function () {

		var normals = this.attributes.normal.array;

		var x, y, z, n;

		for ( var i = 0, il = normals.length; i < il; i += 3 ) {

			x = normals[ i ];
			y = normals[ i + 1 ];
			z = normals[ i + 2 ];

			n = 1.0 / Math.sqrt( x * x + y * y + z * z );

			normals[ i     ] *= n;
			normals[ i + 1 ] *= n;
			normals[ i + 2 ] *= n;

		}

	},

	/*
		reoderBuffers:
		Reorder attributes based on a new indexBuffer and indexMap.
		indexBuffer - Uint16Array of the new ordered indices.
		indexMap - Int32Array where the position is the new vertex ID and the value the old vertex ID for each vertex.
		vertexCount - Amount of total vertices considered in this reordering (in case you want to grow the vertex stack).
	*/
	reorderBuffers: function ( indexBuffer, indexMap, vertexCount ) {

		/* Create a copy of all attributes for reordering. */
		var sortedAttributes = {};
		for ( var attr in this.attributes ) {
			if ( attr === 'index' )
				continue;
			var sourceArray = this.attributes[ attr ].array;
			sortedAttributes[ attr ] = new sourceArray.constructor( this.attributes[ attr ].itemSize * vertexCount );
		}

		/* Move attribute positions based on the new index map */
		for ( var new_vid = 0; new_vid < vertexCount; new_vid ++ ) {
			var vid = indexMap[ new_vid ];
			for ( var attr in this.attributes ) {
				if ( attr === 'index' )
					continue;
				var attrArray = this.attributes[ attr ].array;
				var attrSize = this.attributes[ attr ].itemSize;
				var sortedAttr = sortedAttributes[ attr ];
				for ( var k = 0; k < attrSize; k ++ )
					sortedAttr[ new_vid * attrSize + k ] = attrArray[ vid * attrSize + k ];
			}
		}

		/* Carry the new sorted buffers locally */
		this.attributes[ 'index' ].array = indexBuffer;
		for ( var attr in this.attributes ) {
			if ( attr === 'index' )
				continue;
			this.attributes[ attr ].array = sortedAttributes[ attr ];
			this.attributes[ attr ].numItems = this.attributes[ attr ].itemSize * vertexCount;
		}
	},

	toJSON: function () {

		var data = {
			metadata: {
				version: 4.4,
				type: 'BufferGeometry',
				generator: 'BufferGeometry.toJSON'
			}
		};

		// standard BufferGeometry serialization

		data.uuid = this.uuid;
		data.type = this.type;
		if ( this.name !== '' ) data.name = this.name;

		if ( this.parameters !== undefined ) {

			var parameters = this.parameters;

			for ( var key in parameters ) {

				if ( parameters[ key ] !== undefined ) data[ key ] = parameters[ key ];

			}

			return data;

		}

		data.data = { attributes: {} };

		var attributes = this.attributes;
		var offsets = this.offsets;
		var boundingSphere = this.boundingSphere;

		for ( var key in attributes ) {

			var attribute = attributes[ key ];

			var array = Array.prototype.slice.call( attribute.array );

			data.data.attributes[ key ] = {
				itemSize: attribute.itemSize,
				type: attribute.array.constructor.name,
				array: array
			}

		}

		if ( offsets.length > 0 ) {

			data.data.offsets = JSON.parse( JSON.stringify( offsets ) );

		}

		if ( boundingSphere !== null ) {

			data.data.boundingSphere = {
				center: boundingSphere.center.toArray(),
				radius: boundingSphere.radius
			}

		}

		return data;

	},

	clone: function () {

		var geometry = new THREE.BufferGeometry();

		for ( var attr in this.attributes ) {

			var sourceAttr = this.attributes[ attr ];
			geometry.addAttribute( attr, sourceAttr.clone() );

		}

		for ( var i = 0, il = this.offsets.length; i < il; i ++ ) {

			var offset = this.offsets[ i ];

			geometry.addDrawCall( offset.start, offset.count, offset.index );

		}

		return geometry;

	},

	dispose: function () {

		this.dispatchEvent( { type: 'dispose' } );

	}

};

THREE.EventDispatcher.prototype.apply( THREE.BufferGeometry.prototype );

THREE.BufferGeometry.MaxIndex = 65535;
