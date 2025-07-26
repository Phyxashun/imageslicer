/* eslint-disable no-unused-vars */

const DEBUG = true;
if (DEBUG) console.log('DEBUG MODE IS ON!!!');

/**
 * Extracts a single sprite from the canvas with optional padding removal.
 * @param {HTMLCanvasElement} canvas - Full spritesheet canvas.
 * @param {number} row - Row index (starting at 0).
 * @param {number} col - Column index (starting at 0).
 * @param {number} totalRows - Total number of rows.
 * @param {number} totalCols - Total number of columns.
 * @param {Object} options - Additional options.
 * @returns {HTMLCanvasElement} - A new canvas containing the extracted sprite.
 */
export function sliceSprite(canvas, row, col, totalRows, totalCols, options = {}) {
    const {
        removePadding = false,
        paddingColor = 'transparent',
        mode = 'color', // 'transparent', 'color', 'edge'
        maintainAspectRatio = false
    } = options;

    const spriteWidth = Math.floor(canvas.width / totalCols);
    const spriteHeight = Math.floor(canvas.height / totalRows);
    let x = col * spriteWidth;
    let y = row * spriteHeight;
    let width = spriteWidth;
    let height = spriteHeight;

    // Handle edge cases for non-evenly divisible dimensions
    if (col === totalCols - 1) {
        width = canvas.width - x; // Last column gets remaining pixels
    }
    if (row === totalRows - 1) {
        height = canvas.height - y; // Last row gets remaining pixels
    }

    let offscreen = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : document.createElement('canvas');

    offscreen.width = width;
    offscreen.height = height;

    const ctx = offscreen.getContext('2d');
    ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    // Post-processing options
    if (removePadding || mode === 'transparent') {
        offscreen = cropCanvas(offscreen, {
            mode,
            backgroundColor: paddingColor === 'transparent' ? null : paddingColor
        });
    }

    if (DEBUG) {
        console.log(`Sliced sprite at (${row}, ${col}): ${width}x${height} -> ${offscreen.width}x${offscreen.height}`);
    }

    return offscreen;
}

export function isBackground(x, y, width, data, backgroundColor, tolerance, mode) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (mode === 'transparent') return a < 10;

    if (backgroundColor) {
        const [bgR, bgG, bgB] = backgroundColor;
        return (
            Math.abs(r - bgR) <= tolerance &&
            Math.abs(g - bgG) <= tolerance &&
            Math.abs(b - bgB) <= tolerance
        );
    }
}

/**
 * Crops a canvas to remove transparent or solid color padding.
 * @param {HTMLCanvasElement} canvas - Canvas to crop.
 * @param {Object} options - Cropping options.
 * @returns {HTMLCanvasElement} - Cropped canvas.
 */
export function cropCanvas(canvas, options = {}) {
    const {
        mode = 'transparent',
        backgroundColor = null,
        tolerance = 10,
        minWidth = 1,
        minHeight = 1
    } = options;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    // Find content bounds
    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!isBackground(x, y, width, data, backgroundColor, tolerance, mode)) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    // If no content found, return a minimal canvas
    if (maxX === -1) {
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = minWidth;
        emptyCanvas.height = minHeight;
        return emptyCanvas;
    }

    // Create cropped canvas
    const cropWidth = Math.max(minWidth, maxX - minX + 1);
    const cropHeight = Math.max(minHeight, maxY - minY + 1);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return croppedCanvas;
}

/**
 * Converts a canvas to a Blob with specified format and quality.
 * @param {HTMLCanvasElement} canvas - Canvas element.
 * @param {string} format - Image format ('png', 'jpeg', 'webp').
 * @param {number} quality - Quality for lossy formats (0-1).
 * @returns {Promise<Blob>} - Image blob.
 */
