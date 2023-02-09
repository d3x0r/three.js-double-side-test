
import * as THREE from "./three.js/three.module.js"
//import "./three.js/TrackballControls.js"
//import "./three.js/gameMouse.js"  // adds mouse to voxel world controller
import {Vector3Pool,Vector4Pool,THREE_consts,Motion} from "./three.js/personalFill.mjs"
import {NaturalCamera} from "./three.js/NaturalCamera.js"

import {lnQuat} from "./lnQuat.js"

let maxRequired = 0;
let requiredImages = [];
let pendingLoad = [];

const imageNames = [ "Diamond.png",
"DK-Blue-Gems.png",
"Emerald.png",
"LT-Blue-Gems.png",
"Orange-Gems.png",
"Purple-Gems.png",
"Ruby.png",
"Yellow-Gems.png" 
];

const numberImageName = "images/numbers_1-90a.png";

const backNames = [ 
	"BALL_Blue.png",
"BALL_Red.png",
"simpleBall.png",
"BALL_Green.png",
"BALL_Yellow.png"
];

const ringNames = [ 
	"simpleCircleBlue.png",
"simpleCircleRed.png",
"simpleCircleGrey.png",
"simpleCircleGreen.png",
"simpleCircleYellow.png"
];


const images = [];//imageNames.map( n=>"images/"+n ).map( newImage );
const ringImages = ringNames.map( n=>"images/"+n ).map( newImage );
const backImages = backNames.map( n=>"images/"+n ).map( newImage );
const numberImage = newImage( numberImageName );
//let balls = null;  // is the arrays of balls available.
//let gameSet = []; // the 4 spinning things.


lnQuat.setVectorType( THREE.Vector3 );

//const spin1 = new lnQuat();
//const spin2 = new lnQuat( 0, 0.05, 0.00, 0.00 ).update();

class Ball {
	body = null;
	spin1_1 = new lnQuat( 0, 0, 0, -Math.PI/2).update();
	spin1_2 = new lnQuat( 0, 0.05, 0.00, 0.00 ).update();

	body2 = null;
	spin2_1 = new lnQuat( 0, Math.PI, 0, -Math.PI/2).update();
	spin2_2 = new lnQuat( 0, 0.05, 0.00, 0.00 ).update();

	body_n = 0;
	body2_n = 0;
	col = 0;
	speed = 1;

	gameSet = null;

	constructor(col,balls) {
		//this.gameSet = gameSet;
		this.balls = balls;
		const n = (Math.random() * backImages.length)|0;
		this.body = getGem( balls, col, n );
		this.col = col;
		this.newSpin(0);
	}


	newSpin(b) {
		const d = Math.random();
		if( b === 0 ) {
			dropGem( this.balls, this.body_n, this.body );
			this.body_n = (Math.random() * backImages.length)|0;
			this.body = getGem( this.balls, this.col, this.body_n );

			//console.log( "N:", this.body_n );
			this.spin1_1.set( 0, 0, 0, -Math.PI/2 ).update();
			//this.spin1.freeSpin( Math.PI, {x:0,y:1,z:0} );
		        
			this.spin1_2.set( 0, Math.PI*Math.cos(d*2*Math.PI), Math.PI*Math.sin(d*2*Math.PI), 0 ).update();
			this.spin1_1.freeSpin( -this.spin1_2.θ, this.spin1_2 );
		        
			this.spin1_1.update();
		} else {
			dropGem( this.balls, this.body2_n, this.body2 );

			this.body2_n = (Math.random() * backImages.length)|0;
			//console.log( "N2:", this.body2_n );
			this.body2 = getGem( this.balls, this.col, this.body2_n );

			this.spin2_1.set( 0, 0, 0, -Math.PI/2 ).update();
			//this.spin1.freeSpin( Math.PI, {x:0,y:1,z:0} );
		        
			this.spin2_2.set( 0, Math.PI*Math.cos(d*2*Math.PI), Math.PI*Math.sin(d*2*Math.PI), 0 ).update();
			this.spin2_1.freeSpin( -this.spin2_2.θ, this.spin2_2 );
		        
			this.spin2_1.update();
		}
	}

