
const speedOfLight = 1;

// control whether type and normalization (sanity) checks are done..
const ASSERT = false;

const abs = (x)=>Math.abs(x);

const p2 = 2*Math.PI;
//            0-1 1-2 2-3 3-4
const grid =[[ 0, p2, p2,  0 ]  //>0 - 1
            ,[p2,  0,  0, p2 ]  //1-2
            ,[p2,  0,  0, p2 ]  //2-3
            ,[ 0, p2, p2,  0 ]   //3-4
         ];

// it's hard to see this because they're all in the same plane...
// not sure this is really needed, because the twist is just around this
// same axis.		
const grid2=[[ 0, p2, 0,  0 ]  //>0 - 1
            ,[p2,  0,  0, p2 ]  //1-2
            ,[0, 0, 0,  p2*2 ]  //2-3
            ,[0,  0,  0, p2*2 ]   //3-4
         ];
//            0-1 1-2 2-3 3-4
const gridn =[[ 1,  1, 1, 1 ]  //>0 - 1
             ,[ 1,  1, 1, 1 ]  //1-2
             ,[ 1, 1,  1, 1 ]  //2-3
             ,[ 1, 1,  1,  1 ]   //3-4
          ];

// 'fixed' acos for inputs > 1
function acos(x) {
	// uncomment this line to cause failure for even 1/2 rotations(at the limit of the other side)
	// return Math.acos(x); // fails on rotations greater than 4pi.
	const mod = (x,y)=>y * (x / y - Math.floor(x / y)) ;
	const plusminus = (x)=>mod( x+1,2)-1;
	const trunc = (x,y)=>x-mod(x,y);
	return Math.acos(plusminus(x)) - trunc(x+1,2)*Math.PI/2;
}

const test = true;
let normalizeNormalTangent = false;
let vectorType = Vector;

function Vector(x,y,z) {
	this.x=x;
	this.y=y;
	this.z=z;
}

var twistDelta = 0;
// -------------------------------------------------------------------------------
//  Log Quaternion (Rotation part)
// -------------------------------------------------------------------------------

// lnQuat( 0    , {x:,y:,z:})              - angle, axis ; normalizes 
// lnQuat( theta, b, c, d );               - angle, axisX, axisY, axisZ   ; linear normalize axis, scale by angle.
// lnQuat( 0    , b, c, d );               - 0,     spinX, spinY, spinZ   ; set raw spins
// lnQuat( basis );                        - basis object with {forward:,up:,right:} vectors.
// lnQuat( {a:, b:, c:} );                 - angle-angle-angle set raw spins.
// lnQuat( {x:, y:, z: }, {x:, y:, z: } )  - set as lookAt; forward, up vectors
// lnQuat( {x:, y:, z: }, null )           - set as lookAt; forward, automatic 'up'
function lnQuat( theta, d, a, b, e ){
	//this.w = 0; // unused, was angle of axis-angle, then was length of angles(n)...
	this.x = 0;  // these could become wrap counters....
	this.y = 0;  // total rotation each x,y,z axis.
	this.z = 0;

	this.nx = 0;  // default normal
	this.ny = 1;  // 
	this.nz = 0;

// slope at the point... (which slope?)
//	this.d?? = 0;
//	this.dnx = 0;  // default normal
//	this.dny = 1;  // 
//	this.dnz = 0;  //

	// temporary sign/cos/normalizers
	this.?? = 0; // length
	this.refresh = null;
	this.dirty = true; // whether update() has to do work.
	this.set( theta,d,a,b,e);
}

lnQuat.SLERP = false;
lnQuat.sinNormal = false;

lnQuat.setTwistDelta = function(t) {
	twistDelta = t;
}

lnQuat.setVectorType = function( vT ){
	vectorType = vT;
}

