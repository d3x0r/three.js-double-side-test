
import * as THREE from "./three.js/three.module.js"
import { newImage,addWork, moreWork } from "./imageLoader.js"
import {lnQuat} from "./lnQuat.mjs"
import {Vector} from "./math_config.mjs"


let resume_next_frame = false;
let pause = true;
let paused = false;
let globalScalar = 1.0;
const gameSet = [];  // all of the balls that might be displayed
const wantHideBall = [];
let viewer_ = null;
let viewer_go = null;
let wantSpin = false;
const pathParts = location.pathname.split('/');
//pathParts[pathParts.length-1] = "assets/numbers.anim.jsox";
let config = null;
import( "/images/balls/config.ball.js" ).then( (info)=>{
	info = info.default;
	config = info;
	

	if( viewer_ ) {
		runInit();
	}


} );


async function runInit() {

	images = config.imageNames.map( n=>config.imagePath+n ).map( (i)=> new THREE.Texture(newImage(i)) );
	ringImages = config.ringNames.map( n=>config.imagePath+n ).map( (i)=> new THREE.Texture(newImage(i)) );
	backImages = config.backNames.map( n=>config.imagePath+n ).map( (i)=> new THREE.Texture(newImage(i)) );
	numberImage =  new THREE.Texture(newImage( config.numberImageName ));


	addWork( async ()=>{

	ballBodies = await initGeometry( viewer_ );

	for( let n = 0; n < 75; n++ )  {
		
		wantStops.push(0);
		wantShows.push(0);
		const newBall = new Ball(gameSet.length+1, gameSet )
		//initGeometry( viewer_, newBall );
		gameSet.push( newBall );
		newBall.scale = 1920/43 * 1;
		newBall.position.set( ((n)%2) * newBall.scale*2 + 7*newBall.scale + ( (Math.floor(n/2)+1) % 2) * newBall.scale
						, (Math.floor( n / 2 ) * newBall.scale*1.75+ 2.3*newBall.scale)
						, 0 );
		if( wantHideBall[gameSet.length-1])
			newBall.hide();
	}
	if( viewer_go )
		viewer_go();
	})
	//requestAnimationFrame(animate);
	addWork( doWork );

}

let images = null;
let ringImages = null;
let backImages = null;
let numberImage = null;

const balls = [];
const wantStops = [];
const wantShows = [];

let ballBodies = null;
const usedBack = [];
const usedNum = [];
const usedRing = [];
const usedIcon = [];

//const spin1 = new lnQuat();
//const spin2 = new lnQuat( 0, 0.05, 0.00, 0.00 );

function shuffleBalls( arr, mustUse ) {
	const from = mustUse?mustUse.length:0;
	let i;
	if( mustUse ) {
		for( i = 0; i < mustUse.length; i++ ) arr[i] = mustUse[i];
		for( let n = 0; n < 75; n++ ) {
			if( mustUse.findIndex( b=>n===b ) > -1 ){
				continue;
			}
			arr[i++] = n;
		}
	}

	for( let round = 0; round < 2; round++ ) // add rounds to the shuffle.
	for( let i = from; i < arr.length; i++ ) {
		const r = Math.floor(Math.random()* (arr.length-from))+from;
		if( r != i ) {
			const tmp = arr[r];
			arr[r] = arr[i];
			arr[i] = tmp;
		}
	}
}

const cardBalls  =[];
let nextCardBall = 0;
for( let i = 0; i < 75; i++ ) {
	cardBalls.push( i );
}
shuffleBalls( cardBalls, null )

class Ball {
	body = null;
	ballNum = 0;

	spin1_1 = new lnQuat( 0, 0, 0, -Math.PI/2);
	//spin1_1_ = new lnQuat( 0, 0, 0, -Math.PI/2);
	spin1_2 = new lnQuat( 0, 0.05, 0.00, 0.00 ); // the rotation vector to spin around - changes...
	spin1_3 = new lnQuat();//this.spin1_2.set( 0, 0, 0, this.spinStop );

	body2 = null;
	spin2_1 = new lnQuat( 0, Math.PI, 0, -Math.PI/2);
	spin2_2 = new lnQuat( 0, 0.05, 0.00, 0.00 );

	body_n = 0;
	body2_n = -1;

	body3 = null;
	body3_n = 0;

	col = 0;
	speed = 0.65 + Math.random()*0.1;
	spin0 = 0; // real spin counter
	swapped = false;
	gameSet = null;
	used = [];
	ticks = 0;
	xx = 0;

	stop = false;
	stopping = false;
	stopped = false;
	stopSymbol = -1;
	spinStop = 0;
	spinDel = 0;
	rightStop = 0.4;
	leftStop = 0.4;