	update( delta ) {
		//return;
		const speed = this.speed;
		if( this.speed > 0.1 )
			//this.speed -= 0.01;
				this.speed *= 0.9915;
		this.spin1_1.freeSpin( speed*this.spin1_2.θ / 300 * delta, this.spin1_2 );
		this.spin1_1.exp( this.body.quaternion );
		const u = this.spin1_1.forward();
		
		if( u.z < -0.7 ) {
			if( this.body.visible ) {
				this.newSpin( 0 );
				this.body.visible = false;
			}
		} else {
			this.body.visible = true;
		}

		if( u.z > 0.92 && !this.body2 )
			this.newSpin( 1 );


		this.spin2_1.freeSpin( speed*this.spin2_2.θ / 300 * delta, this.spin2_2 );
		const u2 = this.spin2_1.forward();
		if( this.body2 )		
			this.spin2_1.exp( this.body2.quaternion );
		if( u2.z < -0.7 ) {
			if( this.body2.visible ) {
				this.newSpin( 1 );
				this.body2.visible = false;
			}
		} else {
			if( this.body2 )
				this.body2.visible = true;
		}

	}

	
	
};

function newImage(src) {  

	//return THREE.ImageUtils.loadTexture( src );

	var i = new Image();
	let texture = null;
	var timeout;
	i.crossOrigin = "Anonymous";
	i.onload = ()=>{ 
		texture.needsUpdate = true;
		clearTimeout( timeout );
		var pl = pendingLoad;
		requiredImages.pop(); 
		if( pl.length ) {
			var pi = pl.shift();
			requiredImages.push( pi.i ); 
			console.log( "loading:", pi.src );
			window.lastImage = pi.i;
			pi.i.src = pi.src;
			tick();
			pendingLoad = pl;
			return;
		}
		//DOM_text.innerHTML = "Loading... " + (100 - 100*requiredImages.length / maxRequired );
		//console.log( "required?", requiredImages.length );
		if( requiredImages.length == 0 ) doWork(); 
	};

	//if( pendingLoad.length ) { pendingLoad.push( {i:i,src:src} ); return i; }
	//if( requiredImages.length ) { pendingLoad.push({i:i,src:src}); return i; }
	i.src = src; 
	requiredImages.push( i ); 
	function tick() {
		timeout = setTimeout( 
			()=>{
					console.log( "retry load:", i.src, src ); 
					i.src=""; 
					setTimeout( ()=>{ i.src=src}, 50 );
					//i.src=src; 
					tick()
				}
			, 250 );
	}
	//tick();
	maxRequired++;
	return texture = new THREE.Texture(i);
}
	
function doWork() {

	setupWorldView( "worldView1" );
	setupWorldView( "worldView2" );
	setupWorldView( "worldView3" );
	setupWorldView( "worldView4" );
	//doConnect(  );
}



export function setupWorldView( canvasId ) {
	var viewer = {
		canvas: document.getElementById( canvasId ),
		renderer : null,
		scene : new THREE.Scene(),
		camera : null,
		controls : null,
	};
		viewer.renderer = new THREE.WebGLRenderer( { canvas: viewer.canvas } );

		viewer.camera = new THREE.PerspectiveCamera( 76, viewer.canvas.width / viewer.canvas.height, 0.01, 100 );

		//viewer.camera.matrixAutoUpdate = false;
		viewer.camera.position.z = 2;
		//new lnQuat( 0, 


		//viewer.camera.position.set(0, 0, -8);
		viewer.scene.add(viewer.camera);

		viewer.renderer.setClearColor( 0x333333, 1 );


if(1) {
		 // for phong hello world test....
 		var light = new THREE.PointLight( 0xffFFFF, 1, 100 );
 		light.position.set( 0, 0, 100 );
 		viewer.scene.add( light );
}		

		var controlNatural = new NaturalCamera( viewer.camera, viewer.renderer.domElement );
		controlNatural.enable( );

		viewer.controls = controlNatural;


	let start = 0;
	let sec = 0;
	function animate(ts) {
		if( !start ) start = ts;
		const delta = ts-start;
		start = ts;
		if(0)
		if( ((start / 1000)|0) != sec ) {
			console.log( "camera:", viewer.camera.position );
			sec = (start / 1000)|0;
		}
		//var delta = clock.getDelta();
		//viewer.camera.updateWorldMatrix();	        
		updateBalls( balls, gameSet, delta );
		viewer.controls.update(delta);
		//viewer.renderer.clear();
		viewer.renderer.render( viewer.scene, viewer.camera );

	        
                //brainBoard.board.BoardRefresh();
                requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);
	const balls = initGeometry( viewer );

	const gameSet = [];
	gameSet.push( new Ball(0, balls, gameSet ) );

	return viewer;
}