lnQuat.prototype.set = function(theta,d,a,b,e)
{

	function alignZero(q) {
		//const fN = 1/Math.sqrt( tz*tz+tx*tx );
		const b = q.getBasis();
		const ty = b.up.y;
		const cosTheta = acos( ty ); // 1->-1 (angle from pole around this circle.
		const txn = -q.nz;
		const tzn = q.nx;
		
		const s = Math.sin( cosTheta ); // double angle substituted
		const c = 1- Math.cos( cosTheta ); // double angle substituted
		
		// determinant coordinates
		let angle = txn===1?acos( ( ty )  )
				:acos( ( ty + 1 ) * ( 1 - txn ) / 2 - 1 );
		
		//console.log( "Q:", q, txn, tzn, ty, angle)

		// compute the axis
		const yz = s * q.nx;
		const xz = ( 2 - c * (q.nx*q.nx + q.nz*q.nz)) * tzn;
		const xy = txn===1?(s * q.nx * tzn  
			+ s * q.nz * (1) )
			:(s * q.nx * tzn  
		         + s * q.nz * (1-txn) );

		//if( txn === 1 ) angle += Math.PI*2;

		const newlen = Math.sqrt(yz*yz + xz*xz + xy*xy );
		if( Math.abs(newlen)>0.00000001){
			const tmp = 1 /newlen;
			q.nx = yz *tmp;
			q.ny = xz *tmp;
			q.nz = xy *tmp;
		}else{
			q.nx = 0;
			q.ny = 1;
			q.nz = 0;

		}
		
		const lNorm = angle;
		q.x = q.nx * lNorm;
		q.y = q.ny * lNorm;
		q.z = q.nz * lNorm;
		
		//console.log( "post Q:", q )

		// the remining of this is update()
		q.?? = Math.sqrt(q.x*q.x+q.y*q.y+q.z*q.z);
		q.dirty = false;
		/*
		// the above is this;  getBasis(up), compute new forward and cross right
		// and restore from basis.
		const trst = q.getBasis();
		const fN = 1/Math.sqrt( tz*tz+tx*tx );
	                                      
		trst.forward.x = tz*fN;
		trst.forward.y = 0;
		trst.forward.z = -tx*fN;
		trst.right.x = (trst.up.y * trst.forward.z)-(trst.up.z * trst.forward.y );
		trst.right.y = (trst.up.z * trst.forward.x)-(trst.up.x * trst.forward.z );
		trst.right.z = (trst.up.x * trst.forward.y)-(trst.up.y * trst.forward.x );
	                                      
		q.fromBasis( trst );
		q.update();						
		*/
	}


	if( "undefined" !== typeof theta ) {

		if( "function" === typeof theta  ){
// what is passed is a function to call during apply
			this.refresh = theta;
			return this;
		}
		if( theta instanceof lnQuat ) {
// clone an existing lnQuat
			this.x = theta.x;
			this.y = theta.y;
			this.z = theta.z;
			this.nx = theta.nx;
			this.ny = theta.ny;
			this.nz = theta.nz;
			this.?? = theta.??;
			this.dirty = theta.dirty;
			return this;
		}
		if( "undefined" !== typeof a ) {
			//if( ASSERT ) if( theta) throw new Error( "Why? I mean theta is always on the unit circle; else not a unit projection..." );
			// create with 4 raw coordinates
			if( theta ) {
				throw new Error( "CHECK INITIALIZER" );
				const spin = (abs(d)+abs(a)+abs(b));
				if( spin ) {
					const nSpin = (theta)/spin;
					this.x = d*nSpin;
					this.y = a*nSpin;
					this.z = b*nSpin;
				} else {
					this.x = 0;
					this.y = 0;
					this.z = 0;
				}
			}else {
				this.x = d;
				this.y = a;
				this.z = b;
				this.dirty = true;
				if( e ) {
					this.update();
					alignZero(this);
				}
                                return this;
			}

		}else {
			if( "object" === typeof theta ) {
				if( "up" in theta ) {
// basis object {forward:,right:,up:}
					return this.fromBasis( theta );
				}
				if( "lat" in theta ) {
					let lat = theta.lat;// % (Math.PI*4);
					let lng = theta.lng;// % (Math.PI*4)
					
					if( !lat ) {
						this.x = 0; this.z = 0; this.y = lng+twistDelta;
						this.dirty = true; 
						return this.update();
					}

					const gridlat = Math.floor( Math.abs( lat ) / Math.PI );
					const gridlng = Math.floor( Math.abs( lng ) / Math.PI );
					const gridlatoct = gridlat>>2;
					const gridlngoct = gridlng>>2;
					const spin = ((d)?grid:grid2)[gridlat%4][gridlng%4] + ((gridlatoct+gridlngoct) * Math.PI*4);
					const latmul = 1;//(!d)?gridn[gridlat%4][gridlng%4]:1;

					const x = Math.sin(lng);
					const z = Math.cos(lng);
					this.?? = (latmul*lat+spin);
					this.x = (this.nx =x) * (this.??); this.y = (this.ny =0); this.z = (this.nz =z) * (this.??);
					this.dirty = false;
					if(d) // D is a boolean to further align the tangents.
					{
						const q = this;

						const ty = Math.cos( lat );
						const txn = -z;
						
						{
							const s = Math.sin( lat ); // double angle substituted
							const c = 1-ty; // double angle substituted
							
							let angle = txn===1?lat
									:acos( ( ty + 1 ) * ( 1 + z ) / 2 - 1 );
							// compute the axis
							const yz = s * x;
							const xz = ( 2 - c * (x*x + z*z)) * x;
							const xy = txn===1?(s * x * x + s * z * (1) )
								              :(s * x * x + s * z * (1+z) );
		               
							const newlen = Math.sqrt(yz*yz + xz*xz + xy*xy );
							if( Math.abs(newlen)>0.00000001){
								const tmp = 1 /newlen;
								q.nx = yz *tmp;
								q.ny = xz *tmp;
								q.nz = xy *tmp;
							}else{
								q.nx = 0;
								q.ny = 1;
								q.nz = 0;
							}
							
							q.x = q.nx * angle;
							q.y = q.ny * angle;
							q.z = q.nz * angle;
		               
							{
								// input angle...
								const s = Math.sin( angle ); 
								const c1 = Math.cos( angle );
								const c = 1-c1;
								const cny = c * this.ny;
								// compute the 'up' for the current frame
								const ax = (cny*this.nx) - s*this.nz;
								const ay = (cny*this.ny) + c1;
								const az = (cny*this.nz) + s*this.nx;

								const AdotB = q.ny;

								const xmy = (spin+twistDelta - angle)/2; // X - Y  (x minus y)
								const xpy = (spin+twistDelta + angle)/2  // X + Y  (x plus y )
								const cxmy = Math.cos(xmy);
								const cxpy = Math.cos(xpy);
								const cosCo2 = ( ( 1-AdotB )*cxmy + (1+AdotB)*cxpy )/2;

								let ang = acos( cosCo2 )*2;

								if( ang ) {
									const sxmy = Math.sin(xmy);
									const sxpy = Math.sin(xpy);

									const ss1 = sxmy + sxpy
									const ss2 = sxpy - sxmy
									const cc1 = cxmy - cxpy

									const crsX = (ay*q.nz-az*q.ny);
									const Cx = ( crsX * cc1 +  ax * ss1 + q.nx * ss2 );

									const crsY = (az*q.nx-ax*q.nz);
									const Cy = ( crsY * cc1 +  ay * ss1 + q.ny * ss2 );

									const crsZ = (ax*q.ny-ay*q.nx);
									const Cz = ( crsZ * cc1 +  az * ss1 + q.nz * ss2 );

									const Clx = 1/Math.sqrt(Cx*Cx+Cy*Cy+Cz*Cz);
									if( spin ) {

									}
									q.??  = ang;
									q.nx = Cx*Clx;
									q.ny = Cy*Clx;
									q.nz = Cz*Clx;

									q.x  = q.nx*ang;
									q.y  = q.ny*ang;
									q.z  = q.nz*ang;

									q.dirty = false;
								} else {
									q.??  = 0;
									q.x = q.nx=0 * 0;
									q.y = q.ny=1 * 0;
									q.z = q.nz=0 * 0;
									q.dirty = false;
								}
							}
							return this;
						}
					}else {
						if( 1 || twistDelta ) {
							// input angle...
							const s = Math.sin( this.?? ); // double angle sin
							const c1 = Math.cos( this.?? ); // sin/cos are the function of exp()
							const c = 1-c1;
							const cny = c * this.ny;
							const ax = (cny*this.nx) - s*this.nz;
							const ay = (cny*this.ny) + c1;
							const az = (cny*this.nz) + s*this.nx;
							//console.log( "Rotate ", q.nx, q.ny, q.nz, ax, ay, az, th );
							return finishRodrigues( this, 0, ax, ay, az, spin+twistDelta );
						}else {
							//if(this.?? < 0 )
								this.?? = lat;

							this.x  = this.nx*this.??;
							this.y  = this.ny*this.??;
							this.z  = this.nz*this.??;

							this.dirty = false;
					
						}
						return this;
					}
				}
				if( "a" in theta ) {
// angle-angle-angle  {a:,b:,c:}
					const l1 = Math.abs(theta.b)+Math.abs(theta.b)+Math.abs(theta.c);
					const l3 = Math.sqrt(theta.a*theta.a+theta.b*theta.b+theta.c*theta.c);
					if( l3 > 0.000001 ) {
						this.x = theta.a * l1 / l3;
						this.y = theta.b * l1 / l3;
						this.z = theta.c * l1 / l3;
					}
					return this;
				}
				else if( "x" in theta )
				{
					let setNormal = normalizeNormalTangent;
					if( "boolean" === typeof d ) {
						setNormal = d;
					}

					if( "object" === typeof d ) {
						if( !d ) d = { x : -theta.y, y:theta.x, z:-theta.z }; // create a 'up' for the passed forward.
					        const tmpBasis = { forward: theta, up: d, right: {x:0,y:0,z:0} };
						tmpBasis.right.x = tmpBasis.forward.y * d.z - tmpBasis.forward.z * d.y;
						tmpBasis.right.y = tmpBasis.forward.z * d.y - tmpBasis.forward.x * d.z;
						tmpBasis.right.z = tmpBasis.forward.x * d.x - tmpBasis.forward.y * d.x;
						this.fromBasis( tmpBasis );
					} else {
// x/y/z normal (no spin, based at 'north' (0,1,0) )  {x:,y:,z:}
						// normal conversion is linear.
						const l2 = (Math.abs(theta.x)/*+abs(theta.y)*/+Math.abs(theta.z));
						if( l2 ) {
							const l3 = Math.sqrt(theta.x*theta.x+theta.y*theta.y+theta.z*theta.z);
							//if( l2 < 0.1 ) throw new Error( "Normal passed is not 'normal' enough" );
					        
							const ty = theta.y /l3; // square normal
							const cosTheta = acos( ty ); // 1->-1 (angle from pole around this circle.
							const norm1 = Math.sqrt(theta.x*theta.x+theta.z*theta.z);
							// get square normal...
							this.nx = theta.z/norm1;
							this.ny = 0;
							this.nz = -theta.x/norm1;

							this.?? = cosTheta;							
							this.x = this.nx*cosTheta;
							this.z = this.nz*cosTheta;
							

							if(setNormal) {
								//const fN = 1/Math.sqrt( tz*tz+tx*tx );
					        
								const txn = -this.nz;
								const tzn = this.nx;
					        
								const s = Math.sin( cosTheta ); // double angle substituted
								const c = 1- Math.cos( cosTheta ); // double angle substituted
					        
								// determinant coordinates
								const angle = acos( ( ty + 1 ) * ( 1 - txn ) / 2 - 1 );
					        
								// compute the axis
								const yz = s * this.nx;
								const xz = ( 2 - c * (this.nx*this.nx + this.nz*this.nz)) * tzn;
								const xy = s * this.nx * tzn  
								         + s * this.nz * (1-txn);
					        
								const tmp = 1 /Math.sqrt(yz*yz + xz*xz + xy*xy );
								this.nx = yz *tmp;
								this.ny = xz *tmp;
								this.nz = xy *tmp;
					        
								const lNorm = angle;
								this.x = this.nx * lNorm;
								this.y = this.ny * lNorm;
								this.z = this.nz * lNorm;
					        
								// the remining of this is update()
								this.?? = Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
								this.dirty = false;
							}
					        
							if( twistDelta ) {
								yaw( this, twistDelta /*+ angle*/ );
							}
						}
					}
					return this;
				}
			}

// angle-axis initialization method
			const ?? = theta/ Math.sqrt( d.x*(d.x) + d.y*(d.y) + d.z*(d.z) ); // make sure to normalize axis.
			// if no rotation, then nothing.
			if( Math.abs(theta) > 0.000001 ) {
				this.x = d.x * ??;
				this.y = d.y * ??;
				this.z = d.z * ??;
				this.update();
				return this;
			}
		}
	}
}

