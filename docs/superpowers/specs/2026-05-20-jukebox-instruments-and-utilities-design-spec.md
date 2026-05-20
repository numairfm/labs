# Jukebox Instrument Refinement & Utilities Design Spec (Phase 1)

Document the technical design and API contracts to revert the Virtual Drum Pad to highly responsive premium pads, create a 100% offline Canvas-based AI Watermark Remover with Google Gemini presets, and build a browser-native zero-dependency Offline Video Compressor.

---

## 🏛️ System Architecture

All Phase 1 tools are built as 100% offline, zero-dependency client-side single page utilities located within the `/src/tools/` modular directory.

```
src/
├── assets/
│   ├── css/
│   │   ├── main.css          # Global colors, resets, typography
│   │   └── components.css    # Premium neo-brutalist buttons & active shifts
│   └── js/
│       ├── utils.js          # Shared utility methods (Theme, Toast)
│       └── manifest.json     # Dynamic registry metadata
├── tools/
│   ├── drum-pad/             # REVERTED: Premium MPC-style drum pad
│   │   ├── index.html
│   │   ├── style.css
│   │   └── main.js
│   ├── watermark-remover/    # NEW: AI Image Watermark Remover (Gemini Presets)
│   │   ├── index.html
│   │   ├── style.css
│   │   └── main.js
│   └── video-compressor/     # NEW: Offline Video Compressor (Canvas-based)
│       ├── index.html
│       ├── style.css
│       └── main.js
└── index.html                # Homepage Dashboard Hub
```

Each utility will register itself dynamically into Jukebox's build-time bundler configurations via standard `meta.json` metadata records.

---

## 🥁 Tool 1: Premium Drum Pad Revert

Revert the visual SVG drum set into a premium 4x2 MPC-style grid of responsive drum pads styled with solid 2px borders, deep HSL colors, and rapid kinetic animation responses.

### 1. Visual Presentation & Style System
- **Grid Layout**: A beautiful, flexible `grid` container displaying 8 equal rectangular drum pads.
- **Color Styling**: Uses the main Jukebox HSL design variables.
  - Active pad click colors use `--accent-blue` or `--accent-teal` with high contrast borders.
- **Physical Keyframe Depression**:
  - Un-pressed state: Solid 2px outline with a heavy neo-brutalist solid shadow offset (`box-shadow: 4px 4px 0px var(--border-color)`).
  - Pressed state (`.active` class): Zero shadow, translates 4px diagonally (`transform: translate(4px, 4px)`).
- **Latency-Free Animations**: High-frequency hits toggle `.active` classes instantly by resetting the CSS cycle via a forced reflow repaint:
  ```javascript
  el.classList.remove('active');
  void el.offsetWidth; // Force repaint
  el.classList.add('active');
  ```
- **Control Bar**:
  - **Master Volume**: A standard browser `<input type="range">` modifying a master Web Audio GainNode.
  - **Kit Toggle**: A custom sliding segmented tab selector to switch `selectedKit` between `"acoustic"` and `"synth"`.

### 2. Playability & Audio Logic
- **Unified Pointer Tracking**: Replaces all mouse/touch listeners with a single pointer model (`pointerdown`, `pointerenter`, `pointerup`).
- **Sound Mapping & Synthesis**:
  - **Acoustic Kit**:
    - *Kick*: Sine frequency drop: $150\text{ Hz} \xrightarrow{\text{linear}} 0.01\text{ Hz}$ over $0.15\text{s}$.
    - *Snare*: Double components blending a 180Hz triangle wave decay with a high-pass filtered white noise burst.
    - *Closed Hat*: 7.5kHz bandpass filtered metallic noise snap (decay 0.05s).
    - *Open Hat*: Bandpass noise decay (decay 0.4s), **choked instantly** if Closed Hat is triggered.
    - *High Tom*: High acoustic sweep: $180\text{ Hz} \xrightarrow{\text{exponential}} 80\text{ Hz}$ over 0.25s.
    - *Low Tom*: Low floor sweep: $120\text{ Hz} \xrightarrow{\text{exponential}} 50\text{ Hz}$ over 0.25s.
    - *Cowbell*: Woody click frequency blend ($800\text{ Hz} + 540\text{ Hz}$ sine).
    - *Crash*: Detuned high-pass noise sweep ($2500\text{ Hz}$ high-pass, decay 0.7s).
  - **808 Synth Kit**:
    - *Kick*: Deep 75Hz sub-bass sine drop over $0.35\text{s}$.
    - *Snare*: Snappy 808 noise snap (high-frequency decay).
    - *Closed Hat*: 808 metal wave chime.
    - *Open Hat*: Long 808 open metallic hat decay.
    - *High Tom*: Resonant high-tom frequency pitch sweep.
    - *Low Tom*: Resonant low-tom frequency pitch sweep.
    - *Cowbell*: Classic 808 dual detuned square wave ring.
    - *Ride*: Detuned frequency-rich ringing metallic sweep.

---

## 🖌️ Tool 2: AI Image Watermark Remover

A completely offline, canvas-based pixel inpainting editor allowing users to remove watermarks with a smart brush or one-click preset for Google Gemini star watermarks.

### 1. User Interface Specification
- **Workspace Layout**:
  - **Drop Zone**: An interactive file uploader with a dotted border.
  - **Canvas Panel**: A relative container stacking two canvases of identical width and height:
    - `image-canvas` (Bottom Layer): Decodes and renders the loaded image.
    - `mask-canvas` (Top Layer): A transparent canvas drawing red strokes (`rgba(239, 68, 68, 0.4)`) on pointer drag.
