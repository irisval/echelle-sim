
var echellecanvas = document.getElementById("echelle");
var ctx = echellecanvas.getContext("2d");

var spectrumcanvas = document.getElementById("spectra-gif");
var spectrumctx = spectrumcanvas.getContext("2d");

var spectrumgraph = new Image();

var angstroms_per_micron = 10000;
var mm_per_meter = 1000;
var mm_per_angstrom = .0000001;
var MAXO = 150;

var color = "red";

var sigma, delta, theta;    // inputs to the base calculation (Schroeder, 87)
var max_wavelength;     // Longest waelength in Angstroms.
var min_wavelength;     // Shortest waelength in Angstroms.
var camera_focal_length;    // Camera focal length in microns.
var collimator_focal_length;  // Collimator focal length in microns.
var xddeltad;       // Cross disperser delta in degrees
var xdalfbet;       // Cross disperser alpha beta
var xdsigma;          // Cross disperser sigma
var xdsigmai;       // Cross disperser sigma i
var ecsigma;          // Echelle sigma
var ecthetad;       // Echelle theta in degrees
var ecdeltad;       // Echelle delta in degrees
var FSR_2beta;

var base;  // echelle grating constant m*lambda in microns
var demag; // resulting magnification as if there were no dispersers
var bwav;  // the blaze wavelenght of an order in microns
var f2dbdl;  // factor required to compute length on detector of FSR of an order
var xdalphad;// the incident angle (alpha) in degrees
var sinalpha;// sine of the incident angle
var xdangle; // cross disperser angle (not the one that moves)

var i;

var ylimit;
var xlimit;

var fsr = new Array(MAXO);     // Free Spectral Range (mm) of each order
var FSR_2beta = new Array(MAXO); // width of FSR * beta (mm) of each order
var order = new Array(MAXO);      // mapping from 0-n indices to order numbers
var wv = new Array(MAXO);      // blaze wavelength of each order
var xbeta = new Array(MAXO);
var x = new Array(MAXO);     // cross disperser displacement at camera (mm)
var delx = new Array(MAXO);    // tilt delta (mm)

var base;
var max_order_number;
var min_order_number;
var number_of_orders;

var temp;

var X_LOWER_LIMIT = 0;          //  Lower limit on coord in X direction
var X_UPPER_LIMIT = echellecanvas.width;          //  Upper limit on coord in X direction
var Y_LOWER_LIMIT = 0;          //  Lower limit on coord in Y direction
var Y_UPPER_LIMIT = echellecanvas.height;
var ZOOM = 5.0;

var endpoints = [];
var drawable = [];

var drawn = false;

var adjusted_x=0;
var adjusted_y=0;
var ord;
var lambda;

var drag=false;

function transform_mm_to_screen_pixels(mm) {
    var pixels = [0,0];
    pixels[0] = Math.round(FOCAL_PLANE_SCREEN_POSITION[0] + ( ZOOM * mm[0] ));
    pixels[1] = Math.round(FOCAL_PLANE_SCREEN_POSITION[1] + ( -ZOOM * mm[1] ));
    return pixels;
  }

function transform_screen_pixels_to_mm( px, py) {
  var mm = [0,0];
  mm[0] = ( px - FOCAL_PLANE_SCREEN_POSITION[0]) / ZOOM;
  mm[1] = ( py - FOCAL_PLANE_SCREEN_POSITION[1]) / (-ZOOM);
  return mm;
}