lnQuat.prototype.cross = function( other, target ){
	this.update();
	other.update();
	const dot =  this.nx*other.nx + this.ny*other.ny + this.nz*other.nz ;
	const angle = Math.acos( dot );  // returns 0 to pi; 0 to 1/2 turn.

	const norm = Math.sin( angle );
	
	const crsX = (this.ny*other.nz-this.nz*other.ny);
	const crsY = (this.nz*other.nx-this.nx*other.nz);
	const crsZ = (this.nx*other.ny-this.ny*other.nx);
	if( norm ) {
		target.?? = angle;
		target.nx = crsX/norm;
		target.ny = crsY/norm;
		target.nz = crsZ/norm;
	}else {
		if( angle > Math.PI ) {
			target.?? = angle;
			target.nx = this.nx;
			target.ny = this.ny;
			target.nz = this.nz;
		}else {
			target.?? = angle;
			target.nx = this.nx;
			target.ny = this.ny;
			target.nz = this.nz;
		}

	}
	target.x = target.nx * target.??;
	target.y = target.ny * target.??;
	target.z = target.nz * target.??;
	target.dirty = false;
	return target;
}

let tzz = 0;
lnQuat.prototype.fromBasis = function( basis ) {
	// tr(M)=2cos(theta)+1 .
	const t = ( ( basis.right.x + basis.up.y + basis.forward.z ) - 1 )/2;
	//console.log( "FB t is:", t, basis.right.x, basis.up.y, basis.forward.z );

	//	if( t > 1 || t < -1 )
	//  1,1,1 -1 = 2;/2 = 1
	// -1-1-1 -1 = -4 /2 = -2;
	/// okay; but a rotation matrix never gets back to the full rotation? so 0-1 is enough?  is that why evertyhing is biased?
	//  I thought it was more that sine() - 0->pi is one full positive wave... where the end is the same as the start
	//  and then pi to 2pi is all negative, so it's like the inverse of the rotation (and is only applied as an inverse? which reverses the negative limit?)
	//  So maybe it seems a lot of this is just biasing math anyway?
	let angle = acos(t);
	if( !angle ) {
		//console.log( "primary rotation is '0'", t, angle, this.??, basis.right.x, basis.up.y, basis.forward.z );
		this.x = this.y = this.z = this.nx = this.ny = this.nz = this.?? = 0;
		this.ny = 1; // axis normal.
		this.dirty = false;
		return this;
	}
	/*
	https://stackoverflow.com/a/12472591/4619267
	x = (R21 - R12)/sqrt((R21 - R12)^2+(R02 - R20)^2+(R10 - R01)^2);
	y = (R02 - R20)/sqrt((R21 - R12)^2+(R02 - R20)^2+(R10 - R01)^2);
	z = (R10 - R01)/sqrt((R21 - R12)^2+(R02 - R20)^2+(R10 - R01)^2);
	*/	
	const yz = basis.up     .z - basis.forward.y;
	const xz = basis.forward.x - basis.right  .z;
	const xy = basis.right  .y - basis.up     .x;
	const tmp = 1 /Math.sqrt(yz*yz + xz*xz + xy*xy );

	this.nx = yz *tmp;
	this.ny = xz *tmp;
	this.nz = xy *tmp;
	const lNorm = angle;// / (abs(this.nx)+abs(this.ny)+abs(this.nz));
	this.x = this.nx * lNorm;
	this.y = this.ny * lNorm;
	this.z = this.nz * lNorm;
	//console.log( "frombasis primary values:", this.x, this.y, this.z );

	this.dirty = true;
	return this;
}


lnQuat.prototype.exp = function(target,t ) {
	t = t || 1;
	this.update();
	const q = this;
	const s  = Math.sin( q.??/2 * t );
	target.w = Math.cos( q.??/2 * t );
	target.x = q.nx*s;
	target.y = q.ny*s;
	target.z = q.nz*s;
	return target;
}


// return the difference in spins
// the resulting spin can be used to rotate Q(this) to P...
// or to iterate to the new frame... this is 1/2 of the work of slerp2.
// which is probably done fewer times than the second part which is just q.freespin(result);
lnQuat.prototype.spinDiff = function( p, target ) {
	target = target || new lnQuat();
	const external = false;
	const q = this;
	if( !q.??) {
		// the difference is just directly to P.
		target.nx = p.nx;
		target.ny = p.ny;
		target.nz = p.nz;
		target.?? = p.??;
		target.x = target.nx * target.??;
		target.y = target.ny * target.??;
		target.z = target.nz * target.??;
		return target;
	}
	// the difference is P inverse rotated by Q as a frame
	target.set( p );
	// remove the rotation of q from p...
	finishRodrigues( target, Math.floor( q.??/(Math.PI*2)), q.nx, q.ny, q.nz, -q.?? );
	// which sets target as the initial P rotation.
	
	axisTemp.x = target.nx;
	axisTemp.y = target.ny;
	axisTemp.z = target.nz;
	let tmpA;
	if( !external ) { // delta angle is from an internal source
		tmpA = q.applyDel( axisTemp, 1 );
	}else
		tmpA = axisTemp;
	target.x = (target.nx = tmpA.x) * target.??;
	target.y = (target.ny = tmpA.y) * target.??;
	target.z = (target.nz = tmpA.z) * target.??;
	return target;
}

lnQuat.prototype.add = function( q2, t ) {
	return lnQuatAdd( this, q2, t||1 );
}
lnQuat.prototype.add2 = function( q2, t ) {
	return new lnQuat( 0, this.x, this.y, this.z ).add( q2, t );
}

function lnQuatSub( q, q2, s ) {
	if( "undefined" == typeof s ) s = 1;
	q.dirty = true;
	q.x = q.x - q2.x * s;
	q.y = q.y - q2.y * s;
	q.z = q.z - q2.z * s;
	return q;
}

function lnQuatAdd( q, q2, s ) {
	if( "undefined" == typeof s ) s = 1;
	q.dirty = true;
	q.x = q.x + q2.x * s;
	q.y = q.y + q2.y * s;
	q.z = q.z + q2.z * s;
	return q;
}

lnQuat.prototype.getBasis = function(){return this.getBasisT(1.0) };
lnQuat.prototype.getBasisT = function(del) {
	const q = this;
	if( q.dirty ) q.update();
	if( "undefined" === typeof del ) del = 1.0;

	const nt = q.?? * del;
	const s  = Math.sin( nt ); // sin/cos are the function of exp()
	const c1 = Math.cos( nt ); // sin/cos are the function of exp()
	const c = 1- c1;

	const qx = this.nx;
	const qy = this.ny;
	const qz = this.nz;

	const cnx = c*qx;
	const cny = c*qy;
	const cnz = c*qz;

	const xy = cnx*qy;  // x * y / (xx+yy+zz) * (1 - cos(2t))
	const yz = cny*qz;  // y * z / (xx+yy+zz) * (1 - cos(2t))
	const xz = cnz*qx;  // x * z / (xx+yy+zz) * (1 - cos(2t))

	const wx = s*qx;     // x / sqrt(xx+yy+zz) * sin(2t)
	const wy = s*qy;     // y / sqrt(xx+yy+zz) * sin(2t)
	const wz = s*qz;     // z / sqrt(xx+yy+zz) * sin(2t)

	const xx = cnx*qx;  // y * y / (xx+yy+zz) * (1 - cos(2t))
	const yy = cny*qy;  // x * x / (xx+yy+zz) * (1 - cos(2t))
	const zz = cnz*qz;  // z * z / (xx+yy+zz) * (1 - cos(2t))

	const basis = { right  :{ x : c1 + xx, y : wz + xy, z : xz - wy }
	              , up     :{ x : xy - wz, y : c1 + yy, z : wx + yz }
	              , forward:{ x : wy + xz, y : yz - wx, z : c1 + zz }
	              };

	return basis;	
}


