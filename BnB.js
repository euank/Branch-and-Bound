var MAX_X = 100;
var MAX_Y = 100;
var MAX_ITERATIONS = 10;
var NUM_CITIES = 5;

var _ = self._;
var console = {
  log: function() {
    postMessage({type: 'console.log', data: Array.prototype.slice.call(arguments)});
  }
};

self.importScripts("https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.js");

function TSP(numCities) {
  var cities = [];
  for(var i=0;i<numCities;i++) {
    cities.push({
        x: Math.random() * MAX_X,
        y: Math.random() * MAX_Y,
        weights: []
    });
  }
  /* Precalc all weights */
  for(var i=0;i<cities.length;i++) {
    for(var j=0;j<cities.length;j++) {
      if(i == j) continue;
      var xdiff = cities[i].x - cities[j].x;
      var ydiff = cities[i].y - cities[j].y;
      var dist = Math.sqrt(xdiff * xdiff + ydiff * ydiff);
      cities[i].weights[j] = cities[j].weights[i] = dist;
    }
  }

  this.getBasicTour = function() {
    var tour = [];
    var tourLength = 0;
    for(var i=0;i<cities.length;i++) {
      tour.push(i);
      tourLength += cities[i].weights[(i+1) % cities[i].weights.length];
    }
    return {path: tour, distance: tourLength};
  };
  this.cities = cities;
}

var t = new TSP(NUM_CITIES);

function pairsContain(pairs, x, y) {
  for(var i=0;i<pairs.length;i++) {
    if(pairs[i][0] == x && pairs[i][1] == y) return true;
    if(pairs[i][0] == y && pairs[i][1] == x) return true;
  }
  return false;
}

/*
 * This function gets the nth pair of the pattern
 * (0,0), (0,1), (0,2), ... (0,total-1), (1,2), (1,3), ... (total-2, total-1)
 * This is useful because it will give each unique pair in a predefined
 * order (recall that (x,y)==(y,x) with these pairs). This is used
 * to decide which one to include / exclude at each branch.
 */
function nthPair(total, n) {
  var num = 0;
  for(var i=0;i<total;i++) {
    for(var j=i+1;j<total;j++) {
      if(num == n) return [i,j];
      num++;
    }
  }
}

