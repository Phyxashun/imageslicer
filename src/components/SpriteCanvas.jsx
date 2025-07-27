// noinspection JSValidateTypes
import React, { useRef, useEffect, useState } from "react";

const SpriteCanvas = ({ image, dividers, setDividers }) => {
    const canvasRef = useRef(null);
    const [drag, setDrag] = useState(null);

    useEffect(() => {
        if (!image || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        canvasRef.current.width = image.width;
        canvasRef.current.height = image.height;
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
            <canvas ref={canvasRef} style={{ border: "1px solid #ccc" }} />
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
};

export default SpriteCanvas;