	hidden= false;
	wantHide = 0;
	wantShow = 0;
	wantHideStart = 0;
	wantShowStart = 0;

	position = Vector.new( 0,0,0 );
	scale = 0.5;
	cb = null;
	//ballBodies = initGeometry( viewer_, this );

	constructor(col,gameSet) {
		this.gameSet = gameSet;

		this.ballNum = col;
		//this.balls = balls;
		this.col = col;
		this.newSpin(0);
		this.newSpin(2);
		this.newSpin(1);
	}


	newSpin(b) {
		const d = Math.random(); // random spin angle 0 to 1 rotation.
		if( b === 0 ) {
			this.speed = (0.45 + Math.random()*0.8);  // pick a new spin speed
			// when dropping, the previos ballNum is already updated to the proper next state...
			// at this point, the back should be forward for the current ball, and this
			// is the old state being dropped.
			if( this.body ) {
				if( this.body_n >= 10 ) {
					this.dropGem( ballBodies.arrNum, usedNum, this.body_n-10, this.body );
				}else {
					this.dropGem( ballBodies.arrBack, usedBack, this.body_n, this.body );
				}
				this.body = null;
			}

			if( (!this.stop) || this.ballNum != this.stopSymbol ) {
				// update body_n as a back... the current ballNum hasn't had the prop
				// back shown yet.
				this.body_n = Math.floor((this.ballNum)/15);
			} else {
				// update body_n number.
				this.body_n = this.ballNum+ 10;
			}
			if( !this.hidden ) {
				if( this.body_n >= 10 ) {
					this.body = this.getGem( ballBodies.arrNum, usedNum, this.body_n - 10 );
				}else {
					//console.log( "Get back:", this.body_n, this.ballNum )
					this.body = this.getGem( ballBodies.arrBack, usedBack, this.body_n );
				}
			}
		        
			this.spin1_2.set( 0, Math.PI*Math.cos(d*2*Math.PI), Math.PI*Math.sin(d*2*Math.PI), 0 );
		} else if( b === 1 ) {
			if( this.body2 ) {
				this.dropGem( ballBodies.arrBack, usedBack, this.body2_n, this.body2 );
				this.body2= null;

				//console.log( "Dropping body2" )
			}
			// when we pick a new pack, pick/set the new ball.
			if( this.stop ) {
				this.stopping = true;
				//console.log( "zball was:", this.ballNum, "and stop at", this.stopSymbol )
				this.ballNum = this.stopSymbol;
			} else {
				
				this.ballNum = cardBalls[nextCardBall++];
				if( nextCardBall == cardBalls.length ){
					const usedBalls = [];//cardBalls.slice( 75-24, 75 );
					nextCardBall = 0;
					//console.log( "usedBalls:", usedBalls.length)
					//nextCardBall = 24;
					// ^^ previously skip the first 24 ^^

					shuffleBalls( cardBalls, usedBalls );
				}
				//console.log( "swapping the back, picking a new number for the ball")
				//((Math.random() * 75)|0);
			}
			if( !this.hidden ) {
				this.body2_n = Math.floor((this.ballNum)/15) ;
				this.body2 = this.getGem( ballBodies.arrBack, usedBack, this.body2_n );
			}
			// set the spin axis to a new direciton to rotate from
			this.spin2_2.set( 0, Math.PI*Math.cos(d*2*Math.PI), Math.PI*Math.sin(d*2*Math.PI), 0 );
		} else if( b === 2 ) {
			if( this.body3 ) {
				//console.log( "get ring" );
				this.dropGem( ballBodies.arrRing, usedRing, this.body3_n -5, this.body3 );
				this.body3= null;
			}
			if( !this.hidden ) {
				this.body3_n = (Math.floor((this.ballNum)/15))+5;
				//console.log( "picked body", this.body3_n-5, this.body_n-(10+imageNames.length) );

				this.body3 = this.getGem( ballBodies.arrRing, usedRing, this.body3_n -5 );
				if( (!this.stop)  || this.ballNum != this.stopSymbol )
					if( this.body3 )
						this.body3.visible = false;
			}
			//this.spin2_2.set( 0, Math.PI*Math.cos(d*2*Math.PI), Math.PI*Math.sin(d*2*Math.PI), 0 );
		} else {
		}



	}

 getGem(balls,used, n) {
	//console.log( "Getting symbol:", used, n, this.ballNum )
	balls = balls[n];
	if( balls ) {
		const useIdx = used[n].findIndex(n=>n===false);
		if( useIdx >= 0 ){
			const ball = balls[useIdx];
			used[n][useIdx] = true;
			if( !this.hidden )
				ball.visible = true;
			return ball;
		}
		console.trace( "Too many used:", used[n].length, n );
	} return null;	
}

