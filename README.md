# NativeSpatialDOM.js

**NativeSpatialDOM.js** is a pure JavaScript library that dynamically indexes 2D element positions (Bounding Boxes) using the **R-Tree algorithm**, providing seamless and intuitive focus navigation for Smart TVs, gamepads, and arrow keys.

---

## Features

* **R-Tree Spatial Indexing**: Dynamically manages 2D element coordinates using an R-Tree structure to instantly calculate and move focus to the most natural neighboring element.
* **Built-in Keyboard & Gamepad Support**: Automatically handles direction inputs from arrow keys and controller D-Pads.
* **DOM & Resize Tracking**: Leverages internal `ResizeObserver` and `MutationObserver` to automatically adapt to screen resizes and dynamically added/removed elements.
* **Zero Dependencies**: Pure JavaScript with no external dependencies. Includes internal polyfills for `WeakMap` and `Set` for legacy browser support.
* **Priority Control**: Custom `data-spatial-priority` attributes allow fine-tuning of element attraction during navigation.
* **Debug Visualizer Mode**: Built-in canvas overlay mode to inspect real-time R-Tree spatial partitions and active focus boundaries.

---

## Usage

### 1. Include the Library

Include `NSdom.js` in your project.

```html
<script src="path/to/NSdom.js"></script>
```

### 2. Prepare HTML Markup

Add the designated class (default: `spatial-item`) to the elements you want to participate in spatial navigation.

```html
<div class="container">
  <button class="spatial-item">Item 1</button>
  <button class="spatial-item">Item 2</button>

  <!-- Higher navigation priority item -->
  <button class="spatial-item" data-spatial-priority="2">Item 3 (High Priority)</button>
</div>
```

### 3. Initialize & Start Observing

Create an instance of `NativeSpatialDOM` and start observing once the DOM is ready.

```javascript
document.addEventListener("DOMContentLoaded", function() {
  // Create instance
  const spatialDOM = new NativeSpatialDOM({
    selector: '.spatial-item', // Target CSS selector
    autoInitListeners: true     // Automatically attach arrow key & gamepad listeners
  });

  // Scan target elements, construct spatial index, and begin observation
  spatialDOM.observeAll();
});
```

---

## Programmatic Focus Control

To move focus programmatically, use the `focusNext()` method.

```javascript
// Move focus to the nearest element downwards
spatialDOM.focusNext('down');

// Supported directions: 'up', 'down', 'left', 'right'
```

---

## API Reference

### Constructor Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `selector` | `string` | `'.spatial-item'` | Target CSS selector for spatial navigation |
| `autoInitListeners` | `boolean` | `false` | When set to `true`, automatically registers arrow key and gamepad event listeners |

### Instance Methods

* **`observeAll()`**: Scans all elements matching `selector` in the current DOM, indexes them into the R-Tree, and attaches observers.
* **`focusNext(direction)`**: Navigates focus from the currently active element to the nearest element in the given direction (`"up"`, `"down"`, `"left"`, `"right"`). Returns `true` on success.
* **`findNearest(targetEl, direction, options)`**: Queries and returns the nearest element relative to `targetEl` in the specified direction without shifting active focus.
* **`updateElement(element)`**: Recalculates and updates the bounding box coordinates of a single element.
* **`enableDebug()`**: Creates an overlay canvas on top of the document to visually render R-Tree bounding boxes and focus states.
* **`destroy()`**: Cleans up all event listeners, timers, and Mutation/ResizeObservers to free memory.

---

## License

Copyright (c) dai_fuku