export function canvasToBlob(canvas, format = 'png', quality = 0.92) {
    return new Promise((resolve, reject) => {
        const mimeType = `image/${format}`;

        if (!canvas.toBlob) {
            // Fallback for old browsers (if needed)
            const dataUrl = canvas.toDataURL(`image/${format}`, quality);
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const buffer = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) buffer[i] = byteString.charCodeAt(i);
            return resolve(new Blob([buffer], { type: mimeString }));
        }

        try {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, mimeType, format === 'jpeg' || format === 'webp' ? quality : undefined);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Legacy PNG conversion for backward compatibility.
 */
export function canvasToPNGBlob(canvas) {
    return canvasToBlob(canvas, 'png');
}

/**
 * Downloads a blob with improved error handling and progress tracking.
 * @param {Blob} blob - Image blob.
 * @param {string} filename - Name of the file to save.
 * @param {Function} onProgress - Optional progress callback.
 */
export function downloadBlob(blob, filename, onProgress = null) {
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;

        // Add to DOM temporarily for some browsers
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);

        if (onProgress) onProgress(filename);
    } catch (error) {
        console.error('Download failed:', error);
        throw error;
    }
}

export async function processSprite(row, col, i, canvas, rows, cols, options) {
    const {
        format = 'png',
        quality = 0.92,
        prefix = 'sprite',
        removePadding = false,
        mode = 'transparent',
        onProgress = null,
        onError = null,
        namingPattern = 'row_col', // 'row_col', 'sequential', 'custom'
        customNamer = null
    } = options;

    const totalSprites = rows * cols;
    let processed = 0;
    let errors = [];

    try {
        const spriteCanvas = sliceSprite(canvas, row, col, rows, cols, {
            removePadding,
            mode
        });

        const blob = await canvasToBlob(spriteCanvas, format, quality);

        const filename = generateFilename(prefix, row, col, i, namingPattern, customNamer, format);

        downloadBlob(blob, filename);
        processed++;

        if (onProgress) {
            onProgress(processed, totalSprites, filename);
        }

        return { success: true, filename };
    } catch (error) {
        errors.push({ row, col, error: error.message });
        if (onError) onError(error, row, col);
        return { success: false, row, col, error };
    }
}

/**
 * Enhanced sprite export with batch processing and progress tracking.
 * @param {HTMLCanvasElement} canvas - Full spritesheet canvas.
 * @param {number} rows - Total number of rows.
 * @param {number} cols - Total number of columns.
 * @param {Object} options - Export options.
 */