 dropGem(balls, used, n,ball) {
	//console.log( "DROPPING symbol:", n, ball );
	if( ball ) {
		balls = balls[n];
		for( let useIdx = 0; useIdx < balls.length; useIdx++ ) 
			if( balls[useIdx]===ball) {
				used[n][useIdx] = false;
				break;
			}
		
		ball.visible = false;	
	}
}
	stopWith(cb ) {
		if( this.stopped ) {
			//console.log( "Already stopped...");
			cb();
		} else 
			this.cb = cb;
	}
	stopAt( m ) {
		console.log( "Stop at - now", this.hidden, this.col, m, this.stop, this.stopped);

		if( !this.stop ) {
			this.stop = true;
			if( this.stopSymbol != (m-1) ) {
				this.stopSymbol = (m-1);
				//console.log( "Stop At set", this.col, m );
				if( this.swapped ) {
					console.log( "Showing the number face still..." );
					this.ballNum = this.stopSymbol
					this.newSpin( 1 );
					this.swapped = false;
					this.newSpin( 0 );
					this.newSpin( 2 );
				}
			}
		}
	}


	hide() {
		this.scale = 0;
		this.position.x = -1000;
		//this.swapped = true;
		//this.wantHide = (this.wantHideStart = Date.now()) + 500;
		//console.log( "Setting want hide:", this.wantHide, this.wantShow );
	}

	show() {
		this.spin();
		this.wantShow = (this.wantShowStart = Date.now() ) + 500;
		this.wantHide = 0;
		this.hidden = false;
		//console.log( "Logging show (0):", Date.now() - this.wantShowStart  )
	}

	spin() {
		if( this.hidden)  {
			this.spin0 = 0;
			this.swapped = false;
			this.body2_n = Math.floor((this.ballNum)/15) ;
			this.body2 = this.getGem( ballBodies.arrBack, usedBack, this.body2_n );
			this.hidden = false;
		}
		this.speed = 1.35 + Math.random()*1;  // pick a new spin speed
		this.stop = false;
		this.stopping = false;
		this.stopSymbol = -1;
		if( this.stopped ) {
			// pick a new back...
			this.newSpin(1);
		}
		this.stopped = false;
		const d = Math.random();
		this.spin1_2.set( 0, Math.PI*Math.cos(d*2*Math.PI), Math.PI*Math.sin(d*2*Math.PI), 0 );
	}