lnQuat.prototype.getBasisV = function(del) {
	const q = this;
	if( q.dirty ) q.update();
	if( "undefined" === typeof del ) del = 1.0;

	const nt = q.?? * del;
	const s  = Math.sin( nt ); // sin/cos are the function of exp()
	const c1 = Math.cos( nt ); // sin/cos are the function of exp()
	const c = 1- c1;

	const qx = this.nx;
	const qy = this.ny;
	const qz = this.nz;

	const cnx = c*qx;
	const cny = c*qy;
	const cnz = c*qz;

	const xy = cnx*qy;  // x * y / (xx+yy+zz) * (1 - cos(2t))
	const yz = cny*qz;  // y * z / (xx+yy+zz) * (1 - cos(2t))
	const xz = cnz*qx;  // x * z / (xx+yy+zz) * (1 - cos(2t))

	const wx = s*qx;     // x / sqrt(xx+yy+zz) * sin(2t)
	const wy = s*qy;     // y / sqrt(xx+yy+zz) * sin(2t)
	const wz = s*qz;     // z / sqrt(xx+yy+zz) * sin(2t)

	const xx = cnx*qx;  // y * y / (xx+yy+zz) * (1 - cos(2t))
	const yy = cny*qy;  // x * x / (xx+yy+zz) * (1 - cos(2t))
	const zz = cnz*qz;  // z * z / (xx+yy+zz) * (1 - cos(2t))

	const basis = { right  :{ x : c1 + xx, y : wz + xy, z : xz - wy }
	              , up     :{ x : xy - wz, y : c1 + yy, z : wx + yz }
	              , forward:{ x : wy + xz, y : yz - wx, z : c1 + zz }
	              };

	return basis;	
}


lnQuat.prototype.getRelativeBasis = function( q2 ) {
	const q = this;
	const r = new lnQuat( 0, this.x, this.y, this.z );
	const dq = lnSubQuat( q2 );
	return getBasis( dq );
}

lnQuat.prototype.update = function() {
	// sqrt, 3 mul 2 add 1 div 1 sin 1 cos
	if( !this.dirty ) return this;
	this.dirty = false;

	// norm-rect
	this.?? = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	if( this.?? ){
		this.nx = this.x/this.??;
		this.ny = this.y/this.??;
		this.nz = this.z/this.??;
	}else {
		this.nx = 0;
		this.ny = 1;
		this.nz = 0;
	}

	return this;
}

lnQuat.prototype.getFrame = function( t, x, y, z ) {
	const lnQrot = new lnQuat( 0, x, y, z );
	const lnQcomposite = this.apply( lnQrot );
	return lnQcomposite.getBasisT( t );
}

// this returns functions which result in vectors that update
// as the current 
lnQuat.prototype.getFrameFunctions = function( lnQvel ) {
	const q = this.apply( lnQvel );

	let s  = Math.sin( q.?? ); // sin/cos are the function of exp()
	let c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	let c  = 1- c1; // sin/cos are the function of exp()

	const xy = ()=>c*q.nx*q.ny;  // 2*sin(t)*sin(t) * x * y / (xx+yy+zz)   1 - cos(2t)
	const yz = ()=>c*q.ny*q.nz;  // 2*sin(t)*sin(t) * y * z / (xx+yy+zz)   1 - cos(2t)
	const xz = ()=>c*q.nx*q.nz;  // 2*sin(t)*sin(t) * x * z / (xx+yy+zz)   1 - cos(2t)

	const wx = ()=>s*q.nx;     // 2*cos(t)*sin(t) * x / sqrt(xx+yy+zz)   sin(2t)
	const wy = ()=>s*q.ny;     // 2*cos(t)*sin(t) * y / sqrt(xx+yy+zz)   sin(2t)
	const wz = ()=>s*q.nz;     // 2*cos(t)*sin(t) * z / sqrt(xx+yy+zz)   sin(2t)

	const xx = ()=>c*q.nx*q.nx;  // 2*sin(t)*sin(t) * y * y / (xx+yy+zz)   1 - cos(2t)
	const yy = ()=>c*q.ny*q.ny;  // 2*sin(t)*sin(t) * x * x / (xx+yy+zz)   1 - cos(2t)
	const zz = ()=>c*q.nz*q.nz;  // 2*sin(t)*sin(t) * z * z / (xx+yy+zz)   1 - cos(2t)

	return {
		forward(t) {
			s = Math.sin( t*q.?? );
			c1 = Math.cos( t*q.?? );
			c = 1 - c1;
			return new vectorType(   ( wy() + xz() ), ( yz() - wx() ),  c1 + ( zz() ) );
		},
		right(t) {
			s = Math.sin( t*q.?? );
			c1 = Math.cos( t*q.?? );
			c = 1 - c1;
			return new vectorType(     c1 + ( xx() ), ( wz() + xy() ),      ( xz() - wy() ) );
		},
		up(t) {
			s = Math.sin( t*q.?? );
			c1 = Math.cos( t*q.?? );
			c = 1 - c1;
			return new vectorType(   ( xy() - wz() ),   c1 + yy(),      ( wx() + yz() ) );
		}
	}
}


lnQuat.prototype.accel = function( v, steps, internal ) {
	const del = 1/steps;
	const v?? = Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z);
	if( !v?? ) return this; // no modification.
	
	const v??d = v?? * del;
	const vx = v.x / v??,    vy = v.y / v??,    vz = v.z / v??;

	let q?? = this.??;
	let qx = this.nx,       qy = this.ny,    qz = this.nz;
	
	for( let step = 0; step < 1.0; step += del ) {
		// .apply() ...
		const c = cos( (internal?1:-1) * q?? );
		const s = sin( (internal?1:-1) * q?? );
        
		const dot = (qx*vx + qy*vy + qz*vz);
		const dotv = dot *(1-c);
		const ax = (vx*c + s*(qy * vz - qz * vy) + qx * dotv)
		const ay = (vy*c + s*(qz * vx - qx * vz) + qy * dotv)
		const az = (vz*c + s*(qx * vy - qy * vx) + qz * dotv)

		// .freespin()... RRF R x ( A x R )

		const xmy = ( v??d - q?? ) / 2
		const xpy = ( v??d + q?? ) / 2
		const cxmy = cos(xmy);
		const cxpy = cos(xpy);

		const q?? = Math.acos( ( ( 1-dot) * cxmy + (1+dot) * cxpy )/2 )*2;

        // if !q??, this doesn't need to be processed.
		const sxmy = sin(xmy);
		const sxpy = sin(xpy);

		const Cx = ( (ay*qz-az*qy) * (cxmy - cxpy) +  ax * (sxmy + sxpy) + qx * (sxpy - sxmy) );
		const Cy = ( (az*qx-ax*qz) * (cxmy - cxpy) +  ay * (sxmy + sxpy) + qy * (sxpy - sxmy) );
		const Cz = ( (ax*qy-ay*qx) * (cxmy - cxpy) +  az * (sxmy + sxpy) + qz * (sxpy - sxmy) );

		const Clx = sqrt(Cx*Cx+Cy*Cy+Cz*Cz)
		if( Clx ) {
			qx = Cx*Clx;
			qy = Cy*Clx;
			qz = Cz*Clx;
		} else {
			// leave the axis alone.
		}
	}
	
	this.qx = qx;
	this.qy = qy;
	this.qz = qz;
	this.??  = q??;
	this.x  = qx * q??;
	this.y  = qy * q??;
	this.z  = qz * q??;
	this.dirty = false;
	return this;
}

lnQuat.prototype.apply = function( v ) {
	const q = this.update();
	//return this.applyDel( v, 1.0 );
	if( v instanceof lnQuat ) {

		const c = Math.cos(q.??);
		const s = Math.sin(q.??);

		const qx = q.nx, qy = q.ny, qz = q.nz;
		const vx = v.x , vy = v.y , vz = v.z;
		// (1-cos theta) * dot
		// 1-cos theta * cos(angle between vectors)
		const dot =  (1-c)*((qx * vx ) + (qy*vy)+(qz*vz));
		// v *cos(theta) + sin(theta)*cross + q * dot * (1-c)
		v.x = vx*c + s*(qy * vz - qz * vy) + qx * dot;
		v.y = vy*c + s*(qz * vx - qx * vz) + qy * dot;
		v.z = vz*c + s*(qx * vy - qy * vx) + qz * dot;
		v.dirty = true;
		return v.update();
		const this_ = this;
		const result = new lnQuat(
			function() {
				this_.update(); 
	            return finishRodrigues( v.update(), 0, this_.nx, this_.ny, this_.nz, this_.?? );
			}
		);
		return result.refresh();
	}

	// 3+2 +sqrt+exp+sin
	if( !q.?? ) {
		// v is unmodified.	
		return new vectorType( v.x, v.y, v.z ); // 1.0
	} else {
		// https://en.wikipedia.org/wiki/Rodrigues%27_rotation_formula
		// this is Rodrigues rotation formula.  2 multiplies shorter, and 1 less add than below quat method
		const c = Math.cos(q.??);
		const s = Math.sin(q.??);

		const qx = q.nx, qy = q.ny, qz = q.nz;
		const vx = v.x , vy = v.y , vz = v.z;
		// (1-cos theta) * dot
		// 1-cos theta * cos(angle between vectors)
		const dot =  (1-c)*((qx * vx ) + (qy*vy)+(qz*vz));
		// v *cos(theta) + sin(theta)*cross + q * dot * (1-c)
		return new vectorType(
			  vx*c + s*(qy * vz - qz * vy) + qx * dot
			, vy*c + s*(qz * vx - qx * vz) + qy * dot
			, vz*c + s*(qx * vy - qy * vx) + qz * dot );
	} 
}