function getGem(balls,col,n) {
	const ball = balls[n].pop();
	//ball.position.x = (col-1.5) * 2.3;
	ball.visible = true;
	return ball;	
}

function dropGem(balls, n,ball) {
	if( ball ) {
		balls[n].push(ball);
		ball.visible = false;	
	}
}

function updateGame( arr, delta ) {	
	
	let zero = null;
	for( let a of arr ) {
		//spin1.freeSpin( spin2.θ, spin2 )
		if( zero ) break;
		zero = a;
		for( let o of a ) {
			//spin1.exp( o.quaternion );
			o.update( delta );
		}
	}
}



function updateBalls( arr, gameSet, delta ) {
	let zero = null;
	for( let spot of gameSet )
		spot.update( delta );
	if(0)
	for( let a of arr ) {
		//spin1.freeSpin( spin2.θ, spin2 )
		if( zero ) break;
		zero = a;
		for( let o of a ) {
			//spin1.exp( o.quaternion );
			o.update( delta );
		}
	}
}

function initGeometry( viewer ) {
	const arr1 = [];
	const numberArr = [];
	const backs = [];

	const flat = []; // these are vertices of 1/2 ball projection.
	const white = new THREE.Color(1,1,1);	

	const radius = 8;
	const ringsegs = 36;

	for( let th = 0; th < ringsegs; th++ ) {
		const ring = [];
		flat.push(ring);
		for( let gm = 0; gm <= radius; gm++ ) {
			const r = (gm /radius);
			const c = (th /ringsegs)*Math.PI*2;

			const x = Math.cos(c)*r;
			const y = Math.sin(c)*r;
			ring.push( { uv : new THREE.Vector2( 0.5+0.95*Math.cos(c)*r/2, 0.5+0.95* Math.sin(c)*r/2 )
							, point : new THREE.Vector3( x, y, Math.sqrt(1 - (x*x+y*y) ) )
						} );
		}
	}


	function buildHalfBall( ) {
		const geometryHalfBall = new THREE.Geometry( );

		const verts = geometryHalfBall.vertices;
		const faces = geometryHalfBall.faces;
		geometryHalfBall.faceVertexUvs[0] = [];
		const uvs = geometryHalfBall.faceVertexUvs[0];

		for( let th = 0; th < ringsegs; th++ ) {
			const ring = flat[th];
			const ring2 = flat[(th+1)%ringsegs];
			for( let gm = 0; gm < (radius); gm++ ) {
				const p1 = ring[gm];
				const p2 = ring2[gm];
				const p3 = ring[gm+1];
				const p4 = ring2[gm+1];
	   
					const np = verts.length;
					verts.push( p1.point );
					verts.push( p4.point );
					verts.push( p2.point );
					faces.push( new THREE.Face3( np, np+1, np+2, p1.point, white ) );
					uvs.push( [p1.uv, p4.uv, p2.uv] );
	   
					verts.push( p1.point );
					verts.push( p3.point );
					verts.push( p4.point );
					faces.push( new THREE.Face3( np+3, np+3+1, np+3+2, p1.point, white ) );
					uvs.push( [p1.uv,p3.uv,p4.uv ]);
				
			}
		}
		return geometryHalfBall;
	}
		const back = buildHalfBall();
	for( let n = 0; n < 5; n++ )
	{

	        
			const materialNormal = new THREE.MeshNormalMaterial();
			const material = new THREE.MeshPhongMaterial( {vertexColors:THREE.VertexColors, side:THREE.DoubleSide, color: 0x80808080} );
	        
			material.transparent = true
			material.needsUpdate = true;
	        
			const ball = new THREE.Mesh( back, material );
	        
			material.map = backImages[n];
			//console.log( "Set map texture...", material.map );
	        
			//ball.position.set( (n-3)*1, 0, 0.0);
			viewer.scene.add( ball )
			ball.visible = false;
			//arr.push( ball );
			backs.push( ball );
	}


   const grid = []; // these are vertex points for grid geometry

	const lnQ1 = new lnQuat();
	const range = deg2rad(45);
	const step = (range/2)/32;

	//c reate geometry.
	for( let theta = -(range); theta <= (range); theta += (step) ){
		const gridRow = [];
		grid.push( gridRow );
		//const draw = p.length;
		//const draw2 = p2.length;
		
		//gamline = 0;
		for( let gamma = -(range); gamma <= (range); gamma += (step) ){
			const g2 = gamma;
			const t2 = theta;

			const gridlen = Math.sqrt(g2*g2+t2*t2);

			pMake( lnQ1, t2, g2, null);
			const up = lnQ1.up();
			const tmp = up.y;
			up.y = up.z;
			up.z = tmp;
			gridRow.push( up );
		}
	}

	var light	= new THREE.AmbientLight( 0.8 * 0xffffff );
	viewer.scene.add( light );

	if(1) {
	// here you add your objects
	// - you will most likely replace this part by your own
	var light	= new THREE.PointLight( 0.8 * 0xffffff );
	//light.position.set( Math.random(), Math.random(), Math.random() ).normalize();
	light.position.set( Math.random(), Math.random(), Math.random() ).normalize();
	light.position.multiplyScalar(40);
	viewer.scene.add( light );

	var light2	= new THREE.PointLight( 0.8 * 0xffffff );
	//light.position.set( Math.random(), Math.random(), Math.random() ).normalize();
	light2.position.copy( light.position );
	light2.position.z = -light2.position.z;
	light2.position.y = -light2.position.y;
	light2.position.x = -light2.position.x;
	viewer.scene.add( light2 );
	}



		const geometrySquare = new THREE.Geometry( );

		const verts = geometrySquare.vertices;
		const faces = geometrySquare.faces;
		geometrySquare.faceVertexUvs[0] = [];
		const uvs = geometrySquare.faceVertexUvs[0];
		
		const xdiv = grid.length;
		const xlen = grid.length-1;
		const ydiv = grid[0].length;
		const ylen = grid[0].length-1;

		for( let x = 0; x < xlen; x++ ) {
			const row = grid[x];
			const row1 = grid[x+1];
			for( let y = 0; y < ylen; y++ ) {
				const v1 = row1[y];	
				const v2 = row[y];	
				
				const v3 = row1[y+1];	
				const v4 = row[y+1];	
				const p1 = verts.length;
				verts.push( v1 );
				verts.push( v4 );
				verts.push( v2 );
				uvs.push( [new THREE.Vector2( x / xdiv, y / ydiv )
					
					, new THREE.Vector2( (x) / xdiv, (y+1) / ydiv ),new THREE.Vector2( (x+1) / xdiv, y / ydiv )] );
				faces.push( new THREE.Face3( p1, p1+1, p1+2, v1, white ) );

				verts.push( v1 );
				verts.push( v3 );
				verts.push( v4 );
				uvs.push( [new THREE.Vector2( (x) / xdiv, y / ydiv ) 
					, new THREE.Vector2( (x) / xdiv, (y+1) / ydiv ) 
					,new THREE.Vector2( (x+1) / xdiv, (y+1) / ydiv ) ]);
				faces.push( new THREE.Face3( p1+3, p1+3+1, p1+3+2, v1, white ) );
			}
		}


		geometrySquare.colorsNeedUpdate = true;
		geometrySquare.verticesNeedUpdate  = true;
		geometrySquare.elementsNeedUpdate   = true;
		geometrySquare.uvsNeedUpdate = true;



	for( let x = 0; x < 15; x++ ) {
		for( let y = 0; y < 6; y++ ) {
			const xdiv = grid.length;
			const xlen = grid.length-1;
			const ydiv = grid[0].length;
			const ylen = grid[0].length-1;
	   

			const ulx = x/15;
			const xinc = (1/15)/xlen;
			const uly = y/6;
			const yinc = (1/6)/ylen;

			const geometryNumber = new THREE.Geometry();

			const verts = geometryNumber.vertices;
			const faces = geometryNumber.faces;
			geometryNumber.faceVertexUvs[0] = [];
			const uvs = geometryNumber.faceVertexUvs[0];
			
			for( let x = 0; x < xlen; x++ ) {
				const row = grid[x];
				const row1 = grid[x+1];
				for( let y = 0; y < ylen; y++ ) {
					const v1 = row1[y];	
					const v2 = row[y];	
					
					const v3 = row1[y+1];	
					const v4 = row[y+1];	
					const p1 = verts.length;
					verts.push( v1 );
					verts.push( v4 );
					verts.push( v2 );
					uvs.push( [new THREE.Vector2( ulx + xinc*x, uly+yinc*y ),
					  new THREE.Vector2( ulx + xinc*(x+1), uly+yinc*(y+1) ),
						new THREE.Vector2( ulx + xinc*(x+1), uly+yinc*y ) ] );
					faces.push( new THREE.Face3( p1, p1+1, p1+2, v1, white ) );
	   
					verts.push( v1 );
					verts.push( v3 );
					verts.push( v4 );
					uvs.push( [new THREE.Vector2( ulx + xinc*x, uly+yinc*y ),
					  new THREE.Vector2( ulx + xinc*x, uly+yinc*(y+1) ),
						new THREE.Vector2( ulx + xinc*(x+1), uly+yinc*(y+1) ) ]);
					faces.push( new THREE.Face3( p1+3, p1+3+1, p1+3+2, v1, white ) );
				}
			}
	   



			{
	   	     
				const materialNormal = new THREE.MeshNormalMaterial();
				const material = new THREE.MeshPhongMaterial( {vertexColors:THREE.VertexColors, color: 0x80808080} );
	   	     
				material.transparent = true
				material.needsUpdate = true;
	   	     
				const ball = new THREE.Mesh( geometryNumber,  material );
	   	     
				material.map = numberImage;
				//console.log( "Set map texture...", material.map );
			
			//viewer.scene.add( ball );	   	     
				//ball.position.set( (n-3)*1, 0, 0.0);
				numberArr.push( ball );
			}
			
		}
	}
	
		//console.log( "made:", numberArr );

	for( let n = 0; n < backImages.length; n++ ) {
		const arr = [];
		arr1.push(arr);
		const tex = backImages[n];
		for( let c = 0; c < 3; c++ ) {
	        
			const materialNormal = new THREE.MeshNormalMaterial();
			const material = new THREE.MeshPhongMaterial( {vertexColors:THREE.VertexColors, color: 0x80808080} );
	        
			material.transparent = true
			material.needsUpdate = true;
	        
			const ball = new THREE.Mesh( geometrySquare, material );
	        
			material.map = images[n];
			//console.log( "Set map texture...", material.map );
	        
			//ball.position.set( (n-3)*1, 0, 0.0);
			viewer.scene.add( ball )
			ball.visible = false;
			//arr.push( ball );
			viewer.scene.add( numberArr[n*3+c] )
numberArr[n*3+c].visible = false;
			if( n < 4 ) 
			arr.push( numberArr[n*3+c] );
		else
			arr.push( backs[c] );
		}
	}


	return arr1;
	
}






	function pMake(q, x, y, o ){
		
		{
			// use parameters to directly make and transform a point without 3 function calls
			const qlen = Math.sqrt(x*x + y*y);

			const qnx = qlen?x / qlen:1;
			const qny = 0;
			const qnz = qlen?y / qlen:0;

			// local 'finishRodrigues'
			if( o ) {
				const ax = o.nx
				const ay = o.ny
				const az = o.nz
				const oct = 0;//Math.floor( o.θ / (Math.PI*2) ); 
				const th = o.θ % (Math.PI*2);
			        
				{ // finish rodrigues
					const AdotB = (qnx*ax + /*q.ny*ay +*/ qnz*az);
				
					const xmy = (th - qlen)/2; // X - Y  (x minus y)
					const xpy = (th + qlen)/2  // X + Y  (x plus y )
					const cxmy = Math.cos(xmy);
					const cxpy = Math.cos(xpy);
					const cosCo2 = ( ( 1-AdotB )*cxmy + (1+AdotB)*cxpy )/2;
				
					let ang = Math.acos( cosCo2 )*2;
					// only good for rotations between 0 and pi.
				
					if( ang && ang != Math.PI*2 ) {
						const sxmy = Math.sin(xmy); // sin x minus y
						const sxpy = Math.sin(xpy); // sin x plus y
				
						const ss1 = sxmy + sxpy
						const ss2 = sxpy - sxmy
						const cc1 = cxmy - cxpy
				
						// these have q.ny terms remove - q.ny is 0.
						const Cx = ( (ay*qnz       ) * cc1 +  ax * ss1 + qnx * ss2 );
						const Cy = ( (az*qnx-ax*qnz) * cc1 +  ay * ss1             );
						const Cz = ( (      -ay*qnx) * cc1 +  az * ss1 + qnz * ss2 );
			        
						const Clx = 1/Math.sqrt(Cx*Cx+Cy*Cy+Cz*Cz);
						
						q.θ  = ang + currentOctave * 4*Math.PI;;
						q.nx = Cx*Clx;
						q.ny = Cy*Clx;
						q.nz = Cz*Clx;
						
						q.x  = q.nx*ang;
						q.y  = q.ny*ang;
						q.z  = q.nz*ang;
				
						q.dirty = false;
					} else {
						// result is 0 angular rotation... normal doesn't matter.
						q.x = q.y = q.z = 0;
						q.nx = q.nz = 0;
						q.ny = 1;
						q.θ = 0;
						q.dirty = false;
					}
				}
	
			} else {
				q.x = ( q.nx = qnx ) * qlen;
				q.y = ( q.ny = qny ) * qlen;
				q.z = ( q.nz = qnz ) * qlen;
				q.θ = qlen;
				q.dirty = false;
			}
		}
		return q;
	}



