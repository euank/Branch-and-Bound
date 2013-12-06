window.onload = function() {
  "use strict";
  var MAX_X = 100;
  var MAX_Y = 100;
  var MAX_ITERATIONS = 150;
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
    }
    this.cities = cities;
  }

  var t = new TSP(15);

  function updateDom(len, iters) {
    document.querySelector("#len").innerHTML = len;
    document.querySelector("#iters").innerHTML = iters;
  }

  function pairsContain(pairs, x, y) {
    for(var i=0;i<pairs.length;i++) {
      if(pairs[i][0] == x && pairs[i][1] == y) return true;
      if(pairs[i][0] == y && pairs[i][1] == x) return true;
    }
    return false;
  }

  /*
   * This function computes the lower bound for the tsp
   * given a tsp, and pairs to include and exclude
   * It assumes that it is possible to include and
   * exclude that set of pairs with no problem.
   * If it cannot it is undefined behavior
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

  function TourTreeNode(tour, tsp, include, exclude, parent) {
    this.tsp = tsp;
    this.tour = tour;
    this.parent = parent;
    this.include = include;
    this.exclude = exclude;
    if(parent == null) this.level = 0;
    else this.level = parent.level + 1;
    this.left = this.right = null;

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
      toInclude.push(levelPair);
      var c = new TourTreeNode(tour, this.tsp, toInclude, toExclude, this);
      this.left = c;
      return c;
    }
    this.getRightChild = function() {
      //Left child we attempt to exclude the LEVELth pair
      var toInclude = this.include.slice(); //copy
      var toExclude = this.exclude.slice();
      var levelPair = nthPair(this.tsp.cities.length, this.level);
      toExclude.push(levelPair);
      var c = new TourTreeNode(tour, this.tsp, toInclude, toExclude, this);
      this.right = c;
      return c;
    }
  };

  function TourTree(tsp) {
    this.tsp = tsp;
    this.root = new TourTreeNode(tsp.getBasicTour(), tsp, [], [], null);
    this.leaves = [this.root];
    this.bestLB = this.root.lowerBound;
    var tt = this;
    this.branch = function() {
      var leaves2 = this.leaves.slice();
      this.leaves = [];
      leaves2.forEach(function(leaf) {
        var left = leaf.getLeftChild();
        var right = leaf.getRightChild();
        if(left.lowerBound <= tt.bestLB) {
          tt.bestLB = left.lowerBound;
          tt.leaves.push(left);
        }
        if(right.lowerBound <= tt.bestLB) {
          tt.bestLB = right.lowerBound;
          tt.leaves.push(right);
        }
      });
    }
  }

  var tourTree =  new TourTree(t);
  window.tt = tourTree;
  function improveSolution(tourTree, iters) {
    tourTree.branch();
    updateDom(tourTree.bestLB, iters);
    if(iters == MAX_ITERATIONS) {
      return;
    }
    setTimeout(function(){
        improveSolution(tourTree, iters+1);
    },100);
  }

  improveSolution(tourTree, 0);
}