function TourTreeNode(tsp, include, exclude, parent) {
  this.tsp = tsp;
  this.tour = null;
  this.parent = parent;
  this.include = include;
  this.exclude = exclude;
  if(parent === null) this.level = 0;
  else this.level = parent.level + 1;
  this.left = this.right = null;

  this.tourDistance = function() {
    return this.getTour().distance;
  };

  this.getTour = function() {
    //Don't recalc if we already did the work
    if(this.tour !== null) {
      console.log("Norecalc");
      return this.tour;
    }
    var tour = [];
    var tourLength = 0;
    var cities = _.range(this.tsp.cities.length);
    var include = this.include.slice();
    var exclude = this.exclude.slice();
    tour.push(0); //always visit first city first.
    cities.splice(0,1);
    while(tour.length != this.tsp.cities.length) {
      var cur = _.last(tour);

      var requiredDest = _.compact(_.map(include,function(pair) {
        if(pair[0] == cur && tour.indexOf(pair[1]) === -1) return pair[1];
        return false;
      }));
      if(requiredDest.length > 0) {
        tour.push(requiredDest[0]);
        cities.splice(cities.indexOf(requiredDest[0]),1);
        continue;
      } else if(requiredDest.length > 1) {
        console.log("IMPOSSIBLE TOUR");
      }
      var bannedDest = _.compact(_.map(exclude, function(pair) {
        if(pair[0] == cur) return pair[1];
        if(pair[1] == cur) return pair[0];
        return false;
      }));
      for(var i=0;i<cities.length;i++) {
        if(cur === cities[i]) continue;
        if(bannedDest.indexOf(cities[i]) === -1 || tour.indexOf(cities[i]) !== -1) {
          tour.push(cities[i]);
          cities.splice(i,1);
          break;
        }
      }
    }
    for(var i=0;i<tour.length;i++) {
      tourLength += this.tsp.cities[tour[i]].weights[tour[(i+1) % this.tsp.cities[i].weights.length]];
    }
    this.tour = {path: tour, distance: tourLength};
    return this.tour;
  };

  this.tourLowerBound = function() {
    var lb = 0;
    var tsp = this.tsp;
    for(var i=0;i<tsp.cities.length;i++) {
      var min2 = [];
      var weights = tsp.cities[i].weights.slice();
      /* Don't travel from city to itself */
      weights[i] = Infinity;
      /* Don't travel to excludes */
      this.exclude.forEach(function(pair) {
        if(pair[0] == i) weights[pair[1]] = Infinity;
        if(pair[1] == i) weights[pair[0]] = Infinity;
      });
      this.include.forEach(function(pair) {
        if(pair[0] == i) {
          min2.push(weights[pair[1]]);
          weights[pair[1]] = Infinity; //can't include it twice
        }
        if(pair[1] == i) {
          min2.push(weights[pair[0]]);
          weights[pair[0]] = Infinity;
        }
      });
      //Don't sort if we don't need to
      if(min2.length < 2) {
        weights.sort();
        for(;min2.length < 2;) {
          min2.push(weights.splice(0,1)[0]);
        }
      }
      lb += min2[0] + min2[1];
    }
    return lb/2;
  };

  this.lowerBound = this.tourLowerBound();



  this.getLeftChild = function() {
    //Left child we attempt to include the LEVELth pair
    var toInclude = this.include.slice(); //copy
    var toExclude = this.exclude.slice();
    var levelPair = nthPair(this.tsp.cities.length, this.level);
    if(typeof levelPair == 'undefined') return;
    toInclude.push(levelPair);
    var c = new TourTreeNode(this.tsp, toInclude, toExclude, this);
    this.left = c;
    return c;
  };
  this.getRightChild = function() {
    //Left child we attempt to exclude the LEVELth pair
    var toInclude = this.include.slice(); //copy
    var toExclude = this.exclude.slice();
    var levelPair = nthPair(this.tsp.cities.length, this.level);
    if(typeof levelPair == 'undefined') return;
    toExclude.push(levelPair);
    var c = new TourTreeNode(this.tsp, toInclude, toExclude, this);
    this.right = c;
    return c;
  };
}

function TourTree(tsp) {
  this.tsp = tsp;
  this.root = new TourTreeNode(tsp, [], [], null);
  this.bestTour = this.root.getTour();
  this.leaves = [this.root];
  this.currentNode = 0;
  this.bestCost = this.root.tourDistance();
  var tt = this;
  this.branch = function() {
    var leaves2 = tt.leaves.slice();
    if(tt.leaves.length === 0) {
      console.log("We've reached the best the best the best");
    }
    tt.leaves = [];
    leaves2.forEach(function(leaf) {
      var left = leaf.getLeftChild();
      var right = leaf.getRightChild();
      if(left && left.lowerBound < tt.bestCost) {
        if(tt.bestCost > left.tourDistance()) {
          tt.bestTour = left.getTour();
          tt.bestCost = left.tourDistance();
        }
        tt.leaves.push(left);
      } else {
      }
      if(right && right.lowerBound < tt.bestCost) {
        if(tt.bestCost > right.tourDistance()) {
          tt.bestTour = right.getTour();
          tt.bestCost = right.tourDistance();
        }
        tt.leaves.push(right);
      }
    });
  };
  this.step = function() {
    if(tt.leaves.length === 0) {
      console.log("best solution found");
      return;
    }
    var current = tt.leaves.splice(tt.currentNode,1)[0];
    var left = current.getLeftChild(),
        right = current.getRightChild();
    if(left && left.lowerBound < tt.bestCost) {
      if(tt.bestCost > left.tourDistance()) {
        tt.bestTour = left.getTour();
        tt.bestCost = left.tourDistance();
      }
      tt.leaves.push(left);
    }
    if(right && right.lowerBound < tt.bestCost) {
      if(tt.bestCost > right.tourDistance()) {
        tt.bestTour = right.getTour();
        tt.bestCost = right.tourDistance();
      }
      tt.leaves.push(right);
    }
  };
}

var tourTree =  new TourTree(t);
self.tt = tourTree;
for(var i=0;i<MAX_ITERATIONS;i++) {
  tourTree.step();
  postMessage({bestCost: tourTree.bestCost, iters: i, cities: t.cities, bestTour: tourTree.bestTour});
}
