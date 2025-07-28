export function saveSpriteAsPNG(canvas, region) {
    const offscreen = document.createElement('canvas');
    offscreen.width = region.width;
    offscreen.height = region.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(canvas, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
    offscreen.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sprite.png';
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

export function saveAllSprites(canvas, regions) {
    regions.forEach((region, i) => {
        const offscreen = document.createElement('canvas');
        offscreen.width = region.width;
        offscreen.height = region.height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(canvas, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
        offscreen.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sprite_${i}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    });
}
