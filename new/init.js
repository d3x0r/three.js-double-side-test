
// this is just a test script 


import {setupWorldView, getBallInterface as Balls} from "./ballView.mjs"
const ballInterface= Balls();
const balls=  Balls( "worldView1", "worldView2", "worldView3", "worldView4" );

const lastBallPos = {x:320, y:550, scale: 2.5};
const moveToPosIn = 500;
const sizeToPosIn = 250;
const ballPosOrigin = {x:35, y:60};
const ballPosSize = {x:43, y:75, scale: 1};


class Ball{
	moveStartAt = Date.now();
	moveDel = 0;
	sizeStartAt = Date.now();
	sizeDel = 0;

	x = 0;
	y = 0;
	xTo = 0;
	yTo = 0;
	s = 0;
	sTo = 0;

	number = 0;

	constructor(n) {
		this.number = n;
	}
	moveToIn( x, y, t ) {
		//ballInterface.show( this.number );
		this.moveStartAt = Date.now();
		this.moveDel = t || 1;
		this.xTo = x; this.yTo = y;
	}
	sizeToIn( s, t ) {
		{
			this.sizeStartAt = Date.now();
			this.sizeDel = t || 1;
			this.sTo = s;		
		}
	}
	stopAt(n) {
		ballInterface.stopAt( this.number, n );

	}
	animate() {
		const now = Date.now();

		if( this.sizeDel ) {
			const sizeDel = (now - this.sizeStartAt)/this.sizeDel;
			if( sizeDel > 1 ) {
				this.s = this.sTo;
				this.sizeDel = 0;
				ballInterface.scaleTo( this.number, this.s )
			}
			else
				ballInterface.scaleTo( this.number, this.sTo * sizeDel + this.s * (1-sizeDel) );

		}
		if( this.moveDel ) {
			const moveDel = (now - this.moveStartAt)/this.moveDel;
			if( moveDel > 1 ) {
				this.x = this.xTo;
				this.y = this.yTo;
				this.moveDel = 0;
				ballInterface.moveTo( this.number, this.x, this.y )
			}
			else
				ballInterface.moveTo( this.number, this.xTo * moveDel + this.x * (1-moveDel)
					, this.yTo * moveDel + this.y * (1-moveDel) );
		}
	}

}


export class BallView {
	canvas = document.createElement( "canvas" );
	balls = [];
	ballOrder = [];
	lastBall = null;
	constructor( parent ) {
		this.canvas.width = 1280;
		this.canvas.height = 540;
		parent.appendChild( this.canvas );
		const viewer = setupWorldView( this.canvas )
		viewer.onAnimate = this.animate.bind( this );

		for( let n = 0; n < 75; n++ ) {
			this.balls.push( new Ball(n) )
			ballInterface.hide( n );
		}

	}

	animate() {
		for( let ball of this.ballOrder ) ball.ball.animate();
		if( this.lastBall ) this.lastBall.animate();
	}
	clearBalls() {
		this.ballOrder.length = 0;
		this.lastBall = null;
		for( let ball of this.ballOrder ){
			ballInterface.hide( ball.pos )	
		}
		for( let b = 0; b < 75; b++ )
			ballInterface.hide( b );
	}

	setLastBall(n) {
		if( !n ) return;

		if( this.lastBall ) {
			const thisBall = {pos:this.ballOrder.length, ball:this.lastBall };
			this.ballOrder.push( thisBall );
			console.log( "save lastball:", this.lastBall.number, "And will be", n)
			this.lastBall.moveToIn(  ballPosOrigin.x + (thisBall.pos%15)*ballPosSize.x
					, ballPosOrigin.y +  Math.floor(thisBall.pos/15) * ballPosSize.y
					, moveToPosIn );
			this.lastBall.sizeToIn( ballPosSize.scale, sizeToPosIn );
		}

		const ball = this.balls[n-1];
		this.lastBall = ball;
		console.log( "Show ball:", n, "as Last ball")
		ballInterface.show( n-1, n ); // show is also stop-at
		ball.moveToIn( lastBallPos.x, lastBallPos.y, 0 );
		ball.sizeToIn( lastBallPos.scale, 0 );
		//ball.stopAt( n );
	}
	uncall(n) {
		if( !n ) return;
		n--;
		ballInterface.hide( n );
		let b;
		if( n === this.lastBall.number ) {
			if( this.ballOrder.length ) {
				this.lastBall = this.ballOrder[this.ballOrder.length-1].ball;
				this.ballOrder.length--;

				const ball = this.balls[this.lastBall.number];
				ball.moveToIn( lastBallPos.x, lastBallPos.y, 500 );
				ball.sizeToIn( lastBallPos.scale, 500 );
		
			} else {
				ballInterface.hide( n );
			}
		}

		for( b = 0; b < this.ballOrder.length; b++ ) {
			const ball = this.ballOrder[b];
			if( ball.ball.number == n ){
				this.ballOrder.splice( b, 1 );
				ballInterface.hide( n );
				break;
			}
		}
		for( ; b < this.ballOrder.length; b++ ){
			const thisBall = this.ballOrder[b];
			thisBall.pos = b;
			thisBall.ball.moveToIn(  ballPosOrigin.x + (thisBall.pos%15)*ballPosSize.x
					, ballPosOrigin.y +  Math.floor(thisBall.pos/15) * ballPosSize.y
					, moveToPosIn );
			//ball.moveToIn( )
		}
	}

	moveControlTo( newParent ) {
		this.canvas.remove();
		newParent.appendChild( this.canvas );
	}


}

const view = new BallView( document.body );

setTimeout( ()=>{
for( let i = 0; i < 75; i++ )     {
	view.setLastBall( 10 );
	ballInterface.stopAt( i, i+1 );
}
}, 2000 );
