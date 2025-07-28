import React from "react";

const ControlsPanel = ({ onImageLoad, spriteGrid, setSpriteGrid, dividers, setDividers }) => {
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

    const updateGrid = (e, type) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            setSpriteGrid(prev => ({ ...prev, [type]: value }));
        }
    };

    return (
        <div className="box">
            <div className="field">
                <label className="label">Upload Sprite Sheet</label>
                <div className="control">
                    <input className="input" type="file" onChange={handleUpload} />
                </div>
            </div>

            <div className="field is-horizontal">
                <div className="field-body">
                    <div className="field">
                        <label className="label">Rows</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                value={spriteGrid.rows}
                                onChange={(e) => updateGrid(e, "rows")}
                            />
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">Columns</label>
                        <div className="control">
                            <input
                                className="input"
                                type="number"
                                value={spriteGrid.cols}
                                onChange={(e) => updateGrid(e, "cols")}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="buttons mt-3">
                <button className="button is-link" onClick={() => addDivider("vertical")}>Add Vertical Divider</button>
                <button className="button is-link" onClick={() => addDivider("horizontal")}>Add Horizontal Divider</button>
            </div>
        </div>
    );
};

export default ControlsPanel;