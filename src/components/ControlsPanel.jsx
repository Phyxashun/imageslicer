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
