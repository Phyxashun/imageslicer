import React, {
    useEffect,
    useRef,
    forwardRef,
    useState,
    useCallback,
    useMemo,
} from "react";
import { sliceSprite, canvasToBlob, downloadBlob } from "../utils/spriteSlicer";

const SpriteCanvas = forwardRef(({ image, spriteGrid, dividers, setDividers }, ref) => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [previewCanvas, setPreviewCanvas] = useState(null);
    const [previewDataUrl, setPreviewDataUrl] = useState(null);
    const [pendingCoords, setPendingCoords] = useState(null);
    const [drag, setDrag] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const targetWidth = window.innerWidth * 0.75;
    const targetHeight = window.innerHeight * 0.75;
    const scaleFactor = useMemo(() => {
        if (!image) return 1;
        return Math.min(targetWidth / image.width, targetHeight / image.height);
    }, [image]);

    const canvasInfo = useMemo(() => {
        if (!image || !spriteGrid) return null;

        const scaledWidth = image.width * scaleFactor;
        const scaledHeight = image.height * scaleFactor;
        const cellWidth = scaledWidth / spriteGrid.cols;
        const cellHeight = scaledHeight / spriteGrid.rows;

        return {
            scaleFactor,
            scaledWidth,
            scaledHeight,
            cellWidth,
            cellHeight,
        };
    }, [image, scaleFactor, spriteGrid]);

    const drawGrid = useCallback(
        (ctx, info) => {
            ctx.strokeStyle = "lime";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.globalAlpha = 0.8;

            for (let i = 1; i < spriteGrid.cols; i++) {
                const x = Math.round(i * info.cellWidth);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, info.scaledHeight);
                ctx.stroke();
            }

            for (let j = 1; j < spriteGrid.rows; j++) {
                const y = Math.round(j * info.cellHeight);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(info.scaledWidth, y);
                ctx.stroke();
            }

            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        },
        [spriteGrid]
    );

    const drawCellHighlight = useCallback((ctx, info, cell) => {
        ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
        ctx.fillRect(
            Math.round(cell.col * info.cellWidth),
            Math.round(cell.row * info.cellHeight),
            Math.ceil(info.cellWidth),
            Math.ceil(info.cellHeight)
        );
    }, []);

    useEffect(() => {
        if (!image || !canvasRef.current || !canvasInfo) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
            canvas.width = canvasInfo.scaledWidth;
            canvas.height = canvasInfo.scaledHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(image, 0, 0, canvasInfo.scaledWidth, canvasInfo.scaledHeight);

            if (spriteGrid) {
                drawGrid(ctx, canvasInfo);
            }

            if (hoveredCell) {
                drawCellHighlight(ctx, canvasInfo, hoveredCell);
            }
        });

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [image, canvasInfo, spriteGrid, hoveredCell, drawGrid, drawCellHighlight]);

    const getCellFromMousePos = useCallback(
        (e) => {
            if (!canvasInfo) return null;
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            if (
                clickX > canvasInfo.scaledWidth ||
                clickY > canvasInfo.scaledHeight ||
                clickX < 0 ||
                clickY < 0
            ) {
                return null;
            }

            const col = Math.floor(clickX / canvasInfo.cellWidth);
            const row = Math.floor(clickY / canvasInfo.cellHeight);

            if (
                row >= spriteGrid.rows ||
                col >= spriteGrid.cols ||
                row < 0 ||
                col < 0
            ) {
                return null;
            }

            return { row, col };
        },
        [canvasInfo, spriteGrid]
    );

    const handleMouseMove = useCallback(
        (e) => {
            const cell = getCellFromMousePos(e);
            setHoveredCell(cell);
        },
        [getCellFromMousePos]
    );

    const handleMouseLeave = useCallback(() => {
        setHoveredCell(null);
    }, []);

    const handleRightClick = useCallback(
        async (e) => {
            e.preventDefault();
            const cell = getCellFromMousePos(e);
            if (!cell) return;

            const fullCanvas = document.createElement("canvas");
            fullCanvas.width = image.width;
            fullCanvas.height = image.height;
            const fullCtx = fullCanvas.getContext("2d");
            fullCtx.drawImage(image, 0, 0);

            const sprite = sliceSprite(
                fullCanvas,
                cell.row,
                cell.col,
                spriteGrid.rows,
                spriteGrid.cols,
                { cropTransparent: true }
            );

            const dataUrl = sprite.toDataURL();
            setPreviewCanvas(sprite);
            setPreviewDataUrl(dataUrl);
            setPendingCoords(cell);
        },
        [getCellFromMousePos, image, spriteGrid]
    );

    const handleLeftClick = useCallback(
        async (e) => {
            const cell = getCellFromMousePos(e);
            if (!cell) return;

            const fullCanvas = document.createElement("canvas");
            fullCanvas.width = image.width;
            fullCanvas.height = image.height;
            const fullCtx = fullCanvas.getContext("2d");
            fullCtx.drawImage(image, 0, 0);

            const sprite = sliceSprite(
                fullCanvas,
                cell.row,
                cell.col,
                spriteGrid.rows,
                spriteGrid.cols,
                { cropTransparent: true }
            );

            const blob = await canvasToBlob(sprite, "png", 0.92);
            const filename = `sprite_r${cell.row}_c${cell.col}.png`;
            downloadBlob(blob, filename);
        },
        [getCellFromMousePos, image, spriteGrid]
    );

    const startDrag = (e, type, index) => {
        e.preventDefault();
        setDrag({ type, index });
    };

    const dragMove = (e) => {
        if (!drag || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const pos =
            drag.type === "vertical" ? e.clientX - rect.left : e.clientY - rect.top;

        setDividers((prev) => {
            const updated = { ...prev };
            updated[drag.type][drag.index] = pos;
            return updated;
        });
    };

    const stopDrag = () => setDrag(null);

    useEffect(() => {
        window.addEventListener("mousemove", dragMove);
        window.addEventListener("mouseup", stopDrag);
        return () => {
            window.removeEventListener("mousemove", dragMove);
            window.removeEventListener("mouseup", stopDrag);
        };
    });

    return (
        <div style={{ position: "relative" }}>
            <canvas
                ref={(el) => {
                    canvasRef.current = el;
                    if (ref) ref.current = el;
                }}
                style={{ border: "1px solid #ccc", cursor: hoveredCell ? "pointer" : "crosshair" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleLeftClick}
                onContextMenu={handleRightClick}
            />
            {dividers.vertical.map((x, i) => (
                <div
                    key={`v-${i}`}
                    style={{
                        position: "absolute",
                        left: `${x}px`,
                        top: 0,
                        height: "100%",
                        width: "2px",
                        backgroundColor: "limegreen",
                        cursor: "ew-resize",
                        zIndex: 5,
                    }}
                    onMouseDown={(e) => startDrag(e, "vertical", i)}
                />
            ))}
            {dividers.horizontal.map((y, i) => (
                <div
                    key={`h-${i}`}
                    style={{
                        position: "absolute",
                        top: `${y}px`,
                        left: 0,
                        width: "100%",
                        height: "2px",
                        backgroundColor: "limegreen",
                        cursor: "ns-resize",
                        zIndex: 5,
                    }}
                    onMouseDown={(e) => startDrag(e, "horizontal", i)}
                />
            ))}
            {previewDataUrl && (
                <div className="modal is-active" onClick={() => setPreviewDataUrl(null)}>
                    <div className="modal-background" />
                    <div className="modal-content has-background-dark p-4" onClick={(e) => e.stopPropagation()}>
                        <p className="has-text-light has-text-centered mb-2">
                            Previewing sprite: Row {pendingCoords.row}, Col {pendingCoords.col}
                        </p>
                        <img src={previewDataUrl} alt="Sprite Preview" style={{ imageRendering: "pixelated", maxWidth: "100%" }} />
                    </div>
                    <button className="modal-close is-large" aria-label="close" />
                </div>
            )}
        </div>
    );
});

export default SpriteCanvas;
