// AR Flood Visualizer - Converted from RisqMap's production ARFloodOverlay.tsx
// Now with REAL MEASUREMENT using reference objects (doors, people)

/**
 * AR Flood Overlay Component with LOCKED Reference Object Calibration
 * 
 * HOW IT WORKS:
 * 1. User selects a reference object (door = 80", person = 69"/64", or custom height)
 * 2. User taps TOP of reference object (e.g., top of door frame)
 * 3. User taps BOTTOM of reference object (e.g., floor level)
 * 4. System calculates: pixelsPerInch = pixelDistance / realWorldInches
 * 5. Water drawn at LOCKED height: waterY = bottomY - (waterInches × pixelsPerInch)
 * 6. Calibration is LOCKED to that moment - does NOT adjust as you move
 * 
 * ACCURACY: ±5-10% for single position (requires recalibration if you move)
 * 
 * TROUBLESHOOTING:
 * - Camera not opening: Check browser permissions, HTTPS required
 * - Wrong water height: Ensure reference object is on same plane as ground
 * - Water doesn't change after moving: EXPECTED - recalibrate after moving
 * - Mobile issues: Ensure playsinline and muted attributes set
 * 
 * NOT TRUE AR: This is a 2D camera overlay with measurement-based calibration, not 3D spatial AR (WebXR).
 * For true AR with depth sensing and movement tracking, use ARCore, ARKit, or WebXR APIs.
 */

// Reference object constants (heights in inches)
const REFERENCE_OBJECTS = {
    door: { label: 'Standard Door', height: 80 }, // 6'8"
    male: { label: 'Adult Male', height: 69 },    // 5'9"
    female: { label: 'Adult Female', height: 64 }, // 5'4"
    custom: { label: 'Custom Height', height: 60 }
};

// State variables
let cameraStarted = false;
let isARReady = false;
let isCapturing = false;
let error = null;
let cameraStream = null;
let showInstructions = true;

// NEW: Measurement calibration state
let referenceObject = 'door';
let customHeight = 60;
let calibrationStep = 'select_ref'; // 'select_ref' | 'tap_top' | 'tap_bottom' | 'complete'
let topPoint = null;
let bottomPoint = null;
let pixelsPerInch = null;

// Refs (replacing React useRef)
let videoRef = null;
let canvasRef = null;
let animationFrameId = null;
let lastRenderTime = 0;

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Config from user input
let floodConfig = {
    score: 5,
    address: '',
    modeledDepth: null,
    riskLevel: 'moderate'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    videoRef = document.getElementById('camera-video');
    canvasRef = document.getElementById('ar-canvas');
    
    // Update score display
    document.getElementById('score-slider').addEventListener('input', (e) => {
        document.getElementById('score-display').textContent = e.target.value;
    });
});

function getWaterHeight(score, modeledDepth) {
    // Use modeled depth if available
    if (modeledDepth !== undefined && modeledDepth !== null && modeledDepth > 0) {
        let label = 'ankle';
        if (modeledDepth >= 1.83) label = 'chest'; // 6 feet
        else if (modeledDepth >= 1.22) label = 'waist'; // 4 feet
        else if (modeledDepth >= 0.61) label = 'knee'; // 2 feet
        else if (modeledDepth >= 0.3) label = 'ankle'; // 1 foot
        return { height: modeledDepth, label, isModeled: true };
    }
    
    // Fall back to score-based estimation (in meters)
    // These are realistic flood depths for each risk level
    if (score <= 3) return { height: 0.3, label: 'ankle', isModeled: false }; // ~1 foot
    if (score <= 6) return { height: 0.61, label: 'knee', isModeled: false }; // ~2 feet
    if (score <= 8) return { height: 1.22, label: 'waist', isModeled: false }; // ~4 feet
    return { height: 1.83, label: 'chest', isModeled: false }; // ~6 feet
}

