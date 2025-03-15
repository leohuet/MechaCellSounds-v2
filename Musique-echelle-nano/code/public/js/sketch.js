const windowWidth = window.innerWidth;
var windowHeight = window.innerHeight;
var socket = io();
socket.connect('http://127.0.0.1:8000');
socket.send(`${windowWidth} windowwidth`);
var old_picture = 1;

if(windowWidth > windowHeight){
  var picwidth = windowHeight;
  var picheight = windowHeight;
}
else{
  var picwidth = windowWidth;
  var picheight = windowWidth;
}

var size = 15;
var nopressuresize = 30;
let img;
let picture = 0;

function setup() {
  const myCanvas = createCanvas(picwidth, picheight);
  myCanvas.parent("sketch");
  noStroke();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showHidePicture(checkBox){
  if(!checkBox){
    picture = 0;
  }
  else{
    picture = 1;
    drawPicture(cells[cell-1], type);
  }
}

var drawPicture = function drawPicture(pic, type, onoff){
  if(onoff){
    picture = 1;
    if(type != 'none'){
      img = loadImage(`media/pics/${pic}_${type}.png`);
    }
    else{
      picture = 0;
    }
  }
  else{
    picture = 0;
  }
}

var changePicture = function changePicture(orientation){
  if(orientation == 'portrait' && user_launched){
    picwidth = windowWidth;
    socket.send(`${picwidth} picwidth`);
    picheight = windowWidth;
    img.resize(picwidth, picheight);
    resizeCanvas(picwidth, picheight);
  }
}

function sizeCercle(force, pressure){
  if(pressure){
    size = force*500+30;
  }
  else{
    nopressuresize += .5;
    size = nopressuresize;
  }
}

function sliderSize(value){
  if(size >= 15 && size <= 35 && value == 1){
    size = size+value*10;
  }
  else if(size >= 25 && size <= 45 && value == -1){
    size = size+value*10;
  }
  socket.send(`${user} size ${size}`);
  console.log(`${user} size ${size}`);
}

function resetForce(){
  size = 30
  nopressuresize = 30;
}

var is_on_cell = function is_on_cell(){
  if(mouseX<picwidth && mouseY<picheight){
    return true;
  }
  else{
    return false;
  }
}

function draw() {
  background(255);
  stroke(0)
  square(0, 0, picwidth);
  if(picture != 0){
    image(img, 0, 0, picwidth, picheight);
  }
  if(user_launched){
      send_xy(mouseX/picwidth, mouseY/picheight, size);
      translate(mouseX, mouseY);
      fill(200, 200, 200, 100);
      stroke(0);
      strokeWeight(1);
      circle(0, 0, size);
  }
}
