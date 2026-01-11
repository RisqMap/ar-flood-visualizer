# 🌊 AR Flood Visualizer

**Open-source camera-based flood depth visualization tool**

See potential flood levels overlaid on your camera feed in real-time. Perfect for education, emergency preparedness demos, and visualizing flood risk scenarios.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![No Dependencies](https://img.shields.io/badge/dependencies-none-green.svg)
![Privacy First](https://img.shields.io/badge/privacy-local%20only-success.svg)

## 🚀 Features

- **📷 Real-time Camera Overlay**: Stream your device camera and overlay flood water visualization
- **🎯 Calibration System**: Tap ground-level references (doors, curbs) for accurate height scaling
- **📊 Flexible Configuration**: Use risk scores (0-10) or custom depths in meters/feet
- **💾 Screenshot & Share**: Capture and share your visualization
- **🔒 Privacy-First**: All processing happens locally in your browser - no data uploaded
- **📱 Mobile & Desktop**: Works on all modern devices with camera access
- **⚡ Zero Dependencies**: Pure vanilla JavaScript + Tailwind CSS

## 🎯 Quick Start

1. **Download the files**:
   - `index.html` - Main application
   - `ar-flood.js` - Core AR logic

2. **Serve over HTTPS** (camera API requirement):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server
   ```

3. **Open in browser**: Navigate to `https://localhost:8000`

4. **Grant camera access** when prompted

## 🎬 How to Use

1. **Configure Your Scenario**:
   - Enter location/address (optional)
   - Set flood risk score (0-10) OR custom depth
   - Click "Start AR Camera"

2. **View AR Overlay**:
   - Point camera at your room/property
   - Blue water overlay shows flood depth
   - Wave animations simulate water surface

3. **Calibrate for Accuracy** (optional):
   - Tap "Calibrate" button
   - Tap on floor or door frame in camera view
   - Water level adjusts to real-world scale

4. **Capture & Share**:
   - Tap "Photo" to download screenshot
   - Tap "Share" to use native share (mobile)

## 🧮 How It Works

### Technical Overview

**2D Camera Overlay (Not True AR)**:
- Uses `getUserMedia()` API for camera access
- Streams video to `<video>` element
- Canvas draws each frame: camera feed FIRST, then water overlay on top
- Calculations assume camera at ~1.6m eye level

**Flood Depth Calculation**:
```javascript
// Score-based (0-10)
score <= 3: 0.3m (ankle-deep)
score 4-6:  0.6m (knee-deep)
score 7-8:  1.2m (waist-deep)
score 9-10: 1.8m (chest-deep)

// Or use custom depth in meters
waterY = groundY - (depth / cameraHeight) * groundY
```

**Calibration System**:
- Default: Assumes ground at 70% down the frame
- Calibrated: User taps actual ground-level reference
- Recalculates water position based on true ground level

## ⚙️ Configuration Options

### HTML Inputs

```html
<!-- Address -->
<input id="address-input" placeholder="Location">

<!-- Risk Score (0-10) -->
<input id="score-slider" type="range" min="0" max="10">

<!-- Custom Depth -->
<input id="depth-input" type="number" step="0.1">
<select id="depth-unit">
  <option value="meters">meters</option>
  <option value="feet">feet</option>
</select>
```

### JavaScript Config

```javascript
floodConfig = {
    score: 5,              // 0-10 risk score
    address: 'Location',   // Display label
    modeledDepth: 0.6      // Override with meters
}
```

## 🎨 Customization

### Change Water Color

```javascript
// In drawFrame() function (ar-flood.js)
cachedGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');  // Light blue
cachedGradient.addColorStop(0.5, 'rgba(37, 99, 235, 0.4)'); // Blue
cachedGradient.addColorStop(1, 'rgba(30, 64, 175, 0.5)');   // Dark blue
```

### Adjust Performance

```javascript
const TARGET_FPS = 30;  // Lower for older devices (e.g., 20)
```

### Modify Camera Height

```javascript
const CAMERA_HEIGHT = 1.6;  // meters, adjust for average user height
```

## 📱 Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ | ✅ | Best performance |
| Safari | ✅ | ✅ | Requires HTTPS |
| Firefox | ✅ | ✅ | Full support |
| Edge | ✅ | ✅ | Chromium-based |

**Requirements**:
- HTTPS connection (or localhost)
- Camera permission granted
- Modern browser (ES6+ support)

## ⚠️ Important Disclaimers

This is an **EDUCATIONAL VISUALIZATION TOOL**:

- ❌ NOT a precise flood prediction model
- ❌ NOT for emergency decision-making
- ❌ NOT a replacement for official flood maps
- ✅ Great for educational demos
- ✅ Useful for visualizing scenarios
- ✅ Helps understand flood depths

**Always consult**:
- Official FEMA flood maps
- Local authorities
- Professional surveyors
- Licensed engineers

## 🔒 Privacy & Security

- **No data collection**: Nothing sent to servers
- **No tracking**: No analytics or cookies
- **Local processing**: All rendering happens in browser
- **No storage**: Camera feed not saved (unless you screenshot)
- **Open source**: Audit the code yourself

## 📄 License

MIT License - feel free to use, modify, and distribute!

## 🤝 Contributing

Contributions welcome! Ideas:

- [ ] Add flood zone overlays (FEMA data)
- [ ] 3D depth visualization
- [ ] Multiple water types (storm surge, river flood)
- [ ] Historical flood event presets
- [ ] Multi-language support
- [ ] Accessibility improvements

## 🙏 Credits

Originally developed for [RisqMap](https://risqmap.com) - a comprehensive climate risk intelligence platform. Open-sourced to help the community visualize flood risk.

## 🐛 Troubleshooting

**Camera won't open**:
- Check browser permissions (Settings > Privacy > Camera)
- Ensure HTTPS connection
- Try different browser

**Water appears wrong height**:
- Use calibration feature
- Tap on actual floor/door frame
- Check that camera is level

**Performance issues**:
- Lower TARGET_FPS in JavaScript
- Close other tabs
- Try on newer device

**Screenshot not working**:
- Check browser storage permissions
- Try different browser

## 📧 Support

Having issues? Open an issue on GitHub or contact us.

---

**Made with ❤️ for disaster preparedness education**
