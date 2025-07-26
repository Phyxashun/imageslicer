const DEBUG = true;
if(DEBUG) console.log('DEBUG MODE IS ON!!!');

/**
 * Analyzes a spritesheet to guess the number of rows and columns.
 * Optimized version with multiple detection strategies.
 */
export async function autoDetectGrid(imageBitmap) {
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    if (DEBUG) console.log(`Analyzing image: ${width}x${height}`);

    // Try multiple detection strategies
    const strategies = [
        () => detectByTransitions(data, width, height),
        () => detectByEdges(data, width, height),
        () => detectByVariance(data, width, height)
    ];

    let bestResult = { rows: 1, cols: 1, confidence: 0 };

    for (const strategy of strategies) {
        const result = strategy();
        if (result.confidence > bestResult.confidence) {
            bestResult = result;
        }
    }

    if (DEBUG) console.log('Best detection result:', bestResult);

    return {
        rows: bestResult.rows || 1,
        cols: bestResult.cols || 1
    };
}

/**
 * Detection strategy 1: Color transition analysis (your original approach, improved)
 */
function detectByTransitions(data, width, height) {
    const horizontalChanges = scanAxisOptimized(data, width, height, 'horizontal');
    const verticalChanges = scanAxisOptimized(data, width, height, 'vertical');

    const colsResult = estimateDivisionsImproved(horizontalChanges, width, 'vertical');
    const rowsResult = estimateDivisionsImproved(verticalChanges, height, 'horizontal');

    return {
        rows: rowsResult.divisions,
        cols: colsResult.divisions,
        confidence: (colsResult.confidence + rowsResult.confidence) / 2
    };
}

/**
 * Detection strategy 2: Edge detection using luminance gradients
 */
function detectByEdges(data, width, height) {
    const horizontalEdges = detectEdges(data, width, height, 'horizontal');
    const verticalEdges = detectEdges(data, width, height, 'vertical');

    const colsResult = estimateDivisionsImproved(horizontalEdges, width, 'vertical');
    const rowsResult = estimateDivisionsImproved(verticalEdges, height, 'horizontal');

    return {
        rows: rowsResult.divisions,
        cols: colsResult.divisions,
        confidence: (colsResult.confidence + rowsResult.confidence) / 2 * 0.9 // Slightly lower priority
    };
}

/**
 * Detection strategy 3: Variance-based detection
 */
function detectByVariance(data, width, height) {
    const horizontalVariance = calculateVarianceProfile(data, width, height, 'horizontal');
    const verticalVariance = calculateVarianceProfile(data, width, height, 'vertical');

    const colsResult = estimateDivisionsImproved(verticalVariance, width, 'vertical');
    const rowsResult = estimateDivisionsImproved(horizontalVariance, height, 'horizontal');

    return {
        rows: rowsResult.divisions,
        cols: colsResult.divisions,
        confidence: (colsResult.confidence + rowsResult.confidence) / 2 * 0.8 // Lowest priority
    };
}

/**
 * Optimized axis scanning with better color difference detection
 */
function scanAxisOptimized(data, width, height, direction) {
    const results = [];
    const colorThreshold = 30; // More sensitive to color changes

    function getPixelLuminance(r, g, b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    function arePixelsDifferent(pixel1, pixel2, threshold) {
        // Use both color difference and luminance difference
        const colorDiff = Math.sqrt(
            Math.pow(pixel1[0] - pixel2[0], 2) +
            Math.pow(pixel1[1] - pixel2[1], 2) +
            Math.pow(pixel1[2] - pixel2[2], 2)
        );

        const lum1 = getPixelLuminance(pixel1[0], pixel1[1], pixel1[2]);
        const lum2 = getPixelLuminance(pixel2[0], pixel2[1], pixel2[2]);
        const lumDiff = Math.abs(lum1 - lum2);

        return colorDiff > threshold || lumDiff > threshold * 0.5;
    }

    if (direction === 'horizontal') {
        for (let y = 0; y < height; y++) {
            let transitions = 0;
            let lastPixel = null;

            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const currentPixel = [data[i], data[i + 1], data[i + 2], data[i + 3]];

                if (lastPixel && arePixelsDifferent(currentPixel, lastPixel, colorThreshold)) {
                    transitions++;
                }
                lastPixel = currentPixel;
            }
            results.push(transitions);
        }
    } else {
        for (let x = 0; x < width; x++) {
            let transitions = 0;
            let lastPixel = null;

            for (let y = 0; y < height; y++) {
                const i = (y * width + x) * 4;
                const currentPixel = [data[i], data[i + 1], data[i + 2], data[i + 3]];

                if (lastPixel && arePixelsDifferent(currentPixel, lastPixel, colorThreshold)) {
                    transitions++;
                }
                lastPixel = currentPixel;
            }
            results.push(transitions);
        }
    }

    return results;
}

/**
 * Edge detection using Sobel-like operator
 */