export async function exportAllSprites(canvas, rows, cols, options = {}) {
    const {
        batchSize = 5, // Process in batches to avoid overwhelming the browser
        onComplete = null,
        onError = null,
    } = options;

    const totalSprites = rows * cols;
    let processed = 0;
    let errors = [];

    try {
        // Process sprites in batches
        for (let batchStart = 0; batchStart < totalSprites; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, totalSprites);
            const batchPromises = [];

            for (let i = batchStart; i < batchEnd; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                batchPromises.push(processSprite(row, col, i, canvas, rows, cols, options));
            }
            await Promise.all(batchPromises);
            if (batchEnd < totalSprites) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        if (onComplete) onComplete(processed, errors);
        return { processed, errors };
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
}

/**
 * Generate filename based on naming pattern.
 */
export function generateFilename(prefix, row, col, index, pattern, customNamer, format) {
    const ext = `.${format}`;

    if (customNamer && typeof customNamer === 'function') {
        return customNamer(row, col, index) + ext;
    }

    switch (pattern) {
        case 'sequential':
            return `${prefix}_${String(index).padStart(3, '0')}${ext}`;
        case 'row_col':
        default:
            return `${prefix}_r${String(row).padStart(2, '0')}_c${String(col).padStart(2, '0')}${ext}`;
    }
}

/**
 * Enhanced sprite bounds detection with multiple algorithms.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @returns {Array<{ x: number, y: number, width: number, height: number }>}
 */
export function detectSpriteBounds(canvas, options = {}) {
    options = {
        ...options,
        mode: 'transparent', // 'transparent', 'color', 'edge'
        backgroundColor: [255, 255, 255],
        tolerance: 20,
        minWidth: 8,
        minHeight: 8,
        maxSprites: 1000,
        mergeTouchingSprite: false,
        algorithm: 'floodfill' // 'floodfill', 'connected_components'
    };

    if (options.algorithm === 'connected_components') {
        return detectBoundsConnectedComponents(canvas, options);
    } else {
        return detectBoundsFloodFill(canvas, options);
    }
}

/**
 * Original flood-fill algorithm (optimized).
 */
export function detectBoundsFloodFill(canvas, options) {
    const {
        mode = 'transparent',
        backgroundColor = [255, 255, 255],
        tolerance = 20,
        minWidth = 8,
        minHeight = 8,
        maxSprites = 1000
    } = options;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const visited = new Uint8Array(width * height); // More memory efficient
    const boxes = [];

    function floodFill(startX, startY) {
        const stack = [[startX, startY]];
        let box = { left: startX, top: startY, right: startX, bottom: startY };
        let pixelCount = 0;

        while (stack.length && pixelCount < 100000) { // Prevent infinite loops
            const [x, y] = stack.pop();
            const index = y * width + x;

            if (x < 0 || y < 0 || x >= width || y >= height) continue;
            if (visited[index] || isBackground(x, y, width, imageData, backgroundColor, tolerance, mode)) continue;

            visited[index] = 1;
            pixelCount++;

            box.left = Math.min(box.left, x);
            box.right = Math.max(box.right, x);
            box.top = Math.min(box.top, y);
            box.bottom = Math.max(box.bottom, y);

            // Add neighbors
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        return box;
    }

    // Scan for sprites
    for (let y = 0; y < height && boxes.length < maxSprites; y++) {
        for (let x = 0; x < width && boxes.length < maxSprites; x++) {
            const index = y * width + x;
            if (!visited[index] && !isBackground(x, y, width, imageData, backgroundColor, tolerance, mode)) {
                const box = floodFill(x, y);
                const boxWidth = box.right - box.left + 1;
                const boxHeight = box.bottom - box.top + 1;

                // Filter by minimum size
                if (boxWidth >= minWidth && boxHeight >= minHeight) {
                    boxes.push({
                        x: box.left,
                        y: box.top,
                        width: boxWidth,
                        height: boxHeight
                    });
                }
            }
        }
    }

    return boxes;
}

/**
 * Connected components algorithm for better performance on large images.
 */
function detectBoundsConnectedComponents(canvas, options) {
    const {
        mode = 'transparent',
        backgroundColor = [255, 255, 255],
        tolerance = 20,
        minWidth = 8,
        minHeight = 8,
        maxSprites = 1000
    } = options;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    // Create binary mask
    const mask = new Uint8Array(width * height);

    // Fill binary mask
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            mask[y * width + x] = isBackground(x, y, width, imageData, backgroundColor, tolerance, mode) ? 0 : 1;
        }
    }

    // Connected components labeling
    const labels = new Int32Array(width * height);
    let currentLabel = 1;
    const equivalences = new Map();

    // First pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;

            if (mask[index] === 0) continue; // Background

            const neighbors = [];
            if (x > 0 && labels[index - 1] > 0) neighbors.push(labels[index - 1]);
            if (y > 0 && labels[index - width] > 0) neighbors.push(labels[index - width]);

            if (neighbors.length === 0) {
                labels[index] = currentLabel++;
            } else {
                const minLabel = Math.min(...neighbors);
                labels[index] = minLabel;

                // Record equivalences
                for (const neighbor of neighbors) {
                    if (neighbor !== minLabel) {
                        if (!equivalences.has(neighbor)) equivalences.set(neighbor, new Set());
                        equivalences.get(neighbor).add(minLabel);
                    }
                }
            }
        }
    }

    // Resolve equivalences and find bounding boxes
    const labelBounds = new Map();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            let label = labels[index];

            if (label === 0) continue;

            // Resolve equivalences
            while (equivalences.has(label)) {
                const equiv = equivalences.get(label);
                label = Math.min(...equiv);
            }

            if (!labelBounds.has(label)) {
                labelBounds.set(label, { minX: x, minY: y, maxX: x, maxY: y });
            } else {
                const bounds = labelBounds.get(label);
                bounds.minX = Math.min(bounds.minX, x);
                bounds.minY = Math.min(bounds.minY, y);
                bounds.maxX = Math.max(bounds.maxX, x);
                bounds.maxY = Math.max(bounds.maxY, y);
            }
        }
    }

    // Convert to boxes
    const boxes = [];
    for (const [label, bounds] of labelBounds) {
        const width = bounds.maxX - bounds.minX + 1;
        const height = bounds.maxY - bounds.minY + 1;

        if (width >= minWidth && height >= minHeight && boxes.length < maxSprites) {
            boxes.push({
                x: bounds.minX,
                y: bounds.minY,
                width,
                height
            });
        }
    }

    return boxes;
}

