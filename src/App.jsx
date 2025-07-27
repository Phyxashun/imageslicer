/*
import React, { useState, useRef } from 'react';
import ImageDropZone from './components/ImageDropZone';
import SpriteCanvas from './components/SpriteCanvas';
import ControlsPanel from './components/ControlsPanel';
import { autoDetectGrid } from './utils/spriteScanner';
import full_logo from '/full_logo.png';

export default function App() {
    const [imageBitmap, setImageBitmap] = useState(null);
    const [spriteGrid, setSpriteGrid] = useState({ rows: 1, cols: 1 });
    const canvasRef = useRef(null);

    const handleImageLoad = async (bitmap) => {
        setImageBitmap(bitmap);
        const auto = await autoDetectGrid(bitmap);
        setSpriteGrid(auto);
    };

    return (
        <div className="app-container">
            <img className="full-logo" src={full_logo} alt="logo" />
            <ImageDropZone onImageLoad={handleImageLoad} />
            {imageBitmap && (
                <>
                    <SpriteCanvas
                        ref={canvasRef}
                        imageBitmap={imageBitmap}
                        spriteGrid={spriteGrid}
                        setSpriteGrid={setSpriteGrid}
                        showGrid={false}
                        gridColor="lime"
                        maxWidth={imageBitmap.width}
                        maxHeight={imageBitmap.height}
                        enablePreview={true}
                        exportFormat="PNG"
                        exportQuality={100}

                    />
                    <ControlsPanel
                        canvasRef={canvasRef}
                        spriteGrid={spriteGrid}
                        setSpriteGrid={setSpriteGrid}
                    />
                </>
            )}
        </div>
    );
}
*/

import React, { useState } from "react";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import ControlsPanel from "./components/ControlsPanel";
import SpriteCanvas from "./components/SpriteCanvas";

const AppContent = () => {
    const [image, setImage] = useState(null);
    const [dividers, setDividers] = useState({ vertical: [], horizontal: [] });
    const { toggleTheme, theme } = useTheme();

    return (
        <div className="container mt-5">
            <div className="buttons is-right">
                <button className="button is-small is-dark" onClick={toggleTheme}>
                    Toggle Theme
                </button>
            </div>
            <div className="columns">
                <div className="column is-one-third">
                    <ControlsPanel
                        onImageLoad={setImage}
                        dividers={dividers}
                        setDividers={setDividers}
                    />
                </div>
                <div className="column">
                    <SpriteCanvas image={image} dividers={dividers} setDividers={setDividers} />
                </div>
            </div>
        </div>
    );
};

const App = () => (
    <ThemeProvider>
        <AppContent />
    </ThemeProvider>
);

export default App;