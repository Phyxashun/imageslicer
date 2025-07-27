/*
import React from 'react';
import { sliceSpritesFromCanvas, canvasToPNGBlob, downloadBlob } from '../utils/spriteSlicer';

export default function ControlsPanel({ canvasRef, spriteGrid, setSpriteGrid }) {

    const handleRowChange = ( e ) => {
        setSpriteGrid({ ...spriteGrid, rows: parseFloat(e.target.value) })
    }

    const handleColChange = ( e ) => {
        setSpriteGrid({ ...spriteGrid, cols: parseFloat(e.target.value) })
    }

    const handleSmartExport = async () => {
        const sprites = sliceSpritesFromCanvas(canvasRef.current);
        for (let i = 0; i < sprites.length; i++) {
            try {
                const blob = await canvasToPNGBlob(sprites[i]);
                downloadBlob(blob, `sprite_${i}.png`);
            } catch ( e ) {
                throw new Error('Failed to download sprite!' + e.message);
            }
        }
    };

    return (
        <div className="controls">
            <label htmlFor="rowInput">Rows:</label>
            <input
                id="rowInput"
                type="number"
                min="1"
                value={spriteGrid.rows}
                onChange={handleRowChange}
            />

            <label htmlFor="colInput">Columns:</label>
            <input
                id="colInput"
                type="number"
                min="1"
                value={spriteGrid.cols}
                onChange={handleColChange}
            />
            <button onClick={handleSmartExport} type="button">
                Save All Sprites
            </button>
        </div>
    );
}
*/

import React from "react";

const ControlsPanel = ({ onImageLoad, dividers, setDividers }) => {
    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.onload = () => onImageLoad(img);
            img.src = URL.createObjectURL(file);
        }
    };

    const addDivider = (type) => {
        const newPos = 100 + dividers[type].length * 50;
        setDividers(prev => ({
            ...prev,
            [type]: [...prev[type], newPos]
        }));
    };

    return (
        <div className="box">
            <div className="field">
                <label className="label">Upload Sprite Sheet</label>
                <div className="control">
                    <input className="input" type="file" onChange={handleUpload} />
                </div>
            </div>

            <div className="buttons">
                <button className="button is-link" onClick={() => addDivider("vertical")}>Add Vertical Slicer</button>
                <button className="button is-link" onClick={() => addDivider("horizontal")}>Add Horizontal Slicer</button>
            </div>
        </div>
    );
};

export default ControlsPanel;