//-------------------------------------------

// this, 
//   v ector input to rotate.  (or value)
//  del is the amount of this to apply 
// if q2 is specified, then the delta is between q2 and this (q)
// del2 is the amount of Q2 to apply to (timescalar)

lnQuat.prototype.applyDel = function( v, del, q2, linear, result2 ) {
	if( 0 && v instanceof lnQuat ) {
		const result = new lnQuat(
			function() {
				const q = v;
				const ax = q.nx;
				const ay = q.ny;
				const az = q.nz;
				return finishRodrigues( q, 0, ax, ay, az, q.??*del );
			}
		);
		return result.refresh();
	}
	const q = this;
	if( 'undefined' === typeof del ) del = 1.0;
	this.update();
	// 3+2 +sqrt+exp+sin
	if( !(q.??*del) && !q2 ) {
		// v is unmodified.	
		if( result2 ) 
			result2.portion = this;
		return new vectorType(v.x, v.y, v.z ); // 1.0
	} else  {
		if( q2 ) {
			q2.update();
			let ax = 0;
			let ay = 0;
			let az = 0;

			const target = new lnQuat();
			if( linear === true ) {
				target.x = q2.x + this.x*del
				target.y = q2.y + this.y*del
				target.z = q2.z + this.z*del
				target.dirty = true; 
				target.update();
			} else {
				q2.slerp( q, del, target).update();
			}

			ax = target.nx;
			ay = target.ny;
			az = target.nz;
			
			if( result2 && !result2.portion )
				result2.portion = target;

			const ?? = target.??;

			if( !?? ) {
				return {x:v.x, y:v.y, z:v.z }; // 1.0
			}

			// this is still the half-angle quaternion rotate.
			const s = Math.sin( ?? );  //;
			const c = Math.cos( ?? );  // quaternion q.w  = (exp(lnQ)) [ *exp(lnQ.W=0) ]
			
			const qx = ax, qy = ay, qz = az;
			const vx = v.x , vy = v.y , vz = v.z;
			// (1-cos theta) * dot
			const dot =  (1-c)*((qx * vx ) + (qy*vy)+(qz*vz));
			// v *cos(theta) + sin(theta)*cross + q * dot * (1-c)
			return new vectorType(
				  vx*c + s*(qy * vz - qz * vy) + qx * dot
				, vy*c + s*(qz * vx - qx * vz) + qy * dot
				, vz*c + s*(qx * vy - qy * vx) + qz * dot );
		}
		if( result2 && !result2.portion )
			result2.portion = new lnQuat( 0, q.x*del, q.y*del, q.z * del );

		// rodrigues full angle multiply
		const c = Math.cos(q.??*del);
		const s = Math.sin(q.??*del);

		const qx = q.nx, qy = q.ny, qz = q.nz;
		const vx = v.x , vy = v.y , vz = v.z;
		// (1-cos theta) * dot
		const dot =  (1-c)*((qx * vx ) + (qy*vy)+(qz*vz));
		// v *cos(theta) + sin(theta)*cross + q * dot * (1-c)
		return new vectorType(
			  vx*c + s*(qy * vz - qz * vy) + qx * dot
			, vy*c + s*(qz * vx - qx * vz) + qy * dot
			, vz*c + s*(qx * vy - qy * vx) + qz * dot );
	}
}

lnQuat.apply = function( angle, axis, v, del, target ) {
	target = target || new vectorType();

	if( 'undefined' === typeof del ) del = 1.0;
	//this.update();
	// 3+2 +sqrt+exp+sin
	if( !(angle*del) ) {
		target.set( v.x, v.y, v.z );
		return target; // 1.0
	} else  {
		const len = Math.sqrt( axis.x * axis.x + axis.y * axis.y + axis.z * axis.z );
		const qx = axis.x / len, qy = axis.y / len, qz = axis.z / len;
		// rodrigues full angle multiply
		const c = Math.cos(angle*del);
		const s = Math.sin(angle*del);

		const vx = v.x , vy = v.y , vz = v.z;
		const dot =  (1-c)*((qx * vx ) + (qy*vy)+(qz*vz));
		target.set(
			  vx*c + s*(qy * vz - qz * vy) + qx * dot
			, vy*c + s*(qz * vx - qx * vz) + qy * dot
			, vz*c + s*(qx * vy - qy * vx) + qz * dot );
		return target;
	}
}

lnQuat.prototype.slerpRel = function( q2, del ) {
	const newQ = new lnQuat( 0, this.x+q2.x, this.y+q2.y, this.z+q2.z).update();
	const result = longslerp( this, newQ, del );
	return result;
}


lnQuat.prototype.applyInv = function( v ) {
	return this.applyDel( v, -1 );
}

lnQuat.prototype.slerp = function( p, t, target, oct ) {
	if( lnQuat.SLERP ) {
		return longslerp( this, p, t,target );
	}

	return slerp2( this, p, t, target, oct )
}
// q= quaternion to rotate; oct = octive to result with; ac/as cos/sin(rotation) ax/ay/az (normalized axis of rotation)
const axisTemp = {x:0,y:0,z:0};
function slerp2( q, p, t, target, external ) {
	external = external || 0;
	// A dot B   = cos( angle A->B )
	// cross product of the rotations is a rotation perpendicular to the two
	// with an arc length of arccos( q x p ), scaled by 0-1 passed in as T.
	if( !q.??) {
		target.nx = p.nx;
		target.ny = p.ny;
		target.nz = p.nz;
		target.?? = t * p.??;
		target.x = target.nx * target.??;
		target.y = target.ny * target.??;
		target.z = target.nz * target.??;
		return target;
	}

	target.set( p );
	// remove the rotation of q from p...
	finishRodrigues( target, Math.floor( q.??/(Math.PI*2)), q.nx, q.ny, q.nz, -q.?? );
	// which sets target as the initial P rotation.
	
	axisTemp.x = target.nx;
	axisTemp.y = target.ny;
	axisTemp.z = target.nz;
	let tmpA;
	if( !external ) // delta angle is from an internal source
		tmpA = q.applyDel( axisTemp, 1 );
	else
		tmpA = axisTemp;
	const angle = target.??;
	target.set(q);
	return finishRodrigues( target, Math.floor( q.??/(Math.PI*2)), tmpA.x, tmpA.y, tmpA.z, angle*t );
}



