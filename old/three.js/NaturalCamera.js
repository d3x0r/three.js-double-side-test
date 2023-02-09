/**
 * @author d3x0r / https://github.com/d3x0r
 */

import * as THREE from "./three.module.js"

// lnQuat is used in Motion, but not directly here
//import {lnQuat} from "../3d/src/lnQuatSq.js"
import {THREE_consts,Motion} from "./personalFill.mjs"

export function NaturalCamera( object, domElement ) {
	var self = this;
	this.object = object;
	this.motion = new Motion(object);

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	this.enabled = true;

	// 65 /*A*/, 83 /*S*/, 68 /*D*/
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40
        , A:65, S:83, D:68, W:87, SPACE:32, C:67, E:69, Q:81 };

	// internals
	this.moveSpeed =  0.0254 / 10;
	const scope = this;
	
	// 2d scaled screen point - prior position
	const rotateStart = new THREE.Vector2();
	// 2d scaled screen point - current
	const rotateEnd = new THREE.Vector2();
	// temp for rotation difference of start and end
	const rotateDelta = new THREE.Vector2();

	let phiDelta = 0;
	let thetaDelta = 0;

	this.userRotate = true;

	this.rotateLeft = function ( angle ) {
		if ( angle === undefined )  angle = 0;//getAutoRotationAngle();
		thetaDelta -= angle;
	};

	this.rotateRight = function ( angle ) {
		if ( angle === undefined )  angle = 0;//getAutoRotationAngle();
		thetaDelta += angle;

	};

	this.rotateUp = function ( angle ) {
		if ( angle === undefined )  angle = 0;//getAutoRotationAngle();
		phiDelta += angle;

	};

	this.rotateDown = function ( angle ) {
		if ( angle === undefined )  angle = 0;//getAutoRotationAngle();
		phiDelta -= angle;
	};

	this.update = function ( tick ) {
	    scope.object.matrixWorldNeedsUpdate = true;
	    scope.object.matrixNeedsUpdate = true;
		if( !scope.userRotate ) return;
		touchUpdate();
		const rt = scope.motion.orientation.right();
		if( phiDelta || thetaDelta || rt.y ){
			scope.motion.rotation.x = -phiDelta;
			scope.motion.rotation.y = thetaDelta;

			// always face 'up'
			scope.motion.rotation.z = -Math.asin(rt.y)/tick;

			scope.motion.rotation.dirty = true;
			//scope.motion.rotation.yaw(  );
			thetaDelta = 0;
			phiDelta = 0;

		}
		scope.motion.move( scope.object, tick );			

	};

	

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		if( !scope.userRotate ) return;

		event.preventDefault();

		rotateStart.set( event.clientX, event.clientY );

		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'mouseup', onMouseUp, false );

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		rotateEnd.set( event.clientX, event.clientY );
		rotateDelta.subVectors( rotateEnd, rotateStart );

		rotateDelta.x =  (rotateDelta.x / window.innerWidth) / 10;
		rotateDelta.y =  (rotateDelta.y / window.innerHeight) / 10;

		scope.rotateLeft( 2 * Math.PI * rotateDelta.x  );
		scope.rotateUp( 2 * Math.PI * rotateDelta.y );

		rotateStart.copy( rotateEnd );

	}

	function onMouseUp( event ) {

		if ( scope.enabled === false ) return;
		if ( scope.userRotate === false ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );


	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false ) return;
		/*
		var delta = 0;
		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta;
		} else if ( event.detail ) { // Firefox
			delta = - event.detail;
		}
		*/
	}

	var keyEvent = null;

	function onKeyDown( event ) {

		if ( scope.enabled === false ) return;

		if( !scope.userRotate ) {
			if( keyEvent )
				keyEvent( event, true );
			return;
		}

		switch ( event.keyCode ) {
		default:
			if( keyEvent )
				keyEvent( event, true );
			break;
            case scope.keys.SPACE:
            case scope.keys.E:
                scope.motion.speed.y = self.moveSpeed;
                break;
            case scope.keys.C:
            case scope.keys.Q:
                scope.motion.speed.y = -self.moveSpeed;
				break;
			case scope.keys.A:
				scope.motion.speed.x = self.moveSpeed;
				break;
			case scope.keys.W:
				scope.motion.speed.z = -self.moveSpeed;
				break;
			case scope.keys.S:
				scope.motion.speed.z = self.moveSpeed;
				break;
			case scope.keys.D:
				scope.motion.speed.x = -self.moveSpeed;
				break;
		}

	}

	function onKeyUp( event ) {

if( !scope.userRotate ) return;
        switch ( event.keyCode ) {
		default:
			if( keyEvent )
				keyEvent( event, false );
			break;
            case scope.keys.SPACE:
            case scope.keys.E:
                scope.motion.speed.y = 0;
                break;
            case scope.keys.C:
            case scope.keys.Q:
                scope.motion.speed.y = 0;
                break;

            case scope.keys.A:
                scope.motion.speed.x = 0;
				break;
			case scope.keys.W:
                scope.motion.speed.z = 0;
				break;
			case scope.keys.S:
                scope.motion.speed.z = 0;
				break;
			case scope.keys.D:
                scope.motion.speed.x = 0;
				break;
        }
		//switch ( event.keyCode ) {

		//		break;
		//}

	}