	update( delta ) {
		//return;
		delta = delta/1000;

		//let log = false;
		const start = Date.now();
		const speed = this.speed;

		
		if( this.stopped ) {
			
			this.spinStop += this.spinDel *delta;
			
				if( this.spinStop > this.rightStop ) {
					this.speed = 0.1 + Math.random( 0.3 );
					this.leftStop = -(Math.random()*0.085+0.1);
					this.spinDel = -0.01 + -0.2*Math.random();
				}
				if( this.spinStop < this.leftStop ) {
					this.speed = 0.1 + Math.random( 0.3 );
					this.rightStop = (Math.random()*0.085+0.1);
					this.spinDel = 0.01 + 0.2*Math.random();
				}
//			this.spin0 = 0;

		}
		else 
			this.spin0 += globalScalar * 10 * speed * delta;

		if( !this.swapped && this.spin0 > (Math.PI) ) {
			this.swapped = true;
			//console.log( "Picking new front faces, keeps rotating the other half pi to get the back forward..." );
			this.newSpin( 0 );
			this.newSpin( 2 );
			//log = true;
		}
		if( !this.stopped ) {
			this.spin1_1.set( 0, 0,0,-Math.PI/2).freeSpin( this.spin0 , this.spin1_2 );
			this.spin2_1.set( 0, 0,0,-Math.PI/2).freeSpin( Math.PI+this.spin0 , this.spin1_2 );
		} else {
			this.spin1_3.set( 0, 0, 0, this.spinStop );
			this.spin1_1.set( 0, 0,0,-Math.PI/2 );
			this.spin2_1.set( 0, -Math.PI,0,0 );

			this.spin1_1.freeSpin( this.spin1_3.θ , this.spin1_3 );
			this.spin2_1.freeSpin( this.spin1_3.θ , this.spin1_3 );
		}
		
		{		
			if( this.spin0 > Math.PI*2)  {
				this.spin0 -= Math.PI*2;
				if( this.stopping ) {
					//console.log( "Ball stopped:", this.col, this.ballNum, this.stopSymbol, this.cb)
					//this.stopped = 1;
					if( this.cb ) {
						this.cb(); this.cb = null;
					}
					this.spinDel = 0.01 + (1- 2*Math.random()) * 0.5;
					this.spinStop = 0;
					//this.spin1_1_.set( 0, this.spin1_1.x,this.spin1_1.y,this.spin1_1.z);
				}else {
					this.swapped = false;
					//if( !this.stop && !this.stopped && !this.stopping)
					this.newSpin( 1 );
					//log = true;
				}
			} 
		}
		if( this.body ) {
			this.spin1_1.exp( this.body.quaternion );
			this.body.position.set( this.position.x, this.position.y, this.position.z );
			this.body.scale.set( -this.scale, -this.scale, this.scale );
		}
		if( this.body3 ) {
			// ths is the ring.
			this.spin1_1.exp( this.body3.quaternion );
			this.body3.position.set( this.position.x, this.position.y, this.position.z );
			this.body3.scale.set( -this.scale, -this.scale, this.scale );
		}

		if( this.body2 ) {
			this.spin2_1.exp( this.body2.quaternion );
			this.body2.position.set( 100+this.position.x, this.position.y, this.position.z );
			this.body2.scale.set( -this.scale, -this.scale, this.scale );
		}

		
			if( start < this.wantHide ){
				//console.log( "hide is set too?" );
				this.wantShow = 0;
				const dist = 1 / (200*( 1 - (this.wantHide - start)/(this.wantHide-this.wantHideStart) ));
				this.scale = dist;

				//this.body.position.set( this.position.x, this.position.y, -200 * ( 1 - (this.wantHide - start)/(this.wantHide-this.wantHideStart) ) );
				//this.body2.position.set( this.position.x, this.position.y, -200 * ( 1 - (this.wantHide - start)/(this.wantHide-this.wantHideStart) ) );
				//this.body3.position.set( this.position.x, this.position.y, -200 * ( 1 - (this.wantHide - start)/(this.wantHide-this.wantHideStart) ) );
			} else if( this.wantHide ) {
				//console.log( "Hidden entirely - HIDE" );
				this.wantShow = 0;
				if( this.body )
					this.body.position.set( this.position.x, this.position.y, -200 );
				if( this.body2 )
					this.body2.position.set( this.position.x, this.position.y, -200 );
				if( this.body3 )
					this.body3.position.set( this.position.x, this.position.y, -200 );

				if( this.body )
					this.body.visible = false;
				if( this.body2 )
					this.body2.visible = false;
				if( this.body3 )
					this.body3.visible = false;

				this.wantHide = 0;
				
				this.hidden = true; // stop making them visible...
			}
			else if( start < this.wantShow ){
				this.hidden = false;  // start making them visible...
				const dist = -200 * (this.wantShow - start)/(this.wantShow-this.wantShowStart);
				//console.log( "Logging show:", start - this.wantShowStart, dist  )
				if( this.body )
					this.body.visible = true;
				if( this.body3)
					this.body3.visible = true;
				if( this.body2 )
					this.body2.visible = true;
				if( this.body )
					this.body.position.set( this.position.x, this.position.y, dist );
				if( this.body2 )
					this.body2.position.set( this.position.x, this.position.y, dist );
				if( this.body3 )
					this.body3.position.set( this.position.x, this.position.y, dist );
			} else if( this.wantShow ) {
				this.wantShow = 0;
				console.log( "Skipped to thing", start, this.wantShow );
				if( this.body ){
					this.body.visible = true;
					this.body.position.set( this.position.x, this.position.y, 0 );
				}
				if( this.body3 ) {
					this.body3.visible = true;
					this.body3.position.set( this.position.x, this.position.y, 0 );
				}
				if( this.body2 ){
					this.body2.visible = true;
					this.body2.position.set( this.position.x, this.position.y, 0 );
				}
			}
	}

	
	
};

	


function doWork() {

	images.forEach( i=>i.needsUpdate = true);
	ringImages.forEach( i=>i.needsUpdate = true);
	backImages.forEach( i=>i.needsUpdate = true);
	numberImage.needsUpdate = true;

	for( let stop = 0; stop < wantShows.length; stop++ ) {
		if( wantShows[stop] ) {
			gameSet[stop].show(wantShows[stop]-1);
			gameSet[stop].stopAt( wantShows[stop]-1);
		}
	}
	if( wantSpin ) {
		ballInterface.spin();
	}
}