// q= quaternion to rotate; oct = octive to result with; ac/as cos/sin(rotation) ax/ay/az (normalized axis of rotation)
function finishRodrigues( q, oct, ax, ay, az, th ) {
	oct = oct || 0;
	// A dot B   = cos( angle A->B )
	// cos( C/2 ) 
	//  cos(angle between the two rotation axii)
	const AdotB = (q.nx*ax + q.ny*ay + q.nz*az);
	/*
	// orbital hopping mechanic... 
	// hypothetical relation mass to orbital
	if( AdotB > 0.99 ) {
		if( q.?? + th > Math.PI*4 )
			oct++;
	} else if( cosCo2 < -0.99 ){
		if( q.?? - th < -Math.PI*4 )
			oct--;
	}
	*/

	// using sin(x+y)+sin(x-y)  expressions replaces multiplications with additions...
	// same sin/cos lookups sin(x),cos(x),sin(y),cos(y)  
	//   or sin(x+y),cos(x+y),sin(x-y),cos(x-y)
	const xmy = (th - q.??)/2; // X - Y  ('x' 'm'inus 'y')
	const xpy = (th + q.??)/2  // X + Y  ('x' 'p'lus 'y' )
	const cxmy = Math.cos(xmy);
	const cxpy = Math.cos(xpy);

	// cos(angle result)
	//const cosCo2 = ( ( 1-AdotB )*cxmy + (1+AdotB)*cxpy )/2;
	// ( 2 cos(x) cos(y) - 2 A sin(x) sin(y) ) / 2
	const cosCo2 = ( ( AdotB )*(cxpy - cxmy) + cxmy + cxpy )/2;
	//   (1-cos(A))cos(x-y)+(1+cos(A))cos(x+y)
	//    cos(A) (cos(x + y) - cos(x - y)) + cos(x - y) + cos(x + y)
	// octive should have some sort of computation that gets there...
	// would have to be a small change
	let ang = acos( cosCo2 )*2 + oct * (Math.PI*4);

	if( ang ) {
		const sxmy = Math.sin(xmy);
		const sxpy = Math.sin(xpy);
		// vector rotation is just...
		// when both are large, cross product is dominant (pi/2)
		const ss1 = sxmy + sxpy  // 2 cos(y) sin(x)
		const ss2 = sxpy - sxmy  // 2 cos(x) sin(y)
		const cc1 = cxmy - cxpy  // 2 sin(x) sin(y)

		//1/2 (B sin(a/2) cos(b/2) - A sin^2(b/2) + A cos^2(b/2))
		// the following expression is /2 (has to be normalized anyway keep 1 bit)
		// and is not normalized with sin of angle/2.
		const crsX = (ay*q.nz-az*q.ny);
		const crsY = (az*q.nx-ax*q.nz);
		const crsZ = (ax*q.ny-ay*q.nx);
		const Cx = ( crsX * cc1 +  ax * ss1 + q.nx * ss2 );
		const Cy = ( crsY * cc1 +  ay * ss1 + q.ny * ss2 );
		const Cz = ( crsZ * cc1 +  az * ss1 + q.nz * ss2 );

		// this is NOT /sin(theta);  it is, but only in some ranges...
		const Clx = (lnQuat.sinNormal)
		          ?(1/(2*Math.sin( ang/2 )))
		          :1/Math.sqrt(Cx*Cx+Cy*Cy+Cz*Cz);
		if(0) {
			// this normalizes the rotation so there's no overflows.
			const other = 1/Math.sqrt(Cx*Cx+Cy*Cy+Cz*Cz);
			if( Math.abs( other - Clx ) > 0.001 ) {
				console.log( "Compare A and B:", Clx, other, th, q.?? );
			}
		}
		q.rn = Clx; // I'd like to save this to see what the normal actually was
		q.??  = ang;
		q.nx = Cx*Clx;
		q.ny = Cy*Clx;
		q.nz = Cz*Clx;

		q.x  = q.nx*ang;
		q.y  = q.ny*ang;
		q.z  = q.nz*ang;

		q.dirty = false;
	} else {
		// result angle is 0
		if( AdotB > 0 ) {
			q.??  = q.??+th;
		}else {
			q.??  = q.??+th;
		}
		q.x = (q.nx) * q.??;
		q.y = (q.ny) * q.??;
		q.z = (q.nz) * q.??;
		q.dirty = false;
	}
	return q;
}


lnQuat.prototype.spin = function(th,axis,oct){
	// input angle...
	if( "undefined" === typeof oct ) oct = 4;
	if( this.dirty ) this.update();

	// ax, ay, az could be given; these are computed as the source quaternion normal
	const aLen = Math.sqrt(axis.x*axis.x + axis.y*axis.y + axis.z*axis.z);
	const ax_ = axis.x/aLen;
	const ay_ = axis.y/aLen;
	const az_ = axis.z/aLen;
	// make sure it's normalized

	//-------- apply rotation to the axle... (put axle in this basis)
	const nst = Math.sin(this.??/2); // normal * sin_theta
	const qw = Math.cos(this.??/2);  //Math.cos( pl );   quaternion q.w  = (exp(lnQ)) [ *exp(lnQ.W=0) ]
	
	const qx = this.nx*nst;
	const qy = this.ny*nst;
	const qz = this.nz*nst;
	
	//p????? = (v*v.dot(p) + v.cross(p)*(w))*2 + p*(w*w ????? v.dot(v))
	const tx = 2 * (qy * az_ - qz * ay_); // v.cross(p)*w*2
	const ty = 2 * (qz * ax_ - qx * az_);
	const tz = 2 * (qx * ay_ - qy * ax_);
	const ax = ax_ + qw * tx + ( qy * tz - ty * qz )
	const ay = ay_ + qw * ty + ( qz * tx - tz * qx )
	const az = az_ + qw * tz + ( qx * ty - tx * qy );

	return finishRodrigues( this, oct-4, ax, ay, az, th );
}

lnQuat.prototype.freeSpin = function(th,axis){
	const ax_ = axis.x;
	const ay_ = axis.y;
	const az_ = axis.z;
	// make sure it's normalized
	const aLen = Math.sqrt(ax_*ax_ + ay_*ay_ + az_*az_);
	if( aLen ) {
		const ax = ax_/aLen;
		const ay = ay_/aLen;
		const az = az_/aLen;

		return finishRodrigues( this, 0, ax, ay, az, th );
	}
	return this;
}

lnQuat.prototype.twist = function(c){
	return yaw( this, c );
}
lnQuat.prototype.pitch = function(c){
	return pitch( this, c );
}
lnQuat.prototype.yaw = function(c){
	return yaw( this, c );
}
lnQuat.prototype.roll = function(c){
	return roll( this, c );
}


function pitch( q, th ) {
	const s  = Math.sin( q.?? ); // sin/cos are the function of exp()
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const c = 1- c1;

	const cnx = c*q.nx
	const ax = ( cnx*q.nx + c1 );
	const ay = ( cnx*q.ny + s*q.nz );
	const az = ( cnx*q.nz - s*q.ny );

	return finishRodrigues( q, 0, ax, ay, az, th );
}

function roll( q, th ) {
	// input angle...
	const s  = Math.sin( q.?? ); // sin/cos are the function of exp()
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const c = 1- c1;

	const cnz = c * q.nz;
	const ax = ( cnz*q.nx ) + s*q.ny;
	const ay = ( cnz*q.ny ) - s*q.nx;
	const az = ( cnz*q.nz ) + c1;

	return finishRodrigues( q, 0, ax, ay, az, th );
}

function yaw( q, th ) {
	// input angle...
	const s = Math.sin( q.?? ); // double angle sin
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const c = 1- c1;

	const cny = c * q.ny;
	const ax = ( cny*q.nx ) - s*q.nz;
	const ay = ( cny*q.ny ) + c1;
	const az = ( cny*q.nz ) + s*q.nx;
	//console.log( "Rotate ", q.nx, q.ny, q.nz, ax, ay, az, th );
	return finishRodrigues( q, 0, ax, ay, az, th );
}

lnQuat.prototype.up = function() {	
	// just go ahead and get the basis!
	const q = this;
	if( q.dirty ) q.update();
	// input angle...
	const s = Math.sin( q.?? ); // double angle sin
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const c = 1- c1;
	const cn = c*q.ny;
	return new vectorType( 
	        -s*q.nz  + cn*q.nx
	       , c1      + cn*q.ny  //( c + (1-c)yy =  c +yy-cyy  =  c(1-yy)+yy
	       , s*q.nx  + cn*q.nz
	       );
}