function detectEdges(data, width, height, direction) {
    const edges = [];

    function getPixelLuminance(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        const i = (y * width + x) * 4;
        return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    if (direction === 'horizontal') {
        for (let y = 0; y < height; y++) {
            let edgeStrength = 0;
            for (let x = 1; x < width - 1; x++) {
                const left = getPixelLuminance(x - 1, y);
                const right = getPixelLuminance(x + 1, y);
                edgeStrength += Math.abs(right - left);
            }
            edges.push(edgeStrength / (width - 2));
        }
    } else {
        for (let x = 0; x < width; x++) {
            let edgeStrength = 0;
            for (let y = 1; y < height - 1; y++) {
                const top = getPixelLuminance(x, y - 1);
                const bottom = getPixelLuminance(x, y + 1);
                edgeStrength += Math.abs(bottom - top);
            }
            edges.push(edgeStrength / (height - 2));
        }
    }

    return edges;
}

/**
 * Calculate variance profile for detecting uniform regions vs sprite boundaries
 */
function calculateVarianceProfile(data, width, height, direction) {
    const variances = [];
    const windowSize = 3;

    function getPixelLuminance(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        const i = (y * width + x) * 4;
        return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    if (direction === 'horizontal') {
        for (let y = 0; y < height; y++) {
            const values = [];
            for (let x = 0; x < width; x++) {
                values.push(getPixelLuminance(x, y));
            }

            // Calculate local variance
            let variance = 0;
            for (let i = windowSize; i < values.length - windowSize; i++) {
                const window = values.slice(i - windowSize, i + windowSize + 1);
                const mean = window.reduce((a, b) => a + b) / window.length;
                const localVar = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
                variance += localVar;
            }
            variances.push(variance / Math.max(1, values.length - 2 * windowSize));
        }
    } else {
        for (let x = 0; x < width; x++) {
            const values = [];
            for (let y = 0; y < height; y++) {
                values.push(getPixelLuminance(x, y));
            }

            let variance = 0;
            for (let i = windowSize; i < values.length - windowSize; i++) {
                const window = values.slice(i - windowSize, i + windowSize + 1);
                const mean = window.reduce((a, b) => a + b) / window.length;
                const localVar = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
                variance += localVar;
            }
            variances.push(variance / Math.max(1, values.length - 2 * windowSize));
        }
    }

    return variances;
}

/**
 * Improved division estimation with better confidence scoring
 */
function estimateDivisionsImproved(signal, size, direction) {
    if (!signal || signal.length === 0) {
        return { divisions: 1, confidence: 0 };
    }

    if (DEBUG) console.log(`Estimating divisions for ${direction}, signal length: ${signal.length}, size: ${size}`);

    // 1. Smooth the signal
    const smoothed = applyGaussianSmoothing(signal, 1.5);

    // 2. Find peaks
    const peaks = findLocalMaxima(smoothed);
    if (DEBUG) console.log(`Found ${peaks.length} initial peaks`);

    if (peaks.length === 0) {
        return { divisions: 1, confidence: 0.1 };
    }

    // 3. Calculate prominences
    const peaksWithProminence = calculatePeakProminencesFixed(peaks, smoothed);
    if (DEBUG) console.log('Peaks with prominence:', peaksWithProminence);

    // 4. Filter by prominence (adaptive threshold)
    const maxProminence = Math.max(...peaksWithProminence.map(p => p.prominence));
    const prominenceThreshold = maxProminence * 0.2; // 20% of max prominence

    const prominentPeaks = peaksWithProminence.filter(p => p.prominence >= prominenceThreshold);
    if (DEBUG) console.log(`After prominence filtering (threshold: ${prominenceThreshold}):`, prominentPeaks.length);

    // 5. Filter by distance
    const minDistance = Math.floor(size / 50); // Minimum 2% of image size
    const finalPeaks = filterPeaksByDistance(prominentPeaks, minDistance);
    if (DEBUG) console.log(`After distance filtering (min distance: ${minDistance}):`, finalPeaks.length);

    // 6. Calculate confidence based on peak quality and regularity
    const confidence = calculateConfidence(finalPeaks, size, maxProminence);

    // 7. Estimate divisions
    let divisions = finalPeaks.length + 1;

    // 8. Apply common grid size heuristics
    divisions = applyGridHeuristics(divisions, size);

    if (DEBUG) console.log(`Final result: ${divisions} divisions, confidence: ${confidence}`);

    return { divisions, confidence };
}

/**
 * Fixed prominence calculation
 */
function calculatePeakProminencesFixed(peaks, data) {
    const peaksWithProminence = [];

    for (const peak of peaks) {
        const peakIndex = peak.index;
        const peakValue = peak.value;

        // Handle edge peaks
        if (peakIndex === 0 || peakIndex === data.length - 1) {
            peaksWithProminence.push({
                ...peak,
                prominence: 0
            });
            continue;
        }

        // Find left key col
        let leftKeyCol = peakValue;
        for (let i = peakIndex - 1; i >= 0; i--) {
            if (data[i] >= peakValue) break;
            leftKeyCol = Math.min(leftKeyCol, data[i]);
        }

        // Find right key col
        let rightKeyCol = peakValue;
        for (let i = peakIndex + 1; i < data.length; i++) {
            if (data[i] >= peakValue) break;
            rightKeyCol = Math.min(rightKeyCol, data[i]);
        }

        const keyCol = Math.max(leftKeyCol, rightKeyCol);
        const prominence = Math.max(0, peakValue - keyCol);

        peaksWithProminence.push({
            ...peak,
            prominence
        });
    }

    return peaksWithProminence;
}

/**
 * Calculate confidence score based on peak quality and distribution
 */
function calculateConfidence(peaks, size, maxProminence) {
    if (peaks.length === 0) return 0.1;

    let confidence = 0;

    // Factor 1: Peak strength relative to signal
    const avgProminence = peaks.reduce((sum, p) => sum + p.prominence, 0) / peaks.length;
    const strengthScore = Math.min(1, avgProminence / (maxProminence * 0.3));
    confidence += strengthScore * 0.4;

    // Factor 2: Peak regularity (how evenly spaced are they?)
    if (peaks.length > 1) {
        const distances = [];
        for (let i = 1; i < peaks.length; i++) {
            distances.push(peaks[i].index - peaks[i-1].index);
        }
        const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
        const distanceVariance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        const regularityScore = Math.max(0, 1 - (distanceVariance / (avgDistance * avgDistance)));
        confidence += regularityScore * 0.4;
    }

    // Factor 3: Number of peaks (reasonable grid sizes get bonus)
    const countScore = peaks.length >= 1 && peaks.length <= 20 ? 0.2 : 0.1;
    confidence += countScore;

    return Math.min(1, confidence);
}

/**
 * Apply heuristics for common grid sizes
 */
function applyGridHeuristics(divisions, size) {
    // Test common divisors that would create even sprite sizes
    const commonSizes = [8, 16, 24, 32, 48, 64, 96, 128, 256];

    for (const spriteSize of commonSizes) {
        const testDivisions = Math.round(size / spriteSize);
        if (Math.abs(testDivisions - divisions) <= 1 && size % testDivisions === 0) {
            if (DEBUG) console.log(`Applied heuristic: ${divisions} -> ${testDivisions} (sprite size: ${spriteSize})`);
            return testDivisions;
        }
    }

    // Test if current division creates reasonable sprite sizes
    const spriteSize = size / divisions;
    if (spriteSize >= 8 && spriteSize <= 512 && Number.isInteger(spriteSize)) {
        return divisions;
    }

    // Find nearest divisor that creates integer sprite sizes
    for (let d = divisions - 2; d <= divisions + 2; d++) {
        if (d > 0 && size % d === 0) {
            const testSpriteSize = size / d;
            if (testSpriteSize >= 8 && testSpriteSize <= 512) {
                if (DEBUG) console.log(`Applied divisor heuristic: ${divisions} -> ${d}`);
                return d;
            }
        }
    }

    return Math.max(1, divisions);
}

/**
 * Improved Gaussian smoothing
 */
function applyGaussianSmoothing(data, sigma) {
    const kernelSize = Math.max(3, Math.floor(sigma * 6) | 1); // Ensure odd size
    const kernelRadius = Math.floor(kernelSize / 2);
    const kernel = [];
    let sum = 0;

    // Generate Gaussian kernel
    for (let i = -kernelRadius; i <= kernelRadius; i++) {
        const value = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel.push(value);
        sum += value;
    }

    // Normalize kernel
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    // Apply convolution with edge handling
    const smoothed = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        let acc = 0;
        let weightSum = 0;

        for (let j = -kernelRadius; j <= kernelRadius; j++) {
            const idx = i + j;
            if (idx >= 0 && idx < data.length) {
                const weight = kernel[j + kernelRadius];
                acc += data[idx] * weight;
                weightSum += weight;
            }
        }

        smoothed[i] = acc / weightSum; // Normalize for edge effects
    }

    return smoothed;
}

/**
 * Find local maxima in signal
 */
function findLocalMaxima(data) {
    const peaks = [];
    if (data.length < 3) return peaks;

    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
            peaks.push({ index: i, value: data[i] });
        }
    }

    return peaks;
}

/**
 * Filter peaks by minimum distance
 */
function filterPeaksByDistance(peaks, minDistance) {
    if (!peaks || peaks.length === 0) return [];

    // Sort by prominence (descending) to keep strongest peaks
    const sortedPeaks = [...peaks].sort((a, b) => (b.prominence || b.value) - (a.prominence || a.value));

    const filtered = [];
    const usedIndices = new Set();

    for (const peak of sortedPeaks) {
        let tooClose = false;
        for (const usedIndex of usedIndices) {
            if (Math.abs(peak.index - usedIndex) < minDistance) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            filtered.push(peak);
            usedIndices.add(peak.index);
        }
    }

    // Sort back by index for consistent ordering
    return filtered.sort((a, b) => a.index - b.index);
}