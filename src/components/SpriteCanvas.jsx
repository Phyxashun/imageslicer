// noinspection JSValidateTypes
import React, { useEffect, useRef, forwardRef, useState, useCallback, useMemo } from 'react';
import { sliceSprite, canvasToBlob, downloadBlob } from '../utils/spriteSlicer';

const SpriteCanvas = forwardRef(({
                                     imageBitmap,
                                     spriteGrid,
                                     onSpriteClick,
                                     showGrid = true,
                                     gridColor = 'lime',
                                     maxWidth = window.innerWidth,
                                     maxHeight = window.innerHeight,
                                     enablePreview = true,
                                     exportFormat = 'png',
                                     exportQuality = 0.92
                                 }, ref) => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [previewCanvas, setPreviewCanvas] = useState(null);
    const [previewDataUrl, setPreviewDataUrl] = useState(null);
    const [pendingCoords, setPendingCoords] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const targetWidth = window.innerWidth * 0.75;
    const targetHeight = window.innerHeight * 0.75;
    const scaleFactor = Math.min(targetWidth / imageBitmap.width, targetHeight / imageBitmap.height);

    maxWidth = scaleFactor * maxWidth;
    maxHeight = scaleFactor * maxHeight;

    // Memoize scale calculation to avoid recalculation
    const canvasInfo = useMemo(() => {
        if (!imageBitmap) return null;

        const scaledWidth = imageBitmap.width * scaleFactor;
        const scaledHeight = imageBitmap.height * scaleFactor;
        const cellWidth = scaledWidth / spriteGrid.cols;
        const cellHeight = scaledHeight / spriteGrid.rows;

        return {
            scaleFactor,
            scaledWidth,
            scaledHeight,
            cellWidth,
            cellHeight
        };
    }, [imageBitmap, scaleFactor, spriteGrid.cols, spriteGrid.rows]);

    // Optimized grid drawing function
    const drawGrid = useCallback((ctx, info, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.8;

        // Draw vertical lines
        for (let i = 1; i < spriteGrid.cols; i++) {
            const x = Math.round(i * info.cellWidth);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, info.scaledHeight);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let j = 1; j < spriteGrid.rows; j++) {
            const y = Math.round(j * info.cellHeight);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(info.scaledWidth, y);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
    }, [spriteGrid]);

    // Draw cell highlight
    const drawCellHighlight = useCallback((ctx, info, cell, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(
            Math.round(cell.col * info.cellWidth),
            Math.round(cell.row * info.cellHeight),
            Math.ceil(info.cellWidth),
            Math.ceil(info.cellHeight)
        );
    }, []);

    // Optimized canvas drawing with requestAnimationFrame
    useEffect(() => {
        if (!imageBitmap || !canvasRef.current || !canvasInfo) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Cancel any pending animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
            // Set canvas size
            canvas.width = maxWidth;
            canvas.height = maxHeight;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw image
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imageBitmap, 0, 0, canvasInfo.scaledWidth, canvasInfo.scaledHeight);

            // Draw grid if enabled
            if (showGrid) {
                drawGrid(ctx, canvasInfo, gridColor);
            }

            // Draw hover highlight
            if (hoveredCell) {
                drawCellHighlight(ctx, canvasInfo, hoveredCell, 'rgba(255, 255, 0, 0.3)');
            }
        });

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [imageBitmap, spriteGrid, canvasInfo, showGrid, gridColor, hoveredCell, maxWidth, maxHeight, drawGrid, drawCellHighlight]);

    // Get cell coordinates from mouse position
    const getCellFromMousePos = useCallback((e) => {
        if (!canvasInfo) return null;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if click is within the scaled image bounds
        if (clickX > canvasInfo.scaledWidth || clickY > canvasInfo.scaledHeight || clickX < 0 || clickY < 0) {
            return null;
        }

        const col = Math.floor(clickX / canvasInfo.cellWidth);
        const row = Math.floor(clickY / canvasInfo.cellHeight);

        // Ensure we don't go out of bounds
        if (row >= spriteGrid.rows || col >= spriteGrid.cols || row < 0 || col < 0) {
            return null;
        }

        return { row, col };
    }, [canvasInfo, spriteGrid]);

    // Handle mouse move for hover effects
    const handleMouseMove = useCallback((e) => {
        const cell = getCellFromMousePos(e);
        setHoveredCell(cell);
    }, [getCellFromMousePos]);

    // Handle mouse leave to clear hover
    const handleMouseLeave = useCallback(() => {
        setHoveredCell(null);
    }, []);

    // Handle right-click for sprite preview
    const handleRightClick = useCallback(async (e) => {
        e.preventDefault();

        const cell = getCellFromMousePos(e);
        if (!cell || !enablePreview) return;

        try {
            // Create a full-size canvas from the original imageBitmap
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = imageBitmap.width;
            fullCanvas.height = imageBitmap.height;
            const fullCtx = fullCanvas.getContext('2d');
            fullCtx.drawImage(imageBitmap, 0, 0);

            const sprite = sliceSprite(fullCanvas, cell.row, cell.col, spriteGrid.rows, spriteGrid.cols, {
                cropTransparent: true
            });

            const dataUrl = sprite.toDataURL();

            setPreviewCanvas(sprite);
            setPreviewDataUrl(dataUrl);
            setPendingCoords(cell);

            // Call optional callback
            if (onSpriteClick) {
                onSpriteClick(cell, sprite);
            }
        } catch (error) {
            console.error('Error creating sprite preview:', error);
        }
    }, [getCellFromMousePos, imageBitmap, spriteGrid, enablePreview, onSpriteClick]);

    // Quick export without preview
    const handleQuickExport = useCallback(async (cell) => {
        if (isExporting) return;

        setIsExporting(true);
        try {
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = imageBitmap.width;
            fullCanvas.height = imageBitmap.height;
            const fullCtx = fullCanvas.getContext('2d');
            fullCtx.drawImage(imageBitmap, 0, 0);

            const sprite = sliceSprite(fullCanvas, cell.row, cell.col, spriteGrid.rows, spriteGrid.cols, {
                cropTransparent: true
            });

            const blob = await canvasToBlob(sprite, exportFormat, exportQuality);
            const filename = `sprite_r${String(cell.row).padStart(2, '0')}_c${String(cell.col).padStart(2, '0')}.${exportFormat}`;
            downloadBlob(blob, filename);
        } catch (error) {
            console.error('Error exporting sprite:', error);
        } finally {
            setIsExporting(false);
        }
    }, [imageBitmap, spriteGrid, exportFormat, exportQuality, isExporting]);

    // Handle left-click for quick actions
    const handleLeftClick = useCallback((e) => {
        const cell = getCellFromMousePos(e);
        if (!cell) return;

        // If preview is disabled, trigger immediate export
        if (!enablePreview) {
            return handleQuickExport(cell);
        }
    }, [getCellFromMousePos, enablePreview, handleQuickExport]);

    // Handle cancel preview
    const handleCancel = useCallback(() => {
        setPreviewCanvas(null);
        setPreviewDataUrl(null);
        setPendingCoords(null);
    }, []);

    // Handle confirm save from preview
    const handleConfirmSave = useCallback(async () => {
        if (!previewCanvas || !pendingCoords || isExporting) return;

        setIsExporting(true);
        try {
            const blob = await canvasToBlob(previewCanvas, exportFormat, exportQuality);
            const filename = `sprite_r${String(pendingCoords.row).padStart(2, '0')}_c${String(pendingCoords.col).padStart(2, '0')}.${exportFormat}`;
            downloadBlob(blob, filename);
            handleCancel();
        } catch (error) {
            console.error('Error saving sprite:', error);
        } finally {
            setIsExporting(false);
        }
    }, [previewCanvas, pendingCoords, isExporting, exportFormat, exportQuality, handleCancel]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (previewDataUrl) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    return handleConfirmSave();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    return handleCancel();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewDataUrl, handleConfirmSave, handleCancel]);

    return (
        <>
            <div className="canvas-container" style={styles.canvasContainer}>
                <canvas
                    ref={(el) => {
                        canvasRef.current = el;
                        if (ref) ref.current = el;
                    }}
                    style={{
                        ...styles.canvas,
                        width: maxWidth,
                        height: maxHeight,
                        cursor: hoveredCell ? 'pointer' : 'crosshair'
                    }}
                    onClick={handleLeftClick}
                    onContextMenu={handleRightClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />

                {/* Cell info overlay */}
                {hoveredCell && (
                    <div style={styles.cellInfo}>
                        Row: {hoveredCell.row}, Col: {hoveredCell.col}
                    </div>
                )}

                {/* Export indicator */}
                {isExporting && (
                    <div style={styles.exportIndicator}>
                        Exporting...
                    </div>
                )}
            </div>

            {/* Enhanced Preview Modal */}
            {previewDataUrl && (
                <div style={styles.overlay} onClick={handleCancel}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                Sprite Preview - Row {pendingCoords.row}, Col {pendingCoords.col}
                            </h3>
                            <button
                                style={styles.closeButton}
                                onClick={handleCancel}
                                aria-label={"Close"}
                                >
                                ×
                        </button>
                    </div>

                    <div style={styles.imageContainer}>
                        <img
                            src={previewDataUrl}
                            alt={`Sprite at row ${pendingCoords.row}, col ${pendingCoords.col}`}
                            style={styles.previewImage}
                        />
                        <div style={styles.imageInfo}>
                            {previewCanvas && `${previewCanvas.width} × ${previewCanvas.height} pixels`}
                        </div>
                    </div>

                    <div style={styles.modalActions}>
                        <button
                            onClick={handleConfirmSave}
                            disabled={isExporting}
                            style={{
                                ...styles.button,
                                ...styles.primaryButton,
                                ...(isExporting ? styles.disabledButton : {})
                            }}
                        >
                            {isExporting ? 'Saving...' : `Save as ${exportFormat.toUpperCase()}`}
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{...styles.button, ...styles.secondaryButton}}
                            disabled={isExporting}
                        >
                            Cancel
                        </button>
                    </div>

                    <div style={styles.modalFooter}>
                        <small>Right-click: Preview • Left-click: Quick export • Enter/Space: Save • Esc: Cancel</small>
                    </div>
                </div>
                </div>
                )}
</>
);
});

