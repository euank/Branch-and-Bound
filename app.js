var worker = new Worker("BnB.js");
worker._ = _;

worker.onmessage = function(event) {
  var d = event.data;
  console.log(d);
  if(d.type && d.type == "console.log") {
    console.log.apply(console, d.data);
  } else {
    console.log(d.cities);
    console.log(d.bestTour);
    updateDom(d.bestCost, d.iters, d.cities, d.bestTour);
  }

};

function updateDom(bestCost, iters, cities, bestTour) {
  document.querySelector("#len").innerHTML = bestCost;
  document.querySelector("#iters").innerHTML = iters;
  var canvas = document.querySelector("#canvas1");
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.width+1;
  canvas.width = canvas.width-1;
  cities.forEach(function(city) {
    ctx.beginPath();
    ctx.arc(city.x, city.y, 5, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
  });
  var bt = bestTour;
  for(var i=0;i<bt.path.length;i++) {
    var c1 = cities[bt.path[i]];
    var c2 = cities[bt.path[(i+1) % cities.length]];
    ctx.beginPath();
    ctx.moveTo(c1.x,c1.y);
    ctx.lineTo(c2.x,c2.y);
    ctx.stroke();
  }
  canvas = document.querySelector("#canvas2");
  ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.width+1;
  canvas.width = canvas.width-1;
}