function ColorAverage255( a, b, i,m) {

var c = [ (((b[0]-a[0])*i/m) + a[0]),
	(((b[1]-a[1])*i/m) + a[1]),
	(((b[2]-a[2])*i/m) + a[2]),
	(((b[3]-a[3])*i/m) + a[3])
			]
//c[3] -= c[1];
//console.log( "color: ", a, b, c, i, ((b[1]-a[1])*i/m)|0, a[1], ((b[1]-a[1])*i/m) + a[1] )
return c;//`#${(c[0]<16?"0":"")+c[0].toString(16)}${(c[1]<16?"0":"")+c[1].toString(16)}${(c[2]<16?"0":"")+c[2].toString(16)}`
}
		
		
function ColorAverage( a, b, i,m) {

    var c = [ (((b[0]-a[0])*i/m) + a[0])/255,
        (((b[1]-a[1])*i/m) + a[1])/255,
        (((b[2]-a[2])*i/m) + a[2])/255,
		(((b[3]-a[3])*i/m) + a[3])/255
             ]
    //c[3] -= c[1];
    //console.log( "color: ", a, b, c, i, ((b[1]-a[1])*i/m)|0, a[1], ((b[1]-a[1])*i/m) + a[1] )
    return c;//`#${(c[0]<16?"0":"")+c[0].toString(16)}${(c[1]<16?"0":"")+c[1].toString(16)}${(c[2]<16?"0":"")+c[2].toString(16)}`
}


function getColor2( here ) {
	here = (here - 0.8)/0.4;
	for( var r = 1; r < RANGES_THRESH.length; r++ ) {
			if( here <= RANGES_THRESH[r] ) {
				return ColorAverage( RANGES[r-1], RANGES[r+0], (here-RANGES_THRESH[r-1])/(RANGES_THRESH[r+0]-RANGES_THRESH[r-1]) * 1000, 1000 );
			}
	}
	// somehow out of range.
	return BASE_COLOR_WHITE;
}

function getColor( here ) {
	//here = (here - 0.8)/0.4;
	for( var r = 1; r < RANGES_THRESH.length; r++ ) {
			if( here <= RANGES_THRESH[r] ) {
				return ColorAverage( RANGES[r-1], RANGES[r+0], (here-RANGES_THRESH[r-1])/(RANGES_THRESH[r+0]-RANGES_THRESH[r-1]) * 1000, 1000 );
			}
	}
	// somehow out of range.
	return BASE_COLOR_WHITE;
}

function deg2rad(x) { return x * Math.PI / 180.0 }