SpriteCanvas.displayName = 'SpriteCanvas';

export default SpriteCanvas;

const styles = {
    canvasContainer: {
        position: 'relative',
        display: 'inline-block',
        border: '2px solid #444',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    canvas: {
        display: 'block',
        imageRendering: 'pixelated'
    },
    cellInfo: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        pointerEvents: 'none'
    },
    exportIndicator: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(0, 150, 0, 0.9)',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)'
    },
    modal: {
        background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)',
        borderRadius: '12px',
        color: '#eee',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid #444'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #444',
        background: 'rgba(255, 255, 255, 0.05)'
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#ccc',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '0',
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        transition: 'all 0.2s ease'
    },
    imageContainer: {
        padding: '20px',
        textAlign: 'center',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    previewImage: {
        maxWidth: '400px',
        maxHeight: '300px',
        border: '2px solid #555',
        borderRadius: '8px',
        imageRendering: 'pixelated',
        background: 'repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%) 50% / 20px 20px'
    },
    imageInfo: {
        marginTop: '12px',
        fontSize: '14px',
        color: '#bbb',
        fontFamily: 'monospace'
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
        padding: '0 20px 16px',
        justifyContent: 'center'
    },
    modalFooter: {
        padding: '12px 20px',
        borderTop: '1px solid #444',
        background: 'rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        color: '#999'
    },
    button: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        minWidth: '100px'
    },
    primaryButton: {
        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
        color: '#fff'
    },
    secondaryButton: {
        background: 'transparent',
        color: '#ccc',
        border: '1px solid #555'
    },
    disabledButton: {
        opacity: 0.6,
        cursor: 'not-allowed'
    }
};