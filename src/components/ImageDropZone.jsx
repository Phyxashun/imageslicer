import React from 'react';

export default function ImageDropZone({ onImageLoad }) {
    const handleDrop = async (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('image')) {
            const img = await createImageBitmap(file);
            onImageLoad(img);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image')) {
            const img = await createImageBitmap(file);
            onImageLoad(img);
        }
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                border: '2px dashed #888',
                padding: 20,
                textAlign: 'center',
                marginBottom: 20,
                background: '#222'
            }}
        >
            <p>Drag & drop a spritesheet image here or</p>
            <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
    );
}
