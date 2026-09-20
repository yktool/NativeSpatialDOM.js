/* NativeSpatialDOM.js created by dai_fuku ver.1.0.0 */
(function(root, factory) {
  if (root) {
    if (typeof define === "function" && define.amd) {
      define([], function() { return (root.NativeSpatialDOM = factory(root)); });
    } else if (typeof module === "object" && module.exports) {
      module.exports = factory(root);
    } else {
      root.NativeSpatialDOM = factory(root);
    }
  }
}(typeof window !== "undefined"
  ? window
  : typeof globalThis !== "undefined"
    ? globalThis
    : typeof self !== "undefined"
      ? self
      : typeof global !== "undefined"
        ? global
        : this || false,
  function(root) {

    // --- WeakMap / Set Polyfills ---
    var _WeakMap = (function() {
      "use strict";
      if (root.WeakMap) return root.WeakMap;
      var SECRET_KEY = "__weakmap_" + Math.random().toString(36).slice(2) + "_";
      var idCounter = 0;

      function WeakMap(iterable) {
        this._id = "wm_" + (++idCounter);
        if (iterable) {
          for (var i = 0; i < iterable.length; i++) {
            this.set(iterable[ i ][ 0 ], iterable[ i ][ 1 ]);
          }
        }
      }

      function validateKey(key) {
        if (key === null || (typeof key !== "object" && typeof key !== "function")) {
          throw new TypeError("Invalid value used as weak map key");
        }
      }

      WeakMap.prototype.set = function(key, value) {
        validateKey(key);
        if (!Object.prototype.hasOwnProperty.call(key, SECRET_KEY)) {
          Object.defineProperty(key, SECRET_KEY, {
            value: Object.create(null),
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
        key[ SECRET_KEY ][ this._id ] = value;
        return this;
      };

      WeakMap.prototype.get = function(key) {
        validateKey(key);
        if (key[ SECRET_KEY ] && Object.prototype.hasOwnProperty.call(key[ SECRET_KEY ], this._id)) {
          return key[ SECRET_KEY ][ this._id ];
        }
        return undefined;
      };

      WeakMap.prototype.has = function(key) {
        validateKey(key);
        return !!(key[ SECRET_KEY ] && Object.prototype.hasOwnProperty.call(key[ SECRET_KEY ], this._id));
      };

      WeakMap.prototype.delete = function(key) {
        validateKey(key);
        if (this.has(key)) {
          try {
            delete key[ SECRET_KEY ][ this._id ];
          } catch (e) {
            key[ SECRET_KEY ][ this._id ] = undefined;
          }
          return true;
        }
        return false;
      };

      return WeakMap;
    })();

    var _Set = (function() {
      "use strict";
      if (root.Set) return root.Set;

      function isNaNValue(val) { return typeof val === "number" && val !== val; }
      function isSameValueZero(x, y) { return x === y || (isNaNValue(x) && isNaNValue(y)); }

      function Set(iterable) {
        this._values = [];
        if (iterable !== null && iterable !== undefined) {
          if (typeof iterable.forEach === "function") {
            var self = this;
            iterable.forEach(function(item) { self.add(item); });
          } else if (typeof iterable.length === "number") {
            for (var i = 0; i < iterable.length; i++) {
              this.add(iterable[ i ]);
            }
          }
        }
      }

      Object.defineProperty(Set.prototype, "size", {
        get: function() { return this._values.length; },
        configurable: true,
        enumerable: false
      });

      Set.prototype.has = function(value) {
        for (var i = 0; i < this._values.length; i++) {
          if (isSameValueZero(this._values[ i ], value)) return true;
        }
        return false;
      };

      Set.prototype.add = function(value) {
        if (!this.has(value)) this._values.push(value);
        return this;
      };

      Set.prototype.delete = function(value) {
        for (var i = 0; i < this._values.length; i++) {
          if (isSameValueZero(this._values[ i ], value)) {
            this._values.splice(i, 1);
            return true;
          }
        }
        return false;
      };

      Set.prototype.clear = function() { this._values = []; };

      Set.prototype.forEach = function(callbackFn, thisArg) {
        if (typeof callbackFn !== "function") throw new TypeError(callbackFn + " is not a function");
        var values = this._values;
        for (var i = 0; i < values.length; i++) {
          var val = values[ i ];
          callbackFn.call(thisArg, val, val, this);
        }
      };

      return Set;
    })();

    // --- Helper & Utility ---
    function compareX(a, b) { return a.minX - b.minX; }
    function compareY(a, b) { return a.minY - b.minY; }

    function BoundingBoxPool(initialSize) {
      this.pool = [];
      var size = (initialSize !== undefined && initialSize !== null) ? initialSize : 32;
      for (var i = 0; i < size; i++) {
        this.pool.push({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
      }
    }

    BoundingBoxPool.prototype.get = function() {
      return this.pool.length > 0 ? this.pool.pop() : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    };

    BoundingBoxPool.prototype.release = function(box) {
      box.minX = 0; box.minY = 0; box.maxX = 0; box.maxY = 0;
      this.pool.push(box);
    };

    function matchesSelector(el, selector) {
      if (!el || el.nodeType !== 1) return false;
      var p = Element.prototype;
      var f = p.matches || p.matchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector;
      if (f) return f.call(el, selector);

      var nodes = (el.parentNode || document).querySelectorAll(selector);
      var i = nodes.length;
      while (--i >= 0 && nodes.item(i) !== el);
      return i > -1;
    }

    function Emitter() { }
    Emitter.prototype.initInputListeners = function() {
      var self = this;

      this._keyHandler = function(e) {
        var key = e.key || e.code || e.keyCode;
        var direction = null;

        if (key === "ArrowUp" || key === "Up" || key === 38) direction = "up";
        else if (key === "ArrowDown" || key === "Down" || key === 40) direction = "down";
        else if (key === "ArrowLeft" || key === "Left" || key === 37) direction = "left";
        else if (key === "ArrowRight" || key === "Right" || key === 39) direction = "right";

        if (direction) {
          if (self.focusNext(direction)) {
            e.preventDefault();
          }
        }
      };
      root.addEventListener("keydown", this._keyHandler);

      var getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads;
      if (typeof getGamepads === "function") {
        var prevPressed = {};
        var requestAnim = root.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };

        var pollGamepad = function() {
          var gamepads = getGamepads.call(navigator);
          if (gamepads) {
            for (var i = 0; i < gamepads.length; i++) {
              var gp = gamepads[ i ];
              if (!gp) continue;
              var dirs = { 12: "up", 13: "down", 14: "left", 15: "right" };
              for (var j = 12; j < 16; j++) {
                var gpButton = gp.buttons[ j ];
                var pressed = gpButton && (typeof gpButton === "object" ? gpButton.pressed : gpButton === 1);
                var keyStr = i + "-" + j;
                if (pressed && !prevPressed[ keyStr ]) {
                  self.focusNext(dirs[ j ]);
                }
                prevPressed[ keyStr ] = pressed;
              }
            }
          }

          self._gamepadRafId = requestAnim(pollGamepad);
        };

        self._gamepadRafId = requestAnim(pollGamepad);
      }
    };

    // --- Rtree ---
    function Rtree(maxEntries) {
      this.maxEntries = (maxEntries !== undefined && maxEntries !== null) ? maxEntries : 9;
      this.minEntries = Math.max(2, Math.floor(this.maxEntries * 0.4));
      this.boxPool = new BoundingBoxPool(20);
      this.clear();
    }

    Rtree.prototype.clear = function() {
      this.root = { children: [], height: 1, leaf: true, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    };

    Rtree.prototype.insert = function(item) {
      var splitNode = this._insert(item, this.root);
      if (splitNode) {
        var oldRoot = this.root;
        this.root = { children: [ oldRoot, splitNode ], leaf: false, height: oldRoot.height + 1 };
        this._updateMBR(this.root);
      }
    };

    Rtree.prototype._insert = function(item, node) {
      var splitNode = null;
      if (node.leaf) {
        node.children.push(item);
      } else {
        var bestChild = node.children[ 0 ];
        var minEnlargement = Infinity;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[ i ];
          var enlargement = this._enclosedArea(child, item) - this._area(child);
          if (enlargement < minEnlargement) {
            minEnlargement = enlargement;
            bestChild = child;
          }
        }
        var newChild = this._insert(item, bestChild);
        if (newChild) node.children.push(newChild);
      }
      this._updateMBR(node);
      if (node.children.length > this.maxEntries) {
        splitNode = this._split(node);
      }
      return splitNode;
    };

    Rtree.prototype.search = function(bbox) {
      var results = [];
      this._search(bbox, this.root, results);
      return results;
    };

    Rtree.prototype._search = function(bbox, node, results) {
      if (!this._intersects(bbox, node)) return;
      var len = node.children ? node.children.length : 0;
      for (var i = 0; i < len; i++) {
        var child = node.children[ i ];
        if (node.leaf) {
          if (this._intersects(bbox, child)) results.push(child);
        } else {
          this._search(bbox, child, results);
        }
      }
    };

    Rtree.prototype.remove = function(item) {
      var path = [];
      if (!this._findPath(this.root, item, path)) return false;
      var leaf = path[ path.length - 1 ].node;
      var idx = leaf.children.indexOf(item);
      if (idx === -1) return false;
      leaf.children.splice(idx, 1);

      var reinsertList = [];
      this._condense(path, reinsertList);
      for (var i = 0; i < reinsertList.length; i++) {
        this.insert(reinsertList[ i ]);
      }

      if (!this.root.leaf && this.root.children.length === 1) {
        this.root = this.root.children[ 0 ];
      } else if (this.root.leaf && this.root.children.length === 0) {
        this.clear();
      }
      return true;
    };

    Rtree.prototype._condense = function(path, reinsertList) {
      for (var i = path.length - 1; i >= 0; i--) {
        var entry = path[ i ];
        var node = entry.node;
        var parent = entry.parent;
        var parentIndex = entry.parentIndex;

        if (node.children.length === 0) {
          if (parent) parent.children.splice(parentIndex, 1);
        } else if (node.children.length < this.minEntries && parent) {
          parent.children.splice(parentIndex, 1);
          this._collectLeaves(node, reinsertList);
        } else {
          this._updateMBR(node);
        }
      }
    };

    Rtree.prototype._collectLeaves = function(node, list) {
      var len = node.children ? node.children.length : 0;
      for (var i = 0; i < len; i++) {
        if (node.leaf) list.push(node.children[ i ]);
        else this._collectLeaves(node.children[ i ], list);
      }
    };

    Rtree.prototype._findPath = function(node, item, path) {
      if (!this._intersects(item, node)) return false;
      if (node.leaf) {
        if (node.children.indexOf(item) !== -1) {
          path.push({ node: node });
          return true;
        }
        return false;
      }
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[ i ];
        path.push({ node: child, parent: node, parentIndex: i });
        if (this._findPath(child, item, path)) return true;
        path.pop();
      }
      return false;
    };

    Rtree.prototype._split = function(node) {
      var children = node.children;
      var minEntries = this.minEntries;
      var bestAxis = "x";
      var bestSplitIndex = minEntries;
      var minOverlap = Infinity;
      var minArea = Infinity;

      var sortedX = children.slice().sort(compareX);
      var sortedY = children.slice().sort(compareY);

      var axes = [
        { axis: "x", sorted: sortedX },
        { axis: "y", sorted: sortedY }
      ];

      var boxA = this.boxPool.get();
      var boxB = this.boxPool.get();

      for (var aIdx = 0; aIdx < 2; aIdx++) {
        var currentAxis = axes[ aIdx ].axis;
        var groupList = axes[ aIdx ].sorted;

        for (var i = minEntries; i <= groupList.length - minEntries; i++) {
          this._calcEnclosingBoxList(groupList.slice(0, i), boxA);
          this._calcEnclosingBoxList(groupList.slice(i), boxB);

          var overlapX = Math.max(0, Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX));
          var overlapY = Math.max(0, Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY));
          var overlap = overlapX * overlapY;
          var totalArea = this._area(boxA) + this._area(boxB);

          if (overlap < minOverlap || (overlap === minOverlap && totalArea < minArea)) {
            minOverlap = overlap;
            minArea = totalArea;
            bestAxis = currentAxis;
            bestSplitIndex = i;
          }
        }
      }

      this.boxPool.release(boxA);
      this.boxPool.release(boxB);

      var selectedList = (bestAxis === "x" ? sortedX : sortedY);
      node.children = selectedList.slice(0, bestSplitIndex);
      var newNode = {
        children: selectedList.slice(bestSplitIndex),
        leaf: node.leaf
      };

      this._updateMBR(node);
      this._updateMBR(newNode);
      return newNode;
    };

    Rtree.prototype._intersects = function(a, b) {
      return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
    };

    Rtree.prototype._area = function(box) {
      return Math.max(0, box.maxX - box.minX) * Math.max(0, box.maxY - box.minY);
    };

    Rtree.prototype._enclosedArea = function(a, b) {
      return Math.max(0, Math.max(a.maxX, b.maxX) - Math.min(a.minX, b.minX)) *
        Math.max(0, Math.max(a.maxY, b.maxY) - Math.min(a.minY, b.minY));
    };

    Rtree.prototype._calcEnclosingBoxList = function(list, outBox) {
      if (list.length === 0) return;
      var first = list[ 0 ];
      outBox.minX = first.minX; outBox.minY = first.minY;
      outBox.maxX = first.maxX; outBox.maxY = first.maxY;
      for (var i = 1; i < list.length; i++) {
        var item = list[ i ];
        if (item.minX < outBox.minX) outBox.minX = item.minX;
        if (item.minY < outBox.minY) outBox.minY = item.minY;
        if (item.maxX > outBox.maxX) outBox.maxX = item.maxX;
        if (item.maxY > outBox.maxY) outBox.maxY = item.maxY;
      }
    };

    Rtree.prototype._updateMBR = function(node) {
      if (!node.children || node.children.length === 0) return;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[ i ];
        if (child.minX < minX) minX = child.minX;
        if (child.minY < minY) minY = child.minY;
        if (child.maxX > maxX) maxX = child.maxX;
        if (child.maxY > maxY) maxY = child.maxY;
      }
      node.minX = minX; node.minY = minY; node.maxX = maxX; node.maxY = maxY;
    };

    // --- Main Library Class ---
    function NativeSpatialDOM(options) {
      options = options || {};
      this.tree = new Rtree();
      this.selector = options.selector || ".spatial-item";
      this.elementMap = new _WeakMap();
      this.observedElements = new _Set();
      this.pendingQueue = new _Set();
      this.isScheduled = false;

      this._onResize = this._onResize.bind(this);
      this._initObservers();

      if (options.autoInitListeners) {
        Emitter.prototype.initInputListeners.call(this);
      }
    }

    NativeSpatialDOM.prototype._getScrollPosition = function() {
      return {
        x: root.scrollX || root.pageXOffset || (document.documentElement && document.documentElement.scrollLeft) || (document.body && document.body.scrollLeft) || 0,
        y: root.scrollY || root.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop) || 0
      };
    };

    NativeSpatialDOM.prototype.updateElement = function(el) {
      if (!el || !document.body.contains(el)) return;

      var rect = el.getBoundingClientRect();
      var scroll = this._getScrollPosition();
      var minX = rect.left + scroll.x;
      var minY = rect.top + scroll.y;
      var maxX = rect.right + scroll.x;
      var maxY = rect.bottom + scroll.y;

      if (this.elementMap.has(el)) {
        var oldItem = this.elementMap.get(el);
        if (oldItem.minX === minX && oldItem.minY === minY && oldItem.maxX === maxX && oldItem.maxY === maxY) {
          return;
        }
        this.tree.remove(oldItem);
      }

      var newItem = { minX: minX, minY: minY, maxX: maxX, maxY: maxY, element: el };
      this.tree.insert(newItem);
      this.elementMap.set(el, newItem);
    };

    NativeSpatialDOM.prototype.findNearest = function(targetEl, direction, opts) {
      opts = opts || {};
      var maxDistance = opts.maxDistance || 1000;
      var weightSecondary = opts.weightSecondary || 2;
      var weightOverlap = opts.weightOverlap !== undefined ? opts.weightOverlap : 0.5;

      var scroll = this._getScrollPosition();
      var srcRect = targetEl.getBoundingClientRect();
      var src = {
        minX: srcRect.left + scroll.x,
        minY: srcRect.top + scroll.y,
        maxX: srcRect.right + scroll.x,
        maxY: srcRect.bottom + scroll.y
      };

      var searchArea = {
        minX: direction === "left" ? src.minX - maxDistance : (direction === "right" ? src.maxX : src.minX - maxDistance),
        maxX: direction === "right" ? src.maxX + maxDistance : (direction === "left" ? src.minX : src.maxX + maxDistance),
        minY: direction === "up" ? src.minY - maxDistance : (direction === "down" ? src.maxY : src.minY - maxDistance),
        maxY: direction === "down" ? src.maxY + maxDistance : (direction === "up" ? src.minY : src.maxY + maxDistance)
      };

      var candidates = this.tree.search(searchArea);
      var nearestElement = null;
      var minScore = Infinity;

      var calcDelta = function(item, src, dir) {
        var primaryDelta, secondaryDelta = 0, overlap = 0;
        if (dir === "right") {
          primaryDelta = item.minX - src.maxX;
          overlap = Math.max(0, Math.min(src.maxY, item.maxY) - Math.max(src.minY, item.minY));
          if (item.minY > src.maxY) secondaryDelta = item.minY - src.maxY;
          else if (item.maxY < src.minY) secondaryDelta = src.minY - item.maxY;
        } else if (dir === "left") {
          primaryDelta = src.minX - item.maxX;
          overlap = Math.max(0, Math.min(src.maxY, item.maxY) - Math.max(src.minY, item.minY));
          if (item.minY > src.maxY) secondaryDelta = item.minY - src.maxY;
          else if (item.maxY < src.minY) secondaryDelta = src.minY - item.maxY;
        } else if (dir === "down") {
          primaryDelta = item.minY - src.maxY;
          overlap = Math.max(0, Math.min(src.maxX, item.maxX) - Math.max(src.minX, item.minX));
          if (item.minX > src.maxX) secondaryDelta = item.minX - src.maxX;
          else if (item.maxX < src.minX) secondaryDelta = src.minX - item.maxX;
        } else { // up
          primaryDelta = src.minY - item.maxY;
          overlap = Math.max(0, Math.min(src.maxX, item.maxX) - Math.max(src.minX, item.minX));
          if (item.minX > src.maxX) secondaryDelta = item.minX - src.maxX;
          else if (item.maxX < src.minX) secondaryDelta = src.minX - item.maxX;
        }
        return { primary: primaryDelta, secondary: secondaryDelta, overlap: overlap };
      };

      for (var i = 0; i < candidates.length; i++) {
        var item = candidates[ i ];
        if (item.element === targetEl) continue;

        var res = calcDelta(item, src, direction);
        if (res.primary < 0) continue;

        var score = res.primary + (res.secondary * weightSecondary) - (res.overlap * weightOverlap);
        var priorityAttr = item.element.getAttribute("data-spatial-priority");
        if (priorityAttr) {
          var priority = parseFloat(priorityAttr);
          if (!isNaN(priority) && priority > 0) score /= priority;
        }

        if (score < minScore) {
          minScore = score;
          nearestElement = item.element;
        }
      }

      return nearestElement;
    };

    NativeSpatialDOM.prototype.focusNext = function(direction) {
      var activeEl = document.activeElement;
      if (!activeEl || !activeEl.classList.contains("spatial-item")) {
        var first = document.querySelector(this.selector);
        if (first) this._safeFocus(first);
        return true;
      }

      var nextEl = this.findNearest(activeEl, direction);
      if (nextEl) {
        this._safeFocus(nextEl);
        return true;
      }
      return false;
    };

    NativeSpatialDOM.prototype._safeFocus = function(el) {
      if (!el.hasAttribute("tabindex") && !/^(a|button|input|textarea|select|details)$/i.test(el.tagName)) {
        el.setAttribute("tabindex", "-1");
      }

      if (typeof el.focus === "function") {
        try {
          el.focus({ preventScroll: true });
        } catch (e) {
          el.focus();
        }

        if (typeof el.scrollIntoView === "function") {
          try {
            el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
          } catch (e) {
            try {
              el.scrollIntoView(false);
            } catch (err) {
              el.scrollIntoView();
            }
          }
        }
      }
    };

    NativeSpatialDOM.prototype._scheduleUpdate = function(el) {
      this.pendingQueue.add(el);
      if (!this.isScheduled) {
        this.isScheduled = true;
        var self = this;
        var requestAnim = root.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };

        this._updateRafId = requestAnim(function() {
          self.pendingQueue.forEach(function(target) {
            if (document.body.contains(target)) self.updateElement(target);
          });
          self.pendingQueue.clear();
          self.isScheduled = false;
          self._updateRafId = null;
        });
      }
    };

    NativeSpatialDOM.prototype._onResize = function() {
      var self = this;
      this.observedElements.forEach(function(el) {
        self._scheduleUpdate(el);
      });
    };

    NativeSpatialDOM.prototype._startFallbackPolling = function() {
      var self = this;
      var requestAnim = root.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };

      if (!this._lastDimensions) {
        this._lastDimensions = new _WeakMap();
      }

      var poll = function() {
        self.observedElements.forEach(function(el) {
          if (!document.body.contains(el)) return;

          var rect = el.getBoundingClientRect();
          var last = self._lastDimensions.get(el);

          if (!last || last.width !== rect.width || last.height !== rect.height || last.top !== rect.top || last.left !== rect.left) {
            self._lastDimensions.set(el, {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left
            });
            self._scheduleUpdate(el);
          }
        });

        self._fallbackPollingId = requestAnim(poll);
      };

      this._fallbackPollingId = requestAnim(poll);
    };

    NativeSpatialDOM.prototype._initObservers = function() {
      var self = this;

      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(function(entries) {
          for (var i = 0; i < entries.length; i++) {
            self._scheduleUpdate(entries[ i ].target);
          }
        });
      } else {
        this.resizeObserver = null;
        this._startFallbackPolling();
      }

      root.addEventListener("resize", this._onResize, true);
      root.addEventListener("scroll", this._onResize, true);

      var onTransitionOrAnimationEnd = function(e) {
        if (e.target && self.observedElements.has(e.target)) {
          self._scheduleUpdate(e.target);
        }
      };
      root.addEventListener("transitionend", onTransitionOrAnimationEnd, true);
      root.addEventListener("animationend", onTransitionOrAnimationEnd, true);
      this._onTransitionOrAnimationEnd = onTransitionOrAnimationEnd;

      var handleNodeAdded = function(node) {
        if (node.nodeType === 1) {
          if (matchesSelector(node, self.selector)) {
            self.observedElements.add(node);
            self._scheduleUpdate(node);
            if (self.resizeObserver) self.resizeObserver.observe(node);
          }
          var subElements = node.querySelectorAll ? node.querySelectorAll(self.selector) : [];
          for (var k = 0; k < subElements.length; k++) {
            var subEl = subElements[ k ];
            self.observedElements.add(subEl);
            self._scheduleUpdate(subEl);
            if (self.resizeObserver) self.resizeObserver.observe(subEl);
          }
        }
      };

      var handleNodeRemoved = function(node) {
        if (node.nodeType === 1) {
          var cleanup = function(target) {
            if (self.elementMap.has(target)) {
              var item = self.elementMap.get(target);
              self.tree.remove(item);
              self.elementMap.delete(target);
              self.observedElements.delete(target);
              if (self.resizeObserver) self.resizeObserver.unobserve(target);
            }
          };
          cleanup(node);
          var subElements = node.querySelectorAll ? node.querySelectorAll(self.selector) : [];
          for (var k = 0; k < subElements.length; k++) {
            cleanup(subElements[ k ]);
          }
        }
      };

      if (typeof MutationObserver !== "undefined") {
        this.mutationObserver = new MutationObserver(function(mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var mutation = mutations[ i ];
            for (var a = 0; a < mutation.addedNodes.length; a++) {
              handleNodeAdded(mutation.addedNodes[ a ]);
            }
            for (var r = 0; r < mutation.removedNodes.length; r++) {
              handleNodeRemoved(mutation.removedNodes[ r ]);
            }
          }
        });

        this.mutationObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    };

    NativeSpatialDOM.prototype.observeAll = function() {
      var elements = document.querySelectorAll(this.selector);
      if (!elements.length) return;
      for (var i = 0; i < elements.length; i++) {
        var el = elements[ i ];
        this.observedElements.add(el);
        this._scheduleUpdate(el);
        if (this.resizeObserver) {
          this.resizeObserver.observe(el);
        }
      }
    };

    NativeSpatialDOM.prototype.destroy = function() {
      var cancelAnim = root.cancelAnimationFrame || function(id) { clearTimeout(id); };

      if (this._gamepadRafId) {
        cancelAnim(this._gamepadRafId);
        this._gamepadRafId = null;
      }

      if (this._updateRafId) {
        cancelAnim(this._updateRafId);
        this._updateRafId = null;
      }

      if (this._fallbackPollingId) {
        cancelAnim(this._fallbackPollingId);
        this._fallbackPollingId = null;
      }

      if (this._keyHandler) {
        root.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }

      if (this._onTransitionOrAnimationEnd) {
        root.removeEventListener("transitionend", this._onTransitionOrAnimationEnd, true);
        root.removeEventListener("animationend", this._onTransitionOrAnimationEnd, true);
        this._onTransitionOrAnimationEnd = null;
      }

      root.removeEventListener("resize", this._onResize, true);
      root.removeEventListener("scroll", this._onResize, true);

      if (this.debugCanvas && this.debugCanvas.parentNode) {
        this.debugCanvas.parentNode.removeChild(this.debugCanvas);
        this.debugCanvas = null;
        this.ctx = null;
      }

      this.observedElements.clear();
      this.pendingQueue.clear();
      this.tree = new Rtree();
      this.isScheduled = false;
    };

    NativeSpatialDOM.prototype.enableDebug = function() {
      if (this.debugCanvas) return;

      var canvas = document.createElement("canvas");
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "999999";

      canvas.width = root.innerWidth;
      canvas.height = root.innerHeight;

      document.body.appendChild(canvas);
      this.debugCanvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.renderDebug();
    };

    NativeSpatialDOM.prototype.renderDebug = function() {
      if (!this.ctx) return;

      var ctx = this.ctx;
      ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
      var scroll = this._getScrollPosition();

      var drawNode = function(node) {
        if (!node) return;
        ctx.strokeStyle = node.leaf ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.3)";
        ctx.lineWidth = node.leaf ? 1 : 2;
        ctx.strokeRect(
          node.minX - scroll.x,
          node.minY - scroll.y,
          node.maxX - node.minX,
          node.maxY - node.minY
        );

        if (node.children) {
          for (var i = 0; i < node.children.length; i++) {
            drawNode(node.children[ i ]);
          }
        }
      };

      drawNode(this.tree.root);

      var activeEl = document.activeElement;
      if (activeEl && this.elementMap.has(activeEl)) {
        var item = this.elementMap.get(activeEl);
        ctx.strokeStyle = "#ff00ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(
          item.minX - scroll.x,
          item.minY - scroll.y,
          item.maxX - item.minX,
          item.maxY - item.minY
        );
      }
    };

    return NativeSpatialDOM;
  }));