lnQuat.prototype.yaw2 = function( th ) {	
	// just go ahead and get the basis!
	const q = this;
	if( q.dirty ) q.update();
	// input angle...
	const s = Math.sin( q.?? ); // double angle sin
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const ths = Math.sin(th);
	const thc = Math.cos(th);
	const c = 1- c1;
	const cn = c*q.ny;

	ax = -s*q.nz  + cn*q.nx
	ay = c1      + cn*q.ny  //( c + (1-c)yy =  c +yy-cyy  =  c(1-yy)+yy
	az = s*q.nx  + cn*q.nz

// x = th
// y = q.theta
	const cosCo2 = thc * c1 -   q.ny *( ths * s)

	//const cosCo2 = ( ( AdotB )*(cxpy - cxmy) + cxmy + cxpy )/2;
	//   (1-cos(A))cos(x-y)+(1+cos(A))cos(x+y)
	//    cos(A) (cos(x + y) - cos(x - y)) + cos(x - y) + cos(x + y)
	// octive should have some sort of computation that gets there...
	// would have to be a small change
	let ang = acos( cosCo2 )*2 + oct * (Math.PI*4);

	if( ang ) {
		const sxmy = Math.sin(xmy);
		const sxpy = Math.sin(xpy);
		// vector rotation is just...
		// when both are large, cross product is dominant (pi/2)
		const ss1 = 2*c1*ths;//sxmy + sxpy  // 2 cos(y) sin(x)
		const ss2 = 2*thc*s;//sxpy - sxmy  // 2 cos(x) sin(y)
		const cc1 = 2*ths*s;//cxmy - cxpy  // 2 sin(x) sin(y)

		//1/2 (B sin(a/2) cos(b/2) - A sin^2(b/2) + A cos^2(b/2))
		// the following expression is /2 (has to be normalized anyway keep 1 bit)
		// and is not normalized with sin of angle/2.
		const crsX = (ay*q.nz-az*q.ny);
		const crsY = (az*q.nx-ax*q.nz);
		const crsZ = (ax*q.ny-ay*q.nx);
		const Cx = ( crsX * cc1 +  ax * ss1 + q.nx * ss2 );
		const Cy = ( crsY * cc1 +  ay * ss1 + q.ny * ss2 );
		const Cz = ( crsZ * cc1 +  az * ss1 + q.nz * ss2 );

		// this is NOT /sin(theta);  it is, but only in some ranges...
		const Clx = (lnQuat.sinNormal)
		          ?(1/(2*Math.sin( ang/2 )))
		          :1/Math.sqrt(Cx*Cx+Cy*Cy+Cz*Cz);
		if(0) {
			// this normalizes the rotation so there's no overflows.
			const other = 1/Math.sqrt(Cx*Cx+Cy*Cy+Cz*Cz);
			if( Math.abs( other - Clx ) > 0.001 ) {
				console.log( "Compare A and B:", Clx, other, th, q.?? );
			}
		}
		q.rn = Clx; // I'd like to save this to see what the normal actually was
		q.??  = ang;
		q.nx = Cx*Clx;
		q.ny = Cy*Clx;
		q.nz = Cz*Clx;

		q.x  = q.nx*ang;
		q.y  = q.ny*ang;
		q.z  = q.nz*ang;

		q.dirty = false;
	} else {
		// result angle is 0
		q.??  = ang;
		q.x = (q.nx=1) * 0;
		q.y = (q.ny=0) * 0;
		q.z = (q.nz=0) * 0;
		q.dirty = false;
	}
	return q;
}


lnQuat.prototype.right = function() {	
	// just go ahead and get the basis!
	const q = this;
	if( q.dirty ) q.update();
	// input angle...
	const s = Math.sin( q.?? ); // double angle sin
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const c = 1- c1;
	const cn = c*q.nx;
	return new vectorType( 
	         c1      + cn*q.nx
	       , s*q.nz  + cn*q.ny
	       ,-s*q.ny  + cn*q.nz
	       );
}

lnQuat.prototype.forward = function() {	
	// just go ahead and get the basis!
	const q = this;
	if( q.dirty ) q.update();
	// input angle...
	const s = Math.sin( q.?? ); // double angle sin
	const c1 = Math.cos( q.?? ); // sin/cos are the function of exp()
	const c = 1- c1;
	const cn = c*q.nz;
	return new vectorType( 
	         s*q.ny + cn*q.nx
	       ,-s*q.nx + cn*q.ny
	       , c1     + cn*q.nz
	       );
}


// rotate the passed vector 'from' this space
lnQuat.prototype.sub2 = function( q ) {
	const qRes = new lnQuat( this ).addConj( q );
	return qRes;//.update();
}

lnQuat.prototype.addConj = function( q ) {
	//this.w += q.w;
	this.x -= q.x;
	this.y -= q.y;
	this.z -= q.z;
	this.dirty = true;
	return this;//.update();
}


function deg2rad(n) { return n * Math.PI/180 }

// v is a point (x,y,z)
// q is the relative origin rotation
// range is the expected distance... (should? only return +/-1 range)
// q.applyInverse( v ) and then use the result as a new normal and compute x/z relative 
function SphereToXY( q, v, range ){
	
	const s  = Math.sin( q.??/2 );
	const qw = Math.cos( q.??/2 );
	
	const dqw = s/q.??; // sin(theta)/r
	// inverse
	const qx = -q.x * dqw;
	const qy = -q.y * dqw;
	const qz = -q.z * dqw;

	const tx = 2 * (qy * v.z - qz * v.y);
	const ty = 2 * (qz * v.x - qx * v.z);
	const tz = 2 * (qx * v.y - qy * v.x);

	const vxOut = v.x + qw * tx + ( qy * tz - ty * qz );
	const vyOut = v.y + qw * ty + ( qz * tx - tz * qx );
	const vzOut = v.z + qw * tz + ( qx * ty - tx * qy );

	{ // convert normal to x/0/z normal
		const l3 = Math.sqrt(vxOut*vxOut+vyOut*vyOut+vzOut*vzOut);
		const tmpy = vyOut /l3; // square normal
		const cosTheta = Math.acos( tmpy ); // 1->-1 (angle from pole around this circle.
		const norm1 = Math.sqrt(vxOut*vxOut+vzOut*vzOut);
		return {x: (vzOut/norm1 * cosTheta/range), y: (-vxOut/norm1 * cosTheta)/range };
	}
}

// o is the origin of the grid
// x/y is an angle to map... 
function updateGridXY(q, x, y, o ){

	//lnQ.x = theta; lnQ.y = 0; lnQ.z = gamma;
	//lnQ.dirty = true;
	const qlen = Math.sqrt(x*x + y*y);

	const qnx = qlen?x / qlen:0;
	const qny = qlen?0:1;
	const qnz = qlen?y / qlen:0;

	const ax = o.nx
	const ay = o.ny
	const az = o.nz
	const th = o.??

	{ // finish rodrigues
		const AdotB = (qnx*ax + /*q.ny*ay +*/ qnz*az);
	
		const xmy = (th - qlen)/2; // X - Y  (x minus y)
		const xpy = (th + qlen)/2  // X + Y  (x plus y )
		const cxmy = Math.cos(xmy);
		const cxpy = Math.cos(xpy);
		const cosCo2 = ( ( 1-AdotB )*cxmy + (1+AdotB)*cxpy )/2;
	
		let ang = Math.acos( cosCo2 )*2;
		// only good for rotations between 0 and pi.
	
		if( ang ) {
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
			
			q.??  = ang;
			q.nx = Cx*Clx;
			q.ny = Cy*Clx;
			q.nz = Cz*Clx;
			
			q.x  = q.nx*ang;
			q.y  = q.ny*ang;
			q.z  = q.nz*ang;
	
			q.dirty = false;
		} else {
			// two axles are coincident, add...
			if( AdotB > 0 ) {
				q.x = qnx * (qlen+th);
				q.y = qny * (qlen+th);
				q.z = qnz * (qlen+th);
			}else {
				q.x = qnx * (qlen-th);
				q.y = qny * (qlen-th);
				q.z = qnz * (qlen-th);
			}
			q.dirty = true;
		}
	}
	return q;
}


class EulerRotor {
	x = new lnQuat(0,0,0,0);
	y = new lnQuat(0,0,0,0);
	z = new lnQuat(0,0,0,0);
	//t = new lnQuat();

	/*
	const t2 = new lnQuat( 0, lnQ2.x,lnQ2.y,lnQ2.z).update().freeSpin( lnQ1.??, lnQ1 );
	const t3 = new lnQuat( 0, lnQ3.x,lnQ3.y,lnQ3.z).update().freeSpin( t2.??, t2 );
	const t4 = new lnQuat( 0, lnQ4.x,lnQ4.y,lnQ4.z).update().freeSpin( t3.??, t3 );
	const t5 = new lnQuat( 0, lnQ5.x,lnQ5.y,lnQ5.z).update().freeSpin( t4.??, t4 );
	*/
	