/**
 * Slice individual sprites from a canvas using detected bounding boxes.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @returns {Array<{canvas: HTMLCanvasElement, bounds: Object}>}
 */
export function sliceSpritesFromCanvas(canvas, options = {}) {
    const {
        sortBy = 'position', // 'position', 'size', 'area'
        cropToContent = true,
        ...detectOptions
    } = options;

    const boxes = detectSpriteBounds(canvas, detectOptions);

    // Sort boxes
    if (sortBy === 'position') {
        boxes.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
    } else if (sortBy === 'size') {
        boxes.sort((a, b) => (b.width + b.height) - (a.width + a.height));
    } else if (sortBy === 'area') {
        boxes.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    return boxes.map((box, index) => {
        const offscreen = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(box.width, box.height)
            : document.createElement('canvas');

        offscreen.width = box.width;
        offscreen.height = box.height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

        let finalCanvas = offscreen;
        if (cropToContent) {
            finalCanvas = cropCanvas(offscreen, { mode: 'transparent' });
        }

        return {
            canvas: finalCanvas,
            bounds: box,
            index
        };
    });
}

/**
 * Enhanced box merging with overlap detection.
 */
export function mergeBoxes(boxes, indices, options = {}) {
    const { padding = 0 } = options;

    if (!indices || indices.length === 0) return null;

    const selectedBoxes = indices.map(i => boxes[i]).filter(Boolean);
    if (selectedBoxes.length === 0) return null;

    const minX = Math.min(...selectedBoxes.map(b => b.x)) - padding;
    const minY = Math.min(...selectedBoxes.map(b => b.y)) - padding;
    const maxX = Math.max(...selectedBoxes.map(b => b.x + b.width)) + padding;
    const maxY = Math.max(...selectedBoxes.map(b => b.y + b.height)) + padding;

    return {
        x: Math.max(0, minX),
        y: Math.max(0, minY),
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Enhanced box splitting with better precision.
 */
export function splitBox(box, rows, cols, options = {}) {
    const {
        roundToPixels = true,
        distributeRemainder = true
    } = options;

    const { x, y, width, height } = box;
    const result = [];

    if (!distributeRemainder) {
        // Simple division
        const cellW = width / cols;
        const cellH = height / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellX = x + c * cellW;
                const cellY = y + r * cellH;

                result.push({
                    x: roundToPixels ? Math.round(cellX) : cellX,
                    y: roundToPixels ? Math.round(cellY) : cellY,
                    width: roundToPixels ? Math.round(cellW) : cellW,
                    height: roundToPixels ? Math.round(cellH) : cellH
                });
            }
        }
    } else {
        // Distribute remainders evenly
        const baseCellW = Math.floor(width / cols);
        const baseCellH = Math.floor(height / rows);
        const remainderW = width % cols;
        const remainderH = height % rows;

        let currentY = y;
        for (let r = 0; r < rows; r++) {
            const cellH = baseCellH + (r < remainderH ? 1 : 0);
            let currentX = x;

            for (let c = 0; c < cols; c++) {
                const cellW = baseCellW + (c < remainderW ? 1 : 0);

                result.push({
                    x: currentX,
                    y: currentY,
                    width: cellW,
                    height: cellH
                });

                currentX += cellW;
            }
            currentY += cellH;
        }
    }

    return result;
}