- **Controls Toolbar**:
  - **Gemini Preset Button**: Labeled "Auto-Select Gemini Star". Clicking this automatically draws a red mask over the bottom-right $15\% \times 15\%$ coordinates zone of the canvas where Gemini watermarks are standardly located.
  - **Brush Size Slider**: Sets brush radius between `5px` and `50px`, updating a visual circular cursor.
  - **Reset Mask Button**: Clears the `mask-canvas` completely.
  - **"Heal Watermark" Button**: Initiates the local inpainting algorithm.
  - **Download Button**: Exports the modified `image-canvas` as a high-quality PNG.

### 2. Local Inpainting Algorithm Details
When the user clicks "Heal Watermark", Jukebox runs a multi-pass pixel-diffusion algorithm directly on the client canvas:
- **Boundary Detection**: Scans the mask canvas pixels. Detects boundary pixels (masked pixels adjacent to unmasked pixels).
- **Gaussian Neighborhood Blend**: For each boundary pixel:
  - Samples a $5\times5$ grid of surrounding unmasked pixels.
  - Calculates a Gaussian-weighted color average:
    $$C_{\text{new}} = \frac{\sum w_i \cdot C_i}{\sum w_i}$$
    where $w_i = e^{-\frac{d^2}{2\sigma^2}}$ and $d$ is distance from center boundary pixel.
  - Replaces the masked pixel value in the primary image canvas with $C_{\text{new}}$.
- **Inward Marching**: Marks the boundary pixels as "unmasked" and repeats the process, marching inward to the center of the mask until the entire mask is healed.
- **Selective Blended Smoothing**: Applies a subtle local Gaussian blur selectively over the healed boundary coordinates to eliminate color transitions, blending the patch with surrounding textures.

---

## 📹 Tool 3: Offline Video Compressor

A client-side browser-native video compressor that scales resolution and constraints bitrates using HTML5 Canvas capturing and `MediaRecorder` APIs.

### 1. Interface & Controls
- **Layout**:
  - **Input Panel**: Upload container supporting `.mp4`, `.webm`, and `.mov` up to 100MB.
  - **Dual Info Row**: Displays Original File Size and Resolution vs Compressed File Size and Resolution in real-time.
  - **Target Bitrate Slider**: Sets bitrate between `500 Kbps` and `8 Mbps`. Shows estimated compressed sizes.
  - **Resolution Downscaler**: A dropdown/button group mapping target canvas scaling:
    - `100% (Original)`
    * `70% (720p HD)`
    * `50% (480p SD)`
    * `35% (360p Mobile)`
  - **Audio Settings**: Toggle switch to either keep audio, compress to `64 Kbps Mono` using an AudioContext, or strip audio entirely.
  - **Export Selector**: Pick between `WebM` (default) and `MP4` (depending on browser codecs support).
- **Processing Panel**:
  - High contrast linear progress bar displaying completion percentage, elapsed time, and ETA.
  - Interactive scaled viewport showing compressed frame outputs in real-time.

### 2. Canvas & MediaRecorder Stream Encoding Engine
- **Local Stream Pipeline**:
  1. A hidden `<video>` element loads the file as an Object URL (`URL.createObjectURL(file)`).
  2. A target rendering `<canvas>` is instantiated, sized exactly to the selected scaled resolution.
  3. A canvas capture stream is initialized: `const videoStream = canvas.captureStream(fps)`.
  4. If audio is kept, a Web Audio `MediaElementAudioSourceNode` captures the video's audio, feeds it into a `MediaStreamAudioDestinationNode`, and merges it:
     ```javascript
     const combinedStream = new MediaStream([
       ...videoStream.getVideoTracks(),
       ...audioDestinationNode.stream.getAudioTracks()
     ]);
     ```
  5. Instantiates a `MediaRecorder` targeting the `combinedStream` using strict bitrate parameters:
     ```javascript
     const options = {
       mimeType: 'video/webm;codecs=vp8,opus',
       videoBitsPerSecond: targetBitrateBps
     };
     const recorder = new MediaRecorder(combinedStream, options);
     ```
- **Real-Time Compression Loop**:
  - Plays the video and sets a high-speed rendering loop via `requestAnimationFrame` or `requestVideoFrameCallback`.
  - On every frame, draw the source video frame onto the canvas scaled dimensions:
    ```javascript
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    ```
  - The browser's native hardware encoder captures these canvas redraws, automatically compressing the output stream down to the specified bitrate constraints.
  - When the video reaches its end (`videoElement.onended`), stop the recorder, bundle the blobs, calculate statistics, and export for immediate download.

---

## 🚀 Verification & Testing Plan

### 1. Automated Validation
- Run `npm run build` to verify Vite discovery builds all tools cleanly without Rollup bundle errors.

### 2. Manual Instrument Testing
- **Premium Drum Pad**:
  - Click and trigger all 8 pads. Verify Acoustic and Synth modes produce different low-latency sounds.
  - Mash a single pad repeatedly. Ensure overlapping polyphony works and the recoil depression animations reset visually without lag.
- **AI Watermark Remover**:
  - Upload a watermark-covered image. Click "Auto-Select Gemini Star" and verify the bottom-right corner is highlighted in red.
  - Adjust brush sizes and paint custom regions. Click "Heal Watermark" and ensure the watermark is smoothly erased and the final clean image can be downloaded.
- **Offline Video Compressor**:
  - Upload a test video. Select `50% Resolution` and `1.5 Mbps Bitrate`.
  - Click "Compress Video" and verify that progress updates in real-time.
  - Check the output video is readable, scaled down in resolution, and has a smaller file size than the original.