const ballInterface = {
	stopWith(n, cb ){
		if( n < gameSet.length ) {
			gameSet[n].stopWith( cb );
		}
	},
	setSpeed( speed ) {
		globalScalar = 0.5+Math.pow(3,(6-speed)/4 );
		//console.log( "Speed is:", globalScalar );
	},
	stopAt(n, m) {
		if( n < gameSet.length )
			gameSet[n].stopAt( m );
		else wantStops[n] = m+1;
	},
	spin() {
		if( !gameSet.length) wantSpin = true;
		for( let set of gameSet )
			set.spin();
	},
	spin1(n) {
		if( gameSet.length )
			gameSet[n].spin();
	},

	hide(n) {
		if( n < gameSet.length )
			gameSet[n].hide();
		else
			wantHideBall[n] = true;
	},
	show(n,m) {
		if( n < gameSet.length ) {
			gameSet[n].show(m);
			console.log( "And set to STOP:", m)
			gameSet[n].stopAt( m );
		} else 
			wantShows[n] = m+1;
	},
	scaleTo( n, z ) {
		if( n < gameSet.length ) {
			if( z ) gameSet[n].scale = 1920/43 * 1*z; else gameSet[n].scale = 1920/43 * 1;
		} else {
			console.log( 'no ball, defer move?' );
		}
	},
	moveTo( n, x, y, z ) {
		if( n < gameSet.length ) {
			gameSet[n].position.set( (710-x*1790/1000), (70+y*990/1000), 0 );
		//	if( z ) gameSet[n].scale = 1920/43 * 1*z; else gameSet[n].scale = 1920/43 * 1;
		} else {
			console.log( 'no ball, defer move?' );
		}
		
	}
}

export function getBallInterface() {
	return ballInterface;
}



export function setupWorldView( canvas ) {
	var viewer = {
		canvas: canvas,
		renderer : null,
		scene : new THREE.Scene(),
		camera : null,
		controls : null,
		ballObject : null,
		onAnimate: null,
	};
	canvas.style.width="-webkit-fill-available";
	canvas.style.height="-webkit-fill-available";

	canvas.style. pointerEvents= "none";
	document.addEventListener("visibilityChange", (evt)=>{ 
		if( evt.visibilityState === "visible" ) {
			resume_next_frame = true; // resets the now timer to now.
			pause = false;
			if( paused ) 	requestAnimationFrame(animate);
			console.log( "view2 resuming" );
		} else {
			pause = true;
			console.log( "view2 pausing" );
		}
	}, false);


	viewer_ = viewer;
		viewer.renderer = new THREE.WebGLRenderer( { canvas: viewer.canvas
				//, depth:false
				//, autoClear:true
				//,autoClearDepth:true
				, angialias:true
				, alpha:true 
			} );
		viewer.camera = new THREE.OrthographicCamera( 0, 1920, 0, 1080, 0.1, 10000 );
		//new lnQuat( Math.PI/2,{x:0,y:1,z:0} ).exp( viewer.camera.quaternion );
		viewer.camera.rotation.y = Math.PI;
		viewer.camera.position.x = 760;
		viewer.camera.position.y = 25;
		viewer.camera.position.z = 20;
		viewer.scene.add(viewer.camera);
		initLights( viewer );


	let start = 0;
	let sec = 0;
	function animate(ts) {
		if( pause ) {
			paused = true;
			return;
		}
		if( viewer.onAnimate )
			viewer.onAnimate();
		const now = Date.now();
		if( !start || resume_next_frame ) {
			start = ts - 16.6;
			resume_next_frame = false;
		}
		let delta = ts-start;
		if( delta > 120 ) delta = 120;
		start = ts;
		if(0)
		if( ((start / 1000)|0) != sec ) {
			console.log( "camera:", viewer.camera.position );
			sec = (start / 1000)|0;
		}
		//var delta = clock.getDelta();
		//viewer.camera.updateWorldMatrix();	        
		updateBalls( null, gameSet, delta );
		//viewer.controls.update(delta);
		//viewer.renderer.clear();
		viewer.renderer.render( viewer.scene, viewer.camera );

        requestAnimationFrame(animate);
	}
	if( config ) runInit();

	viewer_go = ()=>{
		pause = paused = false;
		requestAnimationFrame(animate);
	}

	return viewer;
}

function updateGame( arr, delta ) {	
	
	let zero = null;
	for( let a of arr ) {
		//spin1.freeSpin( spin2.θ, spin2 )
		if( zero ) break;
		zero = a;
		for( let o of a ) {
			o.update( delta );
		}
	}
}



function updateBalls( arr, gameSet, delta ) {
	for( let spot of gameSet ) {
		spot.update( delta );
	}
}

const flat = []; // these are vertices of 1/2 ball projection.
const grid = []; // these are vertex points for grid geometry
let back = null;