var touches = [];
if( typeof TouchList !== "undefined" )
	TouchList.prototype.forEach = function(c){ for( var n = 0; n < this.length; n++ ) c(this[n]); }

function touchUpdate() {
  if( touches.length == 1 ){
    var t = touches[0];
    if( t.new )
    {
      rotateStart.set( t.x, t.y );
      t.new = false;
    }
    else {
            rotateEnd.set( t.x, t.y );
      		rotateDelta.subVectors( rotateEnd, rotateStart );

            rotateDelta.x = -2 * (rotateDelta.x / window.innerWidth)
            rotateDelta.y = - 2 * (rotateDelta.y / window.innerHeight)
      		scope.rotateLeft( Math.PI/2 * rotateDelta.x   );
      		scope.rotateUp( Math.PI/2 * rotateDelta.y );
            //console.log( rotateDelta )
      		rotateStart.copy( rotateEnd );
    }
  }
}

function onTouchStart( e ) {
  e.preventDefault();
  e.changedTouches.forEach( (touch)=>{
    touches.push( {ID:touch.identifier,
      x : touch.clientX,
      y : touch.clientY,
      new : true
    })
  })
}

function onTouchMove( e ) {
  e.preventDefault();
  e.changedTouches.forEach( (touchChanged)=>{
    var touch = touches.find( (t)=> t.ID === touchChanged.identifier );
    if( touch ) {
      touch.x = touchChanged.clientX;
      touch.y = touchChanged.clientY;
    }
  })
}

function onTouchEnd( e ) {
  e.preventDefault();
  e.changedTouches.forEach( (touchChanged)=>{
    var touchIndex = touches.findIndex( (t)=> t.ID === touchChanged.identifier );
    if( touchIndex >= 0 )
       touches.splice( touchIndex, 1 )
  })
}

    function ignore(event) {
        event.preventDefault();
    }
    this.disable = function() {
    	scope.domElement.removeEventListener( 'contextmenu', ignore, false );
    	scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
    	scope.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
    	scope.domElement.removeEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
    	window.removeEventListener( 'keydown', onKeyDown, false );
    	window.removeEventListener( 'keyup', onKeyUp, false );
    }

    this.enable = function(cb) {
		keyEvent = cb;
    	scope.domElement.addEventListener( 'contextmenu', ignore, false );
    	scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
    	scope.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
      	scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
      	scope.domElement.addEventListener( 'touchmove', onTouchMove, false );
      	scope.domElement.addEventListener( 'touchend', onTouchEnd, false );

    	scope.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
    	window.addEventListener( 'keydown', onKeyDown, false );
    	window.addEventListener( 'keyup', onKeyUp, false );
    }
    this.enable();

};


// extend Object with a default event dispatcher
NaturalCamera.prototype = Object.create( THREE.EventDispatcher.prototype );