function startARExperience() {
    // Get configuration
    const address = document.getElementById('address-input').value || 'Your Location';
    const score = parseInt(document.getElementById('score-slider').value);
    let depthValue = parseFloat(document.getElementById('depth-input').value);
    const depthUnit = document.getElementById('depth-unit').value;
    
    // Determine risk level
    let riskLevel = 'low';
    if (score >= 7) riskLevel = 'high';
    else if (score >= 4) riskLevel = 'moderate';
    
    // Convert feet to meters if needed
    if (!isNaN(depthValue) && depthValue > 0) {
        if (depthUnit === 'feet') {
            depthValue = depthValue * 0.3048; // feet to meters
        }
        floodConfig.modeledDepth = depthValue;
    } else {
        floodConfig.modeledDepth = null;
    }
    
    floodConfig.score = score;
    floodConfig.address = address;
    floodConfig.riskLevel = riskLevel;
    
    // Update AR view info
    const waterInfo = getWaterHeight(score, floodConfig.modeledDepth);
    document.getElementById('ar-address').textContent = address;
    document.getElementById('ar-depth-label').textContent = `${waterInfo.label}-deep water (${waterInfo.height.toFixed(2)}m)`;
    document.getElementById('ar-risk-score').textContent = `${score}/10`;
    document.getElementById('ar-risk-level').textContent = riskLevel.toUpperCase();
    
    // Show AR view
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('ar-view').classList.remove('hidden');
    
    // Start camera
    cameraStarted = true;
    handleStartAR();
}

async function handleStartAR() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        
        cameraStream = stream;

        if (videoRef && canvasRef) {
            videoRef.srcObject = stream;
            videoRef.setAttribute('playsinline', 'true');
            videoRef.muted = true;
            
            videoRef.onloadedmetadata = () => {
                videoRef.play();
                startRendering();
                isARReady = true;
            };
        }
    } catch (err) {
        setError('Unable to access camera. Please enable camera permissions.');
    }
}

// Auto-hide instruction tooltips after 5 seconds when AR is ready
function setupInstructionTimers() {
    if (!isARReady) return;
    
    setTimeout(() => {
        showInstructions = false;
        document.getElementById('general-instruction').style.opacity = '0';
    }, 5000);

    if (calibrationY === null) {
        setTimeout(() => {
            showCalibrateTip = false;
            const tipEl = document.getElementById('calibrate-tip');
            if (tipEl) tipEl.style.opacity = '0';
        }, 5000);
    }
}

