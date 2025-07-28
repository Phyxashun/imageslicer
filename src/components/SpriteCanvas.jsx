// noinspection JSValidateTypes
import React, { useRef, forwardRef, useEffect, useState } from "react";
import { sliceSprite, canvasToPNGBlob, downloadBlob } from '../utils/spriteSlicer';

const SpriteCanvas = forwardRef(({ image, dividers, setDividers }, ref) => {
    const canvasRef = useRef(null);
    const [drag, setDrag] = useState(null);
    const [previewCanvas, setPreviewCanvas] = useState(null);
    const [previewDataUrl, setPreviewDataUrl] = useState(null);
    const [pendingCoords, setPendingCoords] = useState(null);

    useEffect(() => {
        if (!image || !canvasRef.current) return;
        const canvas = canvasRef.current;

        const ctx = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.clearRect(0, 0, image.width, image.height);
        ctx.drawImage(image, 0, 0);
    }, [image]);

    const startDrag = (e, type, index) => {
        e.preventDefault();
        setDrag({ type, index });
    };

    const handleMouseMove = (e) => {
        if (!drag || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const pos = drag.type === "vertical" ? e.clientX - rect.left : e.clientY - rect.top;

        setDividers(prev => {
            const updated = { ...prev };
            updated[drag.type][drag.index] = pos;
            return updated;
        });
    };

    const stopDrag = () => setDrag(null);

    const handleRightClick = async (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const scale = Math.min(640 / image.width, 480 / image.height);
        const scaledW = image.width * scale;
        const scaledH = image.height * scale;

        if (clickX > scaledW || clickY > scaledH) return;

        const col = Math.floor(clickX / (scaledW / spriteGrid.cols));
        const row = Math.floor(clickY / (scaledH / spriteGrid.rows));

        const sprite = sliceSprite(canvas, row, col, spriteGrid.rows, spriteGrid.cols);
        const dataUrl = sprite.toDataURL();

        setPreviewCanvas(sprite);
        setPreviewDataUrl(dataUrl);
        setPendingCoords({ row, col });
    };

    const handleConfirmSave = async () => {
        const blob = await canvasToPNGBlob(previewCanvas);
        downloadBlob(blob, `sprite_r${pendingCoords.row}_c${pendingCoords.col}.png`);
        setPreviewCanvas(null);
        setPreviewDataUrl(null);
        setPendingCoords(null);
    };

    const handleCancel = () => {
        setPreviewCanvas(null);
        setPreviewDataUrl(null);
        setPendingCoords(null);
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", stopDrag);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
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
                style={{
                    border: "1px solid #ccc",
                    cursor: 'crosshair'
                }}
            />
            {previewDataUrl && (
                <div style={modalStyles.overlay}>
                    <div style={modalStyles.modal}>
                        <h3>Preview Sprite</h3>
                        <img src={previewDataUrl} alt="Sprite preview" style={{ border: '1px solid #888' }} />
                        <div style={{ marginTop: '1rem' }}>
                            <button onClick={handleConfirmSave}>Save</button>
                            <button onClick={handleCancel} style={{ marginLeft: '0.5rem' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {dividers.vertical.map((x, i) => (
                <div key={`v-${i}`} style={{
                    position: "absolute",
                    left: `${x}px`,
                    top: 0,
                    height: "100%",
                    width: "2px",
                    backgroundColor: "limegreen",
                    cursor: "ew-resize",
                    zIndex: 5
                }} onMouseDown={(e) => startDrag(e, "vertical", i)} />
            ))}
            {dividers.horizontal.map((y, i) => (
                <div key={`h-${i}`} style={{
                    position: "absolute",
                    top: `${y}px`,
                    left: 0,
                    width: "100%",
                    height: "2px",
                    backgroundColor: "limegreen",
                    cursor: "ns-resize",
                    zIndex: 5
                }} onMouseDown={(e) => startDrag(e, "horizontal", i)} />
            ))}
        </div>
    );
});

export default SpriteCanvas;

const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        background: '#1e1e1e',
        padding: '1rem',
        borderRadius: '6px',
        color: '#eee',
        boxShadow: '0 0 20px #000',
        textAlign: 'center',
    },
};