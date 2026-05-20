# Jukebox Symbols & Five-Tool Expansion Design Spec

- **Date**: 2026-05-20
- **Author**: Antigravity (AI assistant)
- **Status**: Proposed (Pending User Review)

---

## 1. Goal & Context

Jukebox is an offline-first modular dashboard utility for client-side tools. It is styled with a premium, high-contrast, bold neo-brutalist "boutique hardware" theme featuring a dark obsidian background (`hsl(20, 10%, 6%)`), sharp corners (`border-radius: 0`), and thick outlines (`2px`).

This specification outlines the technical plan to:
1. **Remove all plain characters and text-based icons** (e.g. `←` back-nav, `THEME` buttons, and `[ FILE DROP ]` text) and replace them with uniform, hardcoded, high-fidelity inline SVGs.
2. **Implement five new premium offline-first tools** utilizing Web Audio API sound generation and other purely offline libraries:
   * **Virtual Drum Pad** (`drum-pad`) - Tactile rhythm pads with real-time analog sound synthesis.
   * **Retro Synthesizer Keyboard** (`synth-keyboard`) - Polyphonic keyboard synth with ADSR envelopes and waveform controls.
   * **Ambient Noise & Sound Machine** (`ambient-noise`) - Synthesizer for high-fidelity white, pink, and brown background sweeps.
   * **Boutique Pomodoro & Hardware Timer** (`pomodoro`) - GaugePomodoro timer with ticking feedback and vintage alarms.
   * **Offline QR Code & Text Encoder** (`qr-encoder`) - Vector QR matrix encoder built completely offline.

---

## 2. Architecture & Directory Mapping

All tools in Jukebox are designed as self-contained static modules under `src/tools/`. The auto-registry Vite plugin (`jukebox-auto-registry` in `vite.config.js`) reads their `meta.json` at build time to populate `src/assets/js/manifest.json`.

```
src/
├── assets/
│   ├── css/
│   │   ├── main.css          # Design system & tokens
│   │   └── components.css    # Cards, buttons, inputs
│   └── js/
│       └── utils.js          # Shared tools SDK (Theme, Drag & Drop, Toasts)
├── main.js                   # Homepage rendering & central icon registry
├── index.html                # Jukebox Hub Home Page
└── tools/
    ├── image-compressor/     # (Existing) Image compressor
    ├── unit-converter/       # (Existing) Unit calculator
    ├── drum-pad/             # [NEW] Drum machine pad
    ├── synth-keyboard/       # [NEW] Interactive keyboard synth
    ├── ambient-noise/        # [NEW] Sound machine
    ├── pomodoro/             # [NEW] Pomodoro dial timer
    └── qr-encoder/           # [NEW] Pure client-side QR builder
```

Each new tool will feature four standard assets:
* `meta.json` (Vite auto-discovery registry specs)
* `index.html` (Markup with back navigation header and custom SVGs)
* `style.css` (Boutique layout styles and active keypress mappings)
* `main.js` (Audio/logic script importing the `utils.js` bootstrap engine)

---

## 3. Section 1: Symbol Hardcoding & SVG Refactoring

We replace all raw string indicators and text icons across the hub homepage and tool templates with precise, uniform, hardcoded inline SVGs.

### SVG Uniform Style Tokens
* `stroke-width="2.5"`
* `stroke-linecap="square"`
* `stroke-linejoin="miter"`
* Fits standard `20x20` viewport box boundaries where applicable.

### Applied Modifications
1. **Header Back Navigation Arrows**:
   Replace `←` in `src/tools/*/index.html` with:
   ```html
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
     <line x1="19" y1="12" x2="5" y2="12"></line>
     <polyline points="12 19 5 12 12 5"></polyline>
   </svg>
   ```
2. **Contrast/Theme Toggle Buttons**:
   Replace `THEME` in `src/index.html` and `src/tools/*/index.html` headers with:
   ```html
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
     <circle cx="12" cy="12" r="10"></circle>
     <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path>
   </svg>
   ```