	constructor(x_,y_,z_) {
		this.x.x = x_;
		this.x.dirty = true;
		this.y.y = y_;
		this.y.dirty = true;
		this.z.z = z_;
		this.z.dirty = true;
	}
	update() {
		this.x.update();
		this.y.update();
		this.z.update();
		return this;
	}
	applyDel( v, del, v2, del2 ) {
		//const a = x.
		return v;
	}
	get lnQuat() {
		this.y.update(); this.z.update();
		const t = this.x.freeSpin( this.y.??, this.y );
		t.freeSpin( this.z.??, this.z );
		return t;
	}
	get x() {
		return this.x.x;
	}		
	get nx() {
		return this.x.nx;
	}		
	get y() {
		return this.y.y;
	}		
	get ny() {
		return this.y.ny;
	}		
	get z() {
		return this.z.z;
	}		
	get nz() {
		return this.z.nz;
	}
	set x(v) {
		this.x.x = v;
		this.x.dirty = true;
	}		
	set y(v) {
		this.y.y = v;
		this.y.dirty = true;
	}		
	set z(v) {
		this.z.z = v;
		this.z.dirty = true;
	}
	freeSpin(th,v){
		const a = this.x.freeSpin( th, v );
		const b = this.y.freeSpin( th, v );
		const c = this.z.freeSpin( th, v );
		
		return c;
	}		

	getBasisT(T){
		return new lnQuat( 0, this.x.x, this.y.y, this.z.z ).update().getBasisT(T);
	}		

	apply(v){
		if( v instanceof EulerRotor ) {

			const t2 = this.x.update();
			const t3 = this.y.update().freeSpin( t2.??, t2 );
			const t4 = this.z.update().freeSpin( t3.??, t3 );

			return t4;	
		}
						
		const a = this.x.apply( v );
		const b = this.y.apply( a );
		const c = this.z.apply( b );
		return c;
	}		
}

// -------------------------------------------------------------------------------
//  Quaternion (Rotation part)
// -------------------------------------------------------------------------------


lnQuat.quatToLogQuat = quatToLogQuat;

// Accept any generalized quaternion {w,x,y,z}
function quatToLogQuat( q, target ) {
	target = target || new lnQuat();
	const w = q.w;
	const r = Math.sqrt(q.x*q.x+q.y*q.y+q.z*q.z);
	if( ASSERT )
	{
		// just a warning.
		if( Math.abs( 1.0 - r ) > 0.001 ) console.log( "Input quat was denormalized", l );
	}
	const bal = Math.sqrt( w*w + r*r );
	
	const ang = acos(w/bal)*2;
	const s = bal*Math.sin(ang/2);
	if( !s ) {
		if( r )
			return target.set( 0, q.x/r, q.y/r, q.z/r ).update();	
		else
			return target.set( 0, 0, 0, 0 ).update();	
	}
	return target.set( 0, ang*q.x/s, ang*q.y/s, ang*q.z/s ).update();
}

function quatArrayToLogQuat( q, target ) {
	return quatToLogQuat( {x:q[0],y:q[1],z:q[2],w:q[3]}, target );
}


function longslerp(a, b, t, target ) {
	var p = axisAngleToQuaternion([ a.x, a.y, a.z]);
	var q = axisAngleToQuaternion([ b.x, b.y, b.z]);
	// do proper quaternion slerp thanks to  Richard Copley <buster at buster dot me dot uk>
	return quatArrayToLogQuat( slerp(p, q, t), target );		
}

// -*- coding: utf-8; -*-

// Copyright 2019, Richard Copley <buster at buster dot me dot uk>

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


    // Assuming p and q are not parallel or antiparallel, return a quaternion
    // that interpolates between p and q.
    function slerp(p, q, t) {
      normalizeQuaternion(p);
      normalizeQuaternion(q);
      var cosTheta = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
      var theta = Math.acos(cosTheta);

      // Find the arc length from p to q along a great circle on the unit
      // sphere. (The unit sphere is a 3-dimensional surface in the
      // 4-dimensional space of quaternions).

      // Interpolate.
      var sinTheta = Math.sin(theta);
      var s0 = Math.sin((1 - t) * theta) / sinTheta;
      var s1 = Math.sin(t * theta) / sinTheta;
      return [
        s0 * p[0] + s1 * q[0],
        s0 * p[1] + s1 * q[1],
        s0 * p[2] + s1 * q[2],
        s0 * p[3] + s1 * q[3]
      ];
    }

    function axisAngleToQuaternion(v) {
      // If A = (x0,y0,z0) is the unit length axis of rotation and if ?? is the
      // angle of rotation, a quaternionq=w+xi+yj+zk that represents the rotation
      // satisfies w= cos(??/2), x=x0 sin(??/2), y=y0 sin(??/2) and z=z0 sin(??/2).

      var angle = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (angle === 0) {
        return [0, 0, 0, 1];
      }
      var k = Math.sin(angle / 2) / angle, c = Math.cos(angle / 2);
      return [k * v[0], k * v[1], k * v[2], c];
    }

    function quaternionToMatrix(q) {
      var xx = q[0] * q[0];
      var xy = q[0] * q[1];
      var xz = q[0] * q[2];
      var xw = q[0] * q[3];

      var yy = q[1] * q[1];
      var yz = q[1] * q[2];
      var yw = q[1] * q[3];

      var zz = q[2] * q[2];
      var zw = q[2] * q[3];

      var ww = q[3] * q[3];

      return [
        [1 - 2 * yy - 2 * zz, 2 * xy - 2 * zw, 2 * xz + 2 * yw],
        [2 * xy + 2 * zw, 1 - 2 * xx - 2 * zz, 2 * yz - 2 * xw],
        [2 * xz - 2 * yw, 2 * yz + 2 * xw, 1 - 2 * xx - 2 * yy]
      ];
    }

    // Multiply 3-by-3 matrices.
    function normalizeQuaternion(q) {
      var length = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
      q[0] /= length;
      q[1] /= length;
      q[2] /= length;
      q[3] /= length;
    }

    function leftPad(string, width)
    {
      var result = "";
      for (var i = string.length; i < width; ++ i) {
        result += " ";
      }
      return result + string;
    }

    function formatNumber(x) {
      return leftPad(x.toFixed(4), 8);
    }

    function matrixToString(m) {
      var text = "";
      for (var i = 0; i != 3; ++i) {
        for (var j = 0; j != 3; ++j) {
          text = text + formatNumber(m[i][j]);
        }
        text = text + "\n";
      }
      return text;
    }

    // Multiply transpose of matrix a by matrix b.
    function matrixMultiplyTranspose(a, b) {
      return [
        [
          a[0][0] * b[0][0] + a[0][1] * b[0][1] + a[0][2] * b[0][2],
          a[0][0] * b[1][0] + a[0][1] * b[1][1] + a[0][2] * b[1][2],
          a[0][0] * b[2][0] + a[0][1] * b[2][1] + a[0][2] * b[2][2],
        ],
        [
          a[1][0] * b[0][0] + a[1][1] * b[0][1] + a[1][2] * b[0][2],
          a[1][0] * b[1][0] + a[1][1] * b[1][1] + a[1][2] * b[1][2],
          a[1][0] * b[2][0] + a[1][1] * b[2][1] + a[1][2] * b[2][2],
        ],
        [
          a[2][0] * b[0][0] + a[2][1] * b[0][1] + a[2][2] * b[0][2],
          a[2][0] * b[1][0] + a[2][1] * b[1][1] + a[2][2] * b[1][2],
          a[2][0] * b[2][0] + a[2][1] * b[2][1] + a[2][2] * b[2][2],
        ]
      ];
    }

    function formatAxisAndAngle(v) {
      var angle = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      var axis = [v[0] / angle, v[1] / angle, v[2] / angle];
      var text = "angle" + formatNumber(angle) + ", axis";
      if (angle) {
        text = text +
          formatNumber(axis[0]) +
          formatNumber(axis[1]) +
          formatNumber(axis[2]);
      }
      else {
        text = text + " undefined";
      }
      return text;
    }

    function matrixToAxisAngle(m) {
      var trace = m[0][0] + m[1][1] + m[2][2];
      trace = Math.min(3, Math.max(-1, trace));
      var angle = Math.acos((trace - 1) / 2);
      var v = [
        m[2][1] - m[1][2],
        m[0][2] - m[2][0],
        m[1][0] - m[0][1]
      ];
      var k = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      if (k) {
        v[0] *= angle / k;
        v[1] *= angle / k;
        v[2] *= angle / k;
      }
      return v;
    }

export class directedDistance extends lnQuat {

	addScaledVector( v, s ) {
            this.x += v.x*s;
            this.y += v.y*s;
            this.z += v.z*s;
            this.dirty = true;
            return this;
        }
        multiplyScalar(s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
            this.dirty = true;
            return this;
            }
        clone() {
            return new directedDistance( this );
        }
}

export {lnQuat}