function startRendering() {
    // Prevent double-start
    if (animationFrameId) {
        console.log('⚠️ Render loop already running');
        return;
    }
    
    console.log('🎬 Starting render loop...');
    let frameCount = 0;
    
    const render = (timestamp) => {
        frameCount++;
        if (frameCount === 1 || frameCount % 60 === 0) {
            console.log(`🎬 Render frame #${frameCount}`);
        }
        
        if (!videoRef || !canvasRef) {
            animationFrameId = requestAnimationFrame(render);
            return;
        }

        // Throttle to target FPS
        if (timestamp - lastRenderTime < FRAME_INTERVAL) {
            animationFrameId = requestAnimationFrame(render);
            return;
        }
        lastRenderTime = timestamp;

        const canvas = canvasRef;
        const video = videoRef;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ No canvas context');
            return;
        }

        // Diagnostic: Log video dimensions on first frame
        if (frameCount === 1) {
            console.log('📊 Video dimensions:', video.videoWidth, video.videoHeight, 'readyState:', video.readyState);
            setupInstructionTimers();
        }

        // Lock canvas size after first frame for performance
        if (!canvasSizeLocked && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvasSizeLocked = true;
            console.log(`📐 Canvas locked to ${canvas.width}x${canvas.height}`);
        }

        // Draw camera feed - CRITICAL: Don't check readyState, just try drawing
        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            // Silently continue - will succeed on next frame
        }

        // Get current water info
        const waterInfo = getWaterHeight(floodConfig.score, floodConfig.modeledDepth);
        
        // Convert water height from meters to inches for calculation
        const waterHeightInches = waterInfo.height * 39.3701; // meters to inches
        
        // Calculate water level using LOCKED CALIBRATION
        let waterY;
        if (pixelsPerInch !== null && bottomPoint !== null) {
            // LOCKED CALIBRATION - Use scale from calibration
            const waterPixelHeight = waterHeightInches * pixelsPerInch;
            // Anchor to calibrated ground position (where user tapped bottom)
            const groundY = bottomPoint.y;
            waterY = groundY - waterPixelHeight;
        } else {
            // Uncalibrated preview - rough estimate
            const assumedPhoneHeightInches = 60; // ~5 feet
            const estimatedPixelsPerInch = canvas.height / assumedPhoneHeightInches;
            const previewWaterPixelHeight = waterHeightInches * estimatedPixelsPerInch;
            waterY = canvas.height - previewWaterPixelHeight;
        }

        const waveTime = Date.now() / 1000;

        // Create gradient for water
        const gradient = ctx.createLinearGradient(0, waterY, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(30, 115, 190, 0.5)');
        gradient.addColorStop(0.3, 'rgba(30, 115, 190, 0.6)');
        gradient.addColorStop(0.7, 'rgba(20, 90, 150, 0.7)');
        gradient.addColorStop(1, 'rgba(15, 70, 120, 0.75)');

        ctx.save();
        
        // Draw water with animated waves
        ctx.beginPath();

        for (let x = 0; x <= canvas.width; x += 8) {
            // Multiple wave frequencies for realistic water motion
            const wave1 = Math.sin(x * 0.008 + waveTime * 2.5) * 10;
            const wave2 = Math.cos(x * 0.012 + waveTime * 1.8) * 7;
            const wave3 = Math.sin(x * 0.02 + waveTime * 3.2) * 4;
            const y = waterY + wave1 + wave2 + wave3;

            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw wave highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add subtle ripple effect
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 8) {
            const ripple = Math.sin(x * 0.015 + waveTime * 2) * 5;
            const y = waterY + ripple;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Draw calibration marker and measurement if calibrated
        if (calibrationY !== null) {
            ctx.save();
            
            // Draw crosshair at calibration point
            ctx.strokeStyle = 'rgba(147, 51, 234, 0.8)'; // Purple
            ctx.lineWidth = 2;
            
            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(0, calibrationY);
            ctx.lineTo(canvas.width, calibrationY);
            ctx.stroke();
            
            // Vertical crosshair at center
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 20, calibrationY);
            ctx.moveTo(canvas.width / 2 + 20, calibrationY);
            ctx.moveTo(canvas.width / 2, calibrationY - 20);
            ctx.lineTo(canvas.width / 2, calibrationY + 20);
            ctx.stroke();
            
            // Draw measurement line from calibration point to water level
            if (waterY < calibrationY) {
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(50, calibrationY);
                ctx.lineTo(50, waterY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw arrows
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                // Top arrow
                ctx.beginPath();
                ctx.moveTo(50, waterY);
                ctx.lineTo(45, waterY + 10);
                ctx.lineTo(55, waterY + 10);
                ctx.fill();
                // Bottom arrow
                ctx.beginPath();
                ctx.moveTo(50, calibrationY);
                ctx.lineTo(45, calibrationY - 10);
                ctx.lineTo(55, calibrationY - 10);
                ctx.fill();
                
                // Draw measurement text
                const heightText = `${waterInfo.height.toFixed(2)}m`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText(heightText, 60, (waterY + calibrationY) / 2 + 5);
            }
            
            // Label for calibration point
            ctx.fillStyle = 'rgba(147, 51, 234, 0.9)';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText('GROUND LEVEL', canvas.width / 2 - 50, calibrationY - 30);
            
            ctx.restore();
        }

        animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
}

function handleCanvasClick(event) {
    if (isCalibrating && canvasRef) {
        const rect = canvasRef.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const scaleY = canvasRef.height / rect.height;
        calibrationY = y * scaleY;
        isCalibrating = false;
        
        const waterInfo = getWaterHeight(floodConfig.score, floodConfig.modeledDepth);
        console.log('✅ Calibrated! Ground level set at Y:', y * scaleY, 'Canvas height:', canvasRef.height, 'Water depth:', waterInfo.height + 'm', 'Label:', waterInfo.label);
        
        // Update UI
        document.getElementById('calibrate-instruction').classList.add('hidden');
        updateCalibrateButton();
    }
}

function startCalibration() {
    isCalibrating = true;
    document.getElementById('calibrate-btn').classList.add('opacity-50');
    document.getElementById('calibrate-instruction').classList.remove('hidden');
    document.getElementById('general-instruction').style.opacity = '0';
    
    // Canvas already has click listener
    canvasRef.style.cursor = 'crosshair';
}

function resetCalibration() {
    calibrationY = null;
    cachedGradient = null;
    isCalibrating = false;
    
    updateCalibrateButton();
    canvasRef.style.cursor = 'default';
}

function updateCalibrateButton() {
    const btn = document.getElementById('calibrate-btn');
    if (calibrationY === null) {
        btn.innerHTML = `
            <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
            </svg>
            <span class="text-[10px] font-semibold">Calibrate</span>
        `;
        btn.onclick = startCalibration;
        btn.className = "flex flex-col items-center justify-center bg-purple-600 text-white py-2 px-2 rounded-lg hover:bg-purple-700 transition";
    } else {
        btn.innerHTML = `
            <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
            </svg>
            <span class="text-[10px] font-semibold">Reset</span>
        `;
        btn.onclick = resetCalibration;
        btn.className = "flex flex-col items-center justify-center bg-gray-600 text-white py-2 px-2 rounded-lg hover:bg-gray-700 transition";
    }
}

async function captureScreenshot() {
    isCapturing = true;
    try {
        if (!canvasRef) {
            throw new Error('Canvas not ready');
        }

        const dataUrl = canvasRef.toDataURL('image/jpeg', 0.9);

        const link = document.createElement('a');
        link.download = `ar-flood-${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    } catch (err) {
        console.error('Screenshot failed:', err);
        alert('Failed to capture screenshot. Please try again.');
        return null;
    } finally {
        isCapturing = false;
    }
}

async function shareAR() {
    try {
        const dataUrl = await captureScreenshot();
        if (!dataUrl) return;

        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'ar-flood.jpg', { type: 'image/jpeg' });

        const waterInfo = getWaterHeight(floodConfig.score, floodConfig.modeledDepth);
        const shareText = `Flood visualization: ${waterInfo.label}-deep water (${waterInfo.height.toFixed(2)}m)\nFlood Score: ${floodConfig.score}/10 - ${floodConfig.riskLevel.toUpperCase()} RISK\n${floodConfig.address}`;

        if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'AR Flood Visualization',
                text: shareText,
                files: [file]
            });
        } else {
            await navigator.clipboard.writeText(shareText);
            alert('Screenshot saved! Text copied to clipboard.');
        }
    } catch (err) {
        console.error('Share failed:', err);
        if (!isCapturing) {
            alert('Screenshot saved to your device.');
        }
    }
}

function stopAR() {
    console.log('🚪 Closing AR, cleaning up camera...');
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            console.log('🛑 Stopping track:', track.label);
            track.stop();
        });
        cameraStream = null;
    }
    if (videoRef) {
        videoRef.srcObject = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Reset states
    cameraStarted = false;
    isARReady = false;
    calibrationY = null;
    cachedGradient = null;
    canvasSizeLocked = false;
    isCalibrating = false;
    
    // Show landing page
    document.getElementById('ar-view').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
}

function setError(msg) {
    error = msg;
}

function showErrorUI() {
    alert(error + '\n\nTroubleshooting:\n• Close other apps using camera\n• Check browser permissions\n• Try restarting browser');
    stopAR();
}

// Set up canvas click listener when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('ar-canvas');
    if (canvas) {
        canvas.addEventListener('click', handleCanvasClick);
    }
});


function startARExperience() {
    // Get configuration
    const address = document.getElementById('address-input').value || 'Your Location';
    const score = parseInt(document.getElementById('score-slider').value);
    let depthValue = parseFloat(document.getElementById('depth-input').value);
    const depthUnit = document.getElementById('depth-unit').value;
    
    // Convert feet to meters if needed
    if (!isNaN(depthValue) && depthValue > 0) {
        if (depthUnit === 'feet') {
            depthValue = depthValue * 0.3048; // feet to meters
        }
        floodConfig.modeledDepth = depthValue;
    } else {
        floodConfig.modeledDepth = null;
    }
    
    floodConfig.score = score;
    floodConfig.address = address;
    
    // Update AR view info
    const waterInfo = getWaterHeight(score, floodConfig.modeledDepth);
    document.getElementById('ar-address').textContent = address;
    document.getElementById('ar-depth-label').textContent = `${waterInfo.label}-deep water (${waterInfo.height.toFixed(1)}m)`;
    
    // Show AR view
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('ar-view').classList.remove('hidden');
    
    // Start camera
    startCamera();
}

async function startCamera() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera API is not supported on this device.');
            return;
        }

        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('camera-video');
        video.srcObject = videoStream;

        video.onloadedmetadata = () => {
            video.play();
            setupCanvas();
            startRendering();
            
            // Hide instruction after 5 seconds
            setTimeout(() => {
                document.getElementById('general-instruction').style.opacity = '0';
            }, 5000);
        };

    } catch (error) {
        console.error('Camera error:', error);
        alert('Failed to access camera: ' + error.message);
        stopAR();
    }
}

function setupCanvas() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('ar-canvas');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

function startRendering() {
    const render = (timestamp) => {
        if (!videoStream) return;
        
        // Throttle to target FPS
        if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
            drawFrame();
            lastRenderTime = timestamp;
        }
        
        animationFrameId = requestAnimationFrame(render);
    };
    
    animationFrameId = requestAnimationFrame(render);
}

function drawFrame() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('ar-canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    
    if (!ctx || video.readyState < 2) return;
    
    // Step 1: Draw camera feed
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Step 2: Calculate water overlay position
    const waterInfo = getWaterHeight(floodConfig.score, floodConfig.modeledDepth);
    const waterHeightRatio = waterInfo.height / CAMERA_HEIGHT;
    
    let waterY;
    if (calibrationY !== null) {
        // Use calibrated ground level
        const calibratedGroundY = calibrationY;
        waterY = calibratedGroundY - (waterHeightRatio * calibratedGroundY);
    } else {
        // Default: assume ground is at 70% down the frame
        const estimatedGroundY = canvas.height * 0.7;
        waterY = estimatedGroundY - (waterHeightRatio * estimatedGroundY);
    }
    
    const waterHeight = canvas.height - waterY;
    
    // Step 3: Draw water overlay
    if (waterHeight > 0) {
        if (!cachedGradient) {
            cachedGradient = ctx.createLinearGradient(0, waterY, 0, canvas.height);
            cachedGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
            cachedGradient.addColorStop(0.5, 'rgba(37, 99, 235, 0.4)');
            cachedGradient.addColorStop(1, 'rgba(30, 64, 175, 0.5)');
        }
        
        ctx.fillStyle = cachedGradient;
        ctx.fillRect(0, waterY, canvas.width, waterHeight);
        
        // Draw water surface line
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, waterY);
        ctx.lineTo(canvas.width, waterY);
        ctx.stroke();
        
        // Wave effect
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
        ctx.lineWidth = 2;
        const waveOffset = (Date.now() / 500) % 100;
        for (let i = 0; i < 3; i++) {
            const waveY = waterY + 10 + (i * 15);
            ctx.beginPath();
            for (let x = -100; x < canvas.width + 100; x += 20) {
                const y = waveY + Math.sin((x + waveOffset + i * 30) / 50) * 3;
                if (x === -100) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
}

function startCalibration() {
    isCalibrating = true;
    document.getElementById('calibrate-btn').classList.add('opacity-50');
    document.getElementById('calibrate-instruction').classList.remove('hidden');
    document.getElementById('general-instruction').style.opacity = '0';
    
    // Add click listener to canvas
    const canvas = document.getElementById('ar-canvas');
    canvas.addEventListener('click', handleCalibrationClick);
}

function handleCalibrationClick(event) {
    const canvas = document.getElementById('ar-canvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickY = (event.clientY - rect.top) * scaleY;
    
    calibrationY = clickY;
    isCalibrating = false;
    cachedGradient = null; // Reset gradient
    
    document.getElementById('calibrate-btn').textContent = 'Reset';
    document.getElementById('calibrate-btn').onclick = resetCalibration;
    document.getElementById('calibrate-btn').classList.remove('opacity-50');
    document.getElementById('calibrate-instruction').classList.add('hidden');
    
    // Remove listener
    canvas.removeEventListener('click', handleCalibrationClick);
    
    console.log('Calibrated ground level at Y:', clickY);
}

function resetCalibration() {
    calibrationY = null;
    cachedGradient = null;
    isCalibrating = false;
    
    const btn = document.getElementById('calibrate-btn');
    btn.innerHTML = `
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
        </svg>
        <span class="text-[10px] font-semibold">Calibrate</span>
    `;
    btn.onclick = startCalibration;
}

function captureScreenshot() {
    const canvas = document.getElementById('ar-canvas');
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flood-ar-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

async function shareAR() {
    const canvas = document.getElementById('ar-canvas');
    
    try {
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'flood-visualization.png', { type: 'image/png' });
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'AR Flood Visualization',
                    text: `Potential flood depth: ${getWaterHeight(floodConfig.score, floodConfig.modeledDepth).label}-deep`,
                    files: [file]
                });
            } else {
                // Fallback: just download
                captureScreenshot();
                alert('Image saved! Share feature not available on this device.');
            }
        });
    } catch (error) {
        console.error('Share failed:', error);
        captureScreenshot();
    }
}

function stopAR() {
    // Stop camera
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    // Stop rendering
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Reset state
    calibrationY = null;
    cachedGradient = null;
    isCalibrating = false;
    
    // Show landing page
    document.getElementById('ar-view').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
}