(function drawEchelle() {

  if ( color === "red" ) {

    sigma = 18.984;
    delta = 70.53;
    theta = 5.000;
    
    max_wavelength = 9900.0;
    min_wavelength = 3000.0;
    
    camera_focal_length     = 0.763;
    collimator_focal_length = 4.155;
    
    xddeltad = 4.449;
    xdalfbet = 40.0;
    xdsigma  = 4.0;
    xdsigmai = 250.0;
    
    ecsigma = 18.984;
    ecthetad = 5.000;
    ecdeltad = 70.53;

    f2dbdl = camera_focal_length * mm_per_meter / ( sigma * Math.cos( (delta - theta) * Math.PI/180 ) );

    xdangle = 0;
    xdalphad = xdangle + xddeltad + xdalfbet*0.5;
    sinalpha = Math.sin( xdalphad * Math.PI / 180 );
    
    FOCAL_PLANE_SCREEN_POSITION = [(X_UPPER_LIMIT - X_LOWER_LIMIT) / 2 + X_LOWER_LIMIT + 50, 425];
    // console.log("f2dbdl:"+f2dbdl.toString())
  }

  base = 2.0 * sigma * Math.sin( delta * Math.PI/180 ) * Math.cos( theta * Math.PI/180 );
  max_order_number = Math.round( angstroms_per_micron * base / min_wavelength + 0.5 ) + 1;
  min_order_number = Math.round(angstroms_per_micron * base / max_wavelength - 0.5);
  number_of_orders = (max_order_number - min_order_number - 1);

  console.log("drawing orders from "+min_order_number.toString()+" to "+max_order_number.toString());
  // console.log(base);
  // console.log(number_of_orders.toString()+" orders drawn");

  i = -1;
  var mi=0;

  for ( mi = max_order_number; mi >= min_order_number; mi-- ) {
    i++;

    //console.log(mi);

    order[i] = mi;
    bwav = base / order[i];      // blaze wavelength of order i in microns
    wv[i] = bwav * angstroms_per_micron;  // blaze wavelength or order i in Angstroms
    fsr[i] = wv[i] / order[i];   // Free Spectral Range of order i in Angstroms
    FSR_2beta[i]= bwav * f2dbdl;     // length of fsr in mm
  }

  // console.log("FSR_2beta:");
  // console.log(FSR_2beta);
  
  temp = (xdangle + xddeltad - xdalfbet * 0.5) * Math.PI/180;

  for ( i = 0; i <= number_of_orders+1; i++ ) {
    xbeta[i] = Math.asin( xdsigmai * mm_per_angstrom * wv[i] - sinalpha );
  }

  for ( i = 0; i <= number_of_orders+1; i++ ) {
    x[i] = ( xbeta[i] - temp) * camera_focal_length * mm_per_meter;
  }

  for ( i = 1; i <= number_of_orders; i++ ) {
    delx[i] = 0.5 * ( x[i+1] - x[i-1] );  // for subseq tilt calcs
  }

  // console.log("X beta:");
  // console.log(xbeta);
  // console.log("X:");
  // console.log(x);
  // console.log("del X:");
  // console.log(delx);

  // console.log("got this far");
  //console.log(FSR_2beta);
  
  for (i=1; i<=number_of_orders; i++) {
        var mm1 = [0, 0];    // blue end of an order in focal plane mm
        var mm2 = [0, 0];    // red  end of an order in focal plane mm
        var scr1 = [0, 0];    // blue end of an order in screen pixels
        var scr2 = [0, 0];    // red  end of an order in screen pixels

        mm1[0] = -0.5 * FSR_2beta[i];
        mm2[0] = 0.5 * FSR_2beta[i];

        mm1[1] = 0.5 * (x[i] + x[i - 1]);
        mm2[1] = 0.5 * (x[i] + x[i + 1]);

        scr1 = transform_mm_to_screen_pixels(mm1);
        scr2 = transform_mm_to_screen_pixels(mm2);

        endpoints.push([scr1[0], scr1[1], scr2[0], scr2[1]]);
        // drawable.push([scr1[0]-30, scr1[1]+50, scr2[0]-30, scr2[1]+50])
        // console.log(endpoints[i-1]);
  }

  ctx.beginPath();
  ctx.strokeStyle = color;

  // draw the echellogram!
  for (i = 0; i < endpoints.length; i++) {
    var pts = endpoints[i];
    ctx.moveTo(pts[0],pts[1]);
    ctx.lineTo(pts[2],pts[3]);
    ctx.stroke();

    // console.log("line from ("+pts[0].toString()+","+pts[1].toString()+") to ("+pts[2].toString()+","+pts[3].toString()+")");
  }

  xlimit = endpoints[endpoints.length-1][0];
  ylimit = endpoints[endpoints.length-1][3];

  // console.log(endpoints.length.toString()+" orders drawn");
  console.log(order);

  drawn = true;

})();

// console.log(endpoints[1]);

function OffCenterXheight(x_cursor, order_number) {

  var point = endpoints[order_number];

  if ( point == undefined){
    return undefined;
  }

  var slope = -(point[1]-point[3])/(point[2]-point[0]);

  xheight = (slope*(x_cursor-point[0]))+point[1];

  // console.log("y value for order "+order_number.toString()+" at x="+x_cursor.toString()+" is: "+xheight.toString()+". Alternate: "+(x[order_number] + delx[order_number]*x_cursor/FSR_2beta[order_number]).toString());

  return Math.round(xheight);
}