function initLights( viewer ) {
	var light	= new THREE.AmbientLight( 0.6 * 0xffffff );
	viewer.scene.add( light );

	if(1) {
	// here you add your objects
	// - you will most likely replace this part by your own
	for( let l = 0; l < 10; l++ ) {
		var light	= new THREE.PointLight( 0xffffff, 0.3 );
		//light.position.set( Math.random(), Math.random(), Math.random() ).normalize();
		light.position.set( -800 + (l%5) * 400, 14 + 600 * Math.floor(l/5), 105 );
		//light.position.multiplyScalar(40);
		viewer.scene.add( light );
	
	}
	if(0){
	var light	= new THREE.PointLight( 0.8 * 0xffffff );
	//light.position.set( Math.random(), Math.random(), Math.random() ).normalize();
	light.position.set( -300, 340, 105 );
	//light.position.multiplyScalar(40);
	viewer.scene.add( light );
	}

	if(0) {
		var light2	= new THREE.PointLight( 0.8 * 0xffffff );
		//light.position.set( Math.random(), Math.random(), Math.random() ).normalize();
		light2.position.copy( light.position );
		light2.position.x = 502;
		light2.position.y = 340;
		light2.position.z = 105;
		viewer.scene.add( light2 );
		}
	}

}

function initGeometry( viewer ) {
	let resolve = null;
	let phase = 0;
	const arrBack = []; 
	const arrRing = []; 
	const arrNum = []; 
	const arrIcon = []; 
	//const numberArr = [];
	const bodies = {arrBack, arrRing, arrNum, arrIcon };

	const white = new THREE.Color(1,1,1);	
	const geometrySquare = new THREE.BufferGeometry( );

	const radius = 4;
	const ringsegs = 36;

	return new Promise( (res,rej)=>{
		resolve = res;
		setTimeout( doInit, 100 );

	})

	function doInit() {

		switch( phase ) {
			case 0:
	if( !flat.length )

		for( let th = 0; th < ringsegs; th++ ) {
			const ring = [];
			flat.push(ring);
			for( let gm = 0; gm <= radius; gm++ ) {
				const r = Math.sin((gm /radius)*Math.PI/2);
				const c = (th /ringsegs)*Math.PI*2;

				const x = Math.cos(c)*r;
				const y = Math.sin(c)*r;
				ring.push( { uv : new THREE.Vector2( 0.5+0.90*Math.cos(c)*r/2, 0.5+0.90* Math.sin(c)*r/2 )
								, point : new THREE.Vector3( x*0.995, y*0.995, Math.sqrt(1.000001 - (x*x+y*y) )*0.995 )
							} );
			}
		}
		phase++;
		break;
	case 1:
		if( !back )
			back = buildHalfBall();


	function buildHalfBall( ) {
		const geometryHalfBall = new THREE.BufferGeometry( );

		const verts = [];
		const norms = [];
		const uvs = [];

		for( let th = 0; th < ringsegs; th++ ) {
			const ring = flat[th];
			const ring2 = flat[(th+1)%ringsegs];
			for( let gm = 0; gm < (radius); gm++ ) {
				const from = verts.length;
				const p1 = ring[gm];
				const p2 = ring2[gm];
				const p3 = ring[gm+1];
				const p4 = ring2[gm+1];
					verts.push( p1.point.x, p1.point.y, p1.point.z )
					verts.push( p4.point.x, p4.point.y, p4.point.z )
					verts.push( p2.point.x, p2.point.y, p2.point.z )

					norms.push( p1.point.x, p1.point.y, p1.point.z )
					norms.push( p4.point.x, p4.point.y, p4.point.z )
					norms.push( p2.point.x, p2.point.y, p2.point.z )
					//faces.push( new THREE.Face3( np, np+1, np+2, [p1.point,p4.point,p2.point], white ) );
					uvs.push( p1.uv.x, p1.uv.y
							, p4.uv.x, p4.uv.y
							, p2.uv.x, p2.uv.y );
	   
					verts.push( p1.point.x, p1.point.y, p1.point.z )
					verts.push( p3.point.x, p3.point.y, p3.point.z )
					verts.push( p4.point.x, p4.point.y, p4.point.z )

					norms.push( p1.point.x, p1.point.y, p1.point.z )
					norms.push( p3.point.x, p3.point.y, p3.point.z )
					norms.push( p4.point.x, p4.point.y, p4.point.z )

					//faces.push( new THREE.Face3( np+3, np+3+1, np+3+2, [p1.point,p3.point,p4.point], white ) );
					uvs.push( p1.uv.x, p1.uv.y
							, p3.uv.x, p3.uv.y
							, p4.uv.x, p4.uv.y );
				
			}
		}

		geometryHalfBall.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );
		geometryHalfBall.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
		geometryHalfBall.setAttribute( 'normal', new THREE.Float32BufferAttribute( norms, 3 ) );

		//computeMikkTSpaceTangents(geometryHalfBall, mikktspace);

		return geometryHalfBall;
	}
	
		phase++;
		break;
	case 2:
	for( let n = 0; n < backImages.length; n++ )
	{
		const arr = [];
		arrBack.push( arr );
		// can only have at most 15 of a ball type out
		for( let copy = 0; copy < 45; copy++ ) {
			const material = new THREE.MeshPhongMaterial( {
				color: 0x909090
				, side: THREE.DoubleSide
				//, depthTest:false
				//, depthWrite : false
				, transparent : true
			} );
	        
			const ball = new THREE.Mesh( back, material );
	        
			material.map = backImages[n];
			//console.log( "Set map texture...", material.map );
	        
			//ball.position.set( (n-3)*1, 0, 0.0);
			viewer.scene.add( ball )
			ball.visible = false;
			arr.push( ball );
		}
	}

	phase++;
	break;
case 3:

	for( let n = 0; n < ringImages.length; n++ )
	{
		const arr = [];
		arrRing.push( arr );
		// can only have at most 15 of a ball type out
		for( let copy = 0; copy < 25; copy++ ) {
			//const materialNormal = new THREE.MeshNormalMaterial();
			const material = new THREE.MeshPhongMaterial( {
				color: 0xaaaaaa
				, transparent : true
				, depthTest:false
				, depthWrite : false
				, side: THREE.DoubleSide
			} );
	        
	        
			const ball = new THREE.Mesh( back, material );
	        
			material.map = ringImages[n];
			//console.log( "Set map texture...", material.map );
	        
			//ball.position.set( (n-3)*1, 0, 0.0);
			viewer.scene.add( ball )
			ball.visible = false;
			//arr.push( ball );
			arr.push( ball );
		}
	}



		phase++;
		break;
	case 4:
	const lnQ1 = new lnQuat();
	const range = deg2rad(45);
	const step = (range/2)/5;
	if( !grid.length )
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

{
		const verts = [];
		const norms = [];
		const uvs = [];
		
		const xdiv = grid.length;
		const xlen = grid.length-1;
		const ydiv = grid[0].length;
		const ylen = grid[0].length-1;

		for( let x = 0; x < xlen; x++ ) {
			const row = grid[x];
			const row1 = grid[x+1];
			for( let y = 0; y < ylen; y++ ) {
				const v1 = row[y];	
				const v2 = row[y+1];	
				
				const v3 = row1[y];	
				const v4 = row1[y+1];	
				//const p1 = verts.length;
				verts.push( v1.x, v1.y, v1.z )
				verts.push( v4.x, v4.y, v4.z )
				verts.push( v2.x, v2.y, v2.z )

				norms.push( v1.x, v1.y, v1.z )
				norms.push( v4.x, v4.y, v4.z )
				norms.push( v2.x, v2.y, v2.z )

				uvs.push(  (x) / xdiv, (y) / ydiv
					,  (x+1) / xdiv, (y+1) / ydiv 
					, (x) / xdiv, (y+1) / ydiv  );

				verts.push( v1.x, v1.y, v1.z )
				verts.push( v3.x, v3.y, v3.z )
				verts.push( v4.x, v4.y, v4.z )

				norms.push( v1.x, v1.y, v1.z )
				norms.push( v3.x, v3.y, v3.z )
				norms.push( v4.x, v4.y, v4.z )

				uvs.push(  (x) / xdiv, (y) / ydiv 
					,  (x+1) / xdiv, (y) / ydiv 
					, (x+1) / xdiv, (y+1) / ydiv  );

			}
		}

		geometrySquare.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );
		geometrySquare.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
		geometrySquare.setAttribute( 'normal', new THREE.Float32BufferAttribute( norms, 3 ) );

		geometrySquare.colorsNeedUpdate = true;
		geometrySquare.verticesNeedUpdate  = true;
		geometrySquare.elementsNeedUpdate   = true;
		geometrySquare.uvsNeedUpdate = true;
	}
		phase++;
		break;
	case 5:

	// this is the surface with the number (only 1 active ever)
	for( let y = 0; y < 6; y++ ) {
		for( let x = 0; x < 15; x++ ) {
			const xdiv = grid.length;
			const xlen = grid.length-1;
			const ydiv = grid[0].length;
			const ylen = grid[0].length-1;
	   

			const ulx = x/15;
			const xinc = (1/15)/xlen;
			const uly = 1-(y+1)/6;
			const yinc = (1/6)/ylen;

			const geometryNumber = new THREE.BufferGeometry();

			const verts = [];
			const norms = [];
			const uvs = [];
			
			for( let x = 0; x < xlen; x++ ) {
				const row = grid[x];
				const row1 = grid[x+1];
				for( let y = 0; y < ylen; y++ ) {
					const v1 = row1[y];	
					const v2 = row[y];	
					
					const v3 = row1[y+1];	
					const v4 = row[y+1];	

					verts.push( v1.x, v1.y, v1.z );
					verts.push( v4.x, v4.y, v4.z )
					verts.push( v2.x, v2.y, v2.z )
					uvs.push(  ulx + xinc*(x+1), uly+yinc*y,
					  	 ulx + xinc*(x), uly+yinc*(y+1),
						 ulx + xinc*(x), uly+yinc*y );
					norms.push( v1.x, v1.y, v1.z );
					norms.push( v4.x, v4.y, v4.z )
					norms.push( v2.x, v2.y, v2.z )
	   
					verts.push( v1.x, v1.y, v1.z );
					verts.push( v3.x, v3.y, v3.z )
					verts.push( v4.x, v4.y, v4.z )
					uvs.push(  ulx + xinc*(x+1), uly+yinc*y,
					   	ulx + xinc*(x+1), uly+yinc*(y+1),
						 ulx + xinc*(x), uly+yinc*(y+1) );
					norms.push( v1.x, v1.y, v1.z );
					norms.push( v3.x, v3.y, v3.z )
					norms.push( v4.x, v4.y, v4.z )
					
				}
			}
	   
			geometryNumber.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );
			geometryNumber.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
			geometryNumber.setAttribute( 'normal', new THREE.Float32BufferAttribute( norms, 3 ) );
	


			{
	   	     
				//const materialNormal = new THREE.MeshNormalMaterial();
				const material = new THREE.MeshPhongMaterial( {					
					 color: 0xFFFFFFF
					, side: THREE.FrontSide
					, transparent : true
					//, depthTest : false
					//, depthWrite:false
				} );
				//material.depthTest =false;
				//material.transparent = true
				//material.needsUpdate = true;
				const ballarr = [];
				arrNum.push( ballarr );
				for( let c = 0; c < 2; c++ ) {
					const ball = new THREE.Mesh( geometryNumber,  material );
	   	     
					material.map = numberImage;
					ballarr.push( ball )
					ball.visible = false;

					viewer.scene.add( ball );
				}
			}
			
		}
	}
		phase++;
		break;
	case 6:

	for( let n = 0; n < images.length; n++ ) {
		const arr = [];
		arrIcon.push(arr);
		const tex = images[n];
		for( let c = 0; c < 3; c++ ) {
	        
			//const materialNormal = new THREE.MeshNormalMaterial();
			const material = new THREE.MeshPhongMaterial( { color: 0xFFFFFFF
				, side: THREE.DoubleSide
				, transparent: true
			} );
	        
			const ball = new THREE.Mesh( geometrySquare, material );
	        
			material.map = images[n];
			//console.log( "Set map texture...", material.map );
	        
			viewer.scene.add( ball )
			ball.visible = false;
			arr.push( ball );
			//viewer.scene.add( numberArr[n*3+c] )
		}
	}

	for( let b = 0; b < bodies.arrBack.length; b++ ) {
		const usedarr = [];
		usedBack.push( usedarr );
		for( let n = 0; n < bodies.arrBack[b].length; n++ ) 
			usedarr.push(false);
	}

	for( let b = 0; b < bodies.arrRing.length; b++ ) {
		const usedarr = [];
		usedRing.push( usedarr );
		for( let n = 0; n < bodies.arrRing[b].length; n++ ) 
			usedarr.push(false);
	}
	for( let b = 0; b < bodies.arrNum.length; b++ ) {
		const usedarr = [];
		usedNum.push( usedarr );
		for( let n = 0; n < bodies.arrNum[b].length; n++ ) 
			usedarr.push(false);
	}

	for( let b = 0; b < bodies.arrIcon.length; b++ ) {
		const usedarr = [];
		usedIcon.push( usedarr );
		for( let n = 0; n < bodies.arrIcon[b].length; n++ ) 
			usedarr.push(false);
	}
	phase++;
	break;
case 7:

		//return bodies;
		resolve( bodies );
	}
	if( phase <= 7 ) setTimeout( doInit, 10 );
	}
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
				q.nx = qnx;
				q.ny = qny;
				q.nz = qnz;
				q.θ = qlen;
				q.dirty = false;
			}
		}
		return q;
	}



function deg2rad(x) { return x * Math.PI / 180.0 }