3. **Image Compressor Drop Zone**:
   Replace the plain text `[ FILE DROP ]` in `src/tools/image-compressor/index.html` with:
   ```html
   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter" style="margin-bottom: 1rem; color: var(--text-secondary);">
     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
     <polyline points="17 8 12 3 7 8" />
     <line x1="12" y1="3" x2="12" y2="15" />
   </svg>
   ```

---

## 4. Section 2: Audio Boutique Suite Specs

Both audio tools run on the Web Audio API without requiring remote media streams or MP3/WAV files.

### 1. Virtual Drum Pad (`drum-pad`)
* **Pads Grid**: 8 responsive square pads. Visual active states are triggered by keydown or click.
* **Audio Synthesis Nodes**:
  * **Kick**: Rapid frequency downward pitch sweep (150Hz -> 0.01Hz) with `exponentialRampToValueAtTime` over 0.15s, coupled with an exponential decay on volume gain.
  * **Snare**: Generated via white-noise buffer passed through a high-pass filter (1000Hz) and quick amplitude decay.
  * **Hi-Hat**: White-noise passed through bandpass filter (7000Hz) and envelope decay of 0.05s.
  * **Clap**: Three rapid noise sweeps spaced 0.02s apart for synthetic emulation.
  * **Tom**: Sine oscillator frequency sweep from 220Hz down to 80Hz.
  * **Synth Pluck**: Short sawtooth oscillator low-passed with an envelope filter.
* **Keyboard maps**: `Q`, `W`, `E`, `R` (top) and `A`, `S`, `D`, `F` (bottom).

### 2. Retro Synthesizer Keyboard (`synth-keyboard`)
* **Keyboard Matrix**: 1.5 octave piano model with 8 white keys (C4-C5) and 5 black keys (C#4-A#4).
* **Control Unit**:
  * **Waveform selector**: Waveform selector: Sine, Square, Sawtooth, Triangle.
  * **ADSR Envelopes**:
    * **Attack**: Transition time from 0 to maximum gain.
    * **Decay**: Decay time to Sustain level.
    * **Sustain**: Static volume level while the note is held.
    * **Release**: Transition time back to zero gain after release.
  * **Octave shift**: Octave shift: -2 to +2.

---

## 5. Section 3: Utility Suite Specs

### 3. Boutique Pomodoro & Hardware Timer (`pomodoro`)
* **Tactile Visualizer**: 
  An animated SVG circle. The circular progress dial's remaining time is bound to `stroke-dashoffset`.
* **Hardware Audio Elements**:
  * **Mechanical Tick**: A 1ms high-frequency sine oscillator pop, played at each second step (user can toggle on/off).
  * **Vintage Alarm**: Three consecutive square-wave pulses (880Hz, 0.15s on, 0.05s off) when timer hits 00:00.

### 4. Offline QR Code & Text Encoder (`qr-encoder`)
* **Tactile Visualizer**: Heavy, thick-bordered vector canvas holding the generated matrix, and a clean download SVG button.
* **Offline Compiler**:
  * A lightweight, offline-first open-source QR implementation will be bundled locally in `src/tools/qr-encoder/qr-generator.js`. No HTTP requests or external API calls are made. It generates black-and-white grids dynamically based on alphanumeric strings.

---

## 6. Verification & Validation Plan

### Automated Build Verification
* Run `npm run build` and verify that the auto-registry plugin outputs the dynamic `manifest.json` correctly with all 5 new tools registered.
* Verify no Rollup bundling errors or Vite warnings occur.

### Manual Visual Verification
* Check dark and light themes across the homepage and all pages.
* Ensure all back buttons and toggle controls render clean SVGs without formatting shifts.
* Test that audio sweeps do not distort and keyboard keydown bindings match the visual active transitions perfectly.
* Test offline compatibility (simulate flight mode) to ensure all tools execute without errors.