// console.log("test: supposed height for order 81 = "+OffCenterXheight(440,81).toString());

function findOrderIndex(cursor_x, cursor_y) {
  var index = 83;
  var distance = 1000;

  for (var counter = 0; counter <= number_of_orders; counter++) {
    var dist = Math.abs(cursor_y - OffCenterXheight(cursor_x,counter));
    if (dist < distance) {
      distance = dist;
      index = counter;
    }
  }

  return index;
}

function findLambda(orderindex, cursor_x, cursor_y) {
// original x is in millimeters
  var xmm = transform_screen_pixels_to_mm(cursor_x,cursor_y)[0];

  var order_at_cursor = order[orderindex];

  // var y1, dy1;   // intermediate values for cd wavelength calculation
  var blaze_lambda_at_cursor = wv[orderindex];
  var dispamm = fsr[orderindex] / FSR_2beta[orderindex]; //converts free spectral range to mm
  var lambda_at_cursor = blaze_lambda_at_cursor + dispamm * xmm;


  console.log(lambda_at_cursor);

  // y1 = x[ orderindex ];
  // y1 = y1 + delx[ orderindex ] * (xmm)/FSR_2beta[orderindex];
  // dy1 = ( (cursor_y) - y1 ) / delx[orderindex];

  // if ( dy1 > 0.0 ) {
  //   cross_disperser_wavelength = lambda_at_cursor + ( wv[orderindex+1] - wv[orderindex] ) * dy1;
  // }
  // else {
  //   cross_disperser_wavelength = lambda_at_cursor + ( wv[orderindex] - wv[orderindex-1] ) * dy1;
  // }

  return lambda_at_cursor;
}

// (function () {
  // main: this has all of the event capture stuff.
adjusted_x=0;
adjusted_y=0;
ord=1;

document.onmousemove = handleMouseMove;
function handleMouseMove(event) {
  var eventDoc, doc, body, pageX, pageY;

  event = event || window.event; //makes stuff work in IE

  if (event.pageX == null && event.clientX != null) {
      eventDoc = (event.target && event.target.ownerDocument) || document;
      doc = eventDoc.documentElement;
      body = eventDoc.body;

      event.pageX = event.clientX +
        (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
        (doc && doc.clientLeft || body && body.clientLeft || 0);
      event.pageY = event.clientY +
        (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
        (doc && doc.clientTop  || body && body.clientTop  || 0 );
    }

  adjusted_x = event.pageX;
  adjusted_y = event.pageY;
  document.getElementById("Coords").innerHTML = "Cursor location: ("+adjusted_x.toString()+", "+adjusted_y.toString()+")";
  ord = findOrderIndex(adjusted_x,adjusted_y);
  document.getElementById("OrderNum").innerHTML = "Order: "+order[ord].toString();
  // console.log(ord);
  minx = endpoints[ord][0];
  maxx = endpoints[ord][2];

  if (adjusted_x < minx) adjusted_x = minx;
  if (adjusted_x > maxx) adjusted_x = maxx;

  lambda = (findLambda(ord,adjusted_x,adjusted_y)).toPrecision(6);
  document.getElementById("Wavelength").innerHTML = "Lambda = "+lambda.toString();

  if(drag) {
    document.getElementById('detector').style.left = adjusted_x.toString() + 'px';
    document.getElementById('detector').style.top = adjusted_y.toString() + 'px';
  }
}

document.onclick = handleClick;

function handleClick(event) {
  var eventDoc, doc, body, pageX, pageY;

  event = event || window.event; //makes stuff work in IE

  // if clicked on the moving div do stuff???

  if (event.pageX == null && event.clientX != null) {
      eventDoc = (event.target && event.target.ownerDocument) || document;
      doc = eventDoc.documentElement;
      body = eventDoc.body;

      event.pageX = event.clientX +
        (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
        (doc && doc.clientLeft || body && body.clientLeft || 0);
      event.pageY = event.clientY +
        (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
        (doc && doc.clientTop  || body && body.clientTop  || 0 );
  }

  if (!drag) {
    spectrumgraph.onload = function(){
      spectrumctx.drawImage(spectrumgraph,0,0);
    };
    spectrumgraph.src = "spectra/order"+order[ord].toString()+".gif";
  }

}

document.onmouseup = handleMouseUp;

function handleMouseUp(event) {
  drag=false;
}

// })();

