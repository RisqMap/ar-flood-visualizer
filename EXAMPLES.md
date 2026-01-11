# AR Flood Visualizer - Examples

## Example Scenarios

### 1. Low Risk (Score 0-3)
- **Depth**: 0.3m (1 foot)
- **Level**: Ankle-deep
- **Use Case**: Minor street flooding, nuisance flooding

### 2. Moderate Risk (Score 4-6)
- **Depth**: 0.6m (2 feet)
- **Level**: Knee-deep
- **Use Case**: Typical riverine flooding, heavy rain events

### 3. High Risk (Score 7-8)
- **Depth**: 1.2m (4 feet)
- **Level**: Waist-deep
- **Use Case**: Major flood events, coastal storm surge

### 4. Severe Risk (Score 9-10)
- **Depth**: 1.8m (6 feet)
- **Level**: Chest-deep
- **Use Case**: Catastrophic flooding, hurricane storm surge

## Real-World Flood Depths for Reference

| Event Type | Typical Depth | Score Equivalent |
|------------|---------------|------------------|
| Heavy Rain Ponding | 0.1-0.3m | 1-3 |
| 100-Year Flood (residential) | 0.3-0.9m | 3-6 |
| Hurricane Storm Surge | 1.2-3.0m | 7-10+ |
| Dam Failure | 2.0-6.0m | 10+ |

## Custom Depth Examples

```javascript
// Living room demo (knee-deep)
depth: 0.61, unit: 'meters'

// Garage scenario (ankle-deep)
depth: 1.0, unit: 'feet'

// Basement simulation (waist-deep)
depth: 1.2, unit: 'meters'

// Hurricane surge (chest-deep)
depth: 6.0, unit: 'feet'
```

## Educational Use Cases

### For Schools
- Science class flood demonstration
- Geography lessons on water cycles
- Emergency preparedness training

### For Emergency Management
- Public awareness campaigns
- Community meetings
- Evacuation planning education

### For Real Estate
- Property risk education
- Buyer awareness tool
- Insurance discussions

### For Homeowners
- Understanding flood insurance requirements
- Planning elevation/mitigation projects
- Visualizing potential impacts

## Screenshot Examples

Create educational materials by capturing screenshots:

1. **Comparison Series**: Same location, different depths
2. **Before/After**: Normal view vs flood scenario
3. **Educational Posters**: Add text explaining risks
4. **Social Media**: Share awareness content

## Tips for Best Results

### Lighting
- Use good indoor/outdoor lighting
- Avoid direct sunlight causing glare
- Evening lighting works well

### Camera Angle
- Hold device level (not tilted)
- Point at floor/ground-level objects
- Include recognizable references (doors, furniture)

### Calibration
- Tap door thresholds for accurate scale
- Use curbs or sidewalk edges
- Floor tile lines make good references

### Locations to Demo
- Living rooms (furniture as references)
- Driveways (cars as references)
- Porches (door frames as references)
- Basements (stairs as references)

## Integration Ideas

This standalone tool can be:

### Embedded in Websites
```html
<iframe src="ar-flood-visualizer/index.html" 
        width="100%" height="600px" 
        allow="camera">
</iframe>
```

### Linked from Apps
```javascript
window.open('https://yoursite.com/ar-flood/', '_blank');
```

### QR Code Access
Generate QR code pointing to hosted version for:
- Print materials
- Real estate listings
- Community meeting handouts
- Emergency preparedness guides

## Advanced Customization

### Preset Scenarios
Add buttons for common flood events:

```html
<button onclick="loadPreset('hurricane')">Hurricane Scenario</button>
<button onclick="loadPreset('river')">River Flood</button>
<button onclick="loadPreset('heavy-rain')">Heavy Rain</button>
```

```javascript
function loadPreset(type) {
    const presets = {
        'hurricane': { score: 9, depth: 1.8 },
        'river': { score: 6, depth: 0.9 },
        'heavy-rain': { score: 3, depth: 0.3 }
    };
    // Apply preset values
}
```

### Location-Specific Data
Integrate with APIs:

```javascript
// Fetch FEMA flood zone data
async function getFloodZone(lat, lng) {
    // Call FEMA API
    // Set depth based on zone
}
```

## FAQ

**Q: Why do I need HTTPS?**
A: Browser security requires HTTPS for camera access (or localhost for testing).

**Q: Can I use this for official flood mapping?**
A: No! This is educational only. Use FEMA maps for official data.

**Q: Does it work offline?**
A: Yes, once loaded. All processing is local.

**Q: Can I customize the water color?**
A: Yes! Edit the gradient in `ar-flood.js`.

**Q: How accurate is the depth?**
A: After calibration, visually representative. Not surveyor-accurate.

**Q: Can I add my own data?**
A: Yes! Modify the config system to accept API data.
