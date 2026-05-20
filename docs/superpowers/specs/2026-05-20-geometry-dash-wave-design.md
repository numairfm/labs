# Geometry Dash Wave Engine & Editor Design Spec

## 1. Overview
A high-accuracy, 60fps canvas-based game engine mimicking the "Wave" game mode from Geometry Dash. It features a fully integrated grid-based visual level editor, allowing users to build, test, save, and load their own custom levels entirely within the browser.

## 2. Architecture & Tech Stack
- **Environment:** Browser-native JavaScript within the Jukebox web application.
- **Rendering:** High-DPI `<canvas>` with a unified `requestAnimationFrame` game loop.
- **Styling:** CSS for the external editor UI tools, layered outside the canvas.
- **No External Dependencies:** Custom physics and rendering logic to keep the tool self-contained and performant.

## 3. Core Engine Mechanics

### The Wave (Player)
- The camera and level scroll continuously to the left at a constant velocity, simulating the player moving right.
- **Input:** Holding `PointerDown` or `Spacebar` pitches the wave upwards at a strict 45-degree angle.
- **Release:** Releasing the input instantly pitches the wave downwards at a strict 45-degree angle.
- **Visuals:** The wave leaves a continuous, fading geometric trail behind it.
- **Boundaries:** Striking the floor or ceiling results in a crash, identical to hitting an obstacle, unless solid ground blocks are placed.

### Physics & Collision (Forgiving Hitboxes)
- **AABB (Axis-Aligned Bounding Box):** Used for standard square block collisions.
- **Triangle/SAT:** Used for spike collisions.
- **Forgiving Margins:** The internal collision hitboxes for the Wave and Spikes will be approximately 15-20% smaller than their rendered visual boundaries. This mimics authentic Geometry Dash gameplay, where grazing a spike feels responsive and fair rather than frustrating.

## 4. Integrated Editor Mode

### The Toggle
- A master switch toggles the engine between **Play Mode** and **Edit Mode**.
- Switching to Edit Mode pauses the game loop updates, shows a coordinate grid on the canvas, and unlocks camera panning (via drag or arrow keys).

### Drawing on Canvas
- **Pure Canvas Interaction:** While the UI toolbar (selecting blocks, spikes, eraser) is built using standard HTML/CSS, the actual drawing happens via pointer events on the canvas.
- Clicking/Dragging on the canvas snaps the cursor to the nearest grid cell and injects the selected object into the level data.

## 5. Level Data Management
- Levels are represented as lightweight JSON arrays.
- **Format Example:**
  ```json
  [
    { "type": "block", "x": 10, "y": 2 },
    { "type": "spike", "x": 11, "y": 2, "rotation": 0 }
  ]
  ```
- **Serialization:** Users can Export the level to a JSON string or file, and Import custom JSON files to load levels. This ensures easy sharing and saving.

## 6. Success Criteria
1. The wave movement feels instantly responsive without input lag.
2. The game loop maintains a stable 60 FPS even with hundreds of blocks on screen.
3. Collisions feel fair and "forgiving", mirroring the actual game.
4. The level editor seamlessly switches in and out of playtesting.
