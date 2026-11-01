// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Colors are packed as 0xAABBGGRR: an ImageData buffer viewed as Uint32Array
// on a little-endian machine, which is every machine a browser runs on.
const ColorPacking = {

    rgba: (r, g, b, a = 255) => {
        return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
    },

    gray: (v) => { return ColorPacking.rgba(v, v, v) },

    clamp01: (v) => { return v > 0 ? (v < 1 ? v : 1) : 0 },

    // Same math as p5's _hsbaToRGBA with colorMode(HSB, 255), so the colors
    // stay identical to the ones p5's stroke() used to produce.
    hsb: (h, s, b) => {
        // p5 turned a NaN component into an invalid color string, the canvas
        // ignored it and the point kept the default white fill.
        if (Number.isNaN(h + s + b))
            return ColorPacking.gray(255)
        const sat = ColorPacking.clamp01(s / 255)
        const val = ColorPacking.clamp01(b / 255)
        if (sat === 0)
            return ColorPacking.gray(Math.round(val * 255))

        const hue = 6 * ColorPacking.clamp01(h / 255)
        const sector = Math.floor(hue)
        const tint1 = val * (1 - sat)
        const tint2 = val * (1 - sat * (hue - sector))
        const tint3 = val * (1 - sat * (1 + sector - hue))
        let r, g, bl
        switch (sector) {
            case 1:  r = tint2; g = val;   bl = tint1; break
            case 2:  r = tint1; g = val;   bl = tint3; break
            case 3:  r = tint1; g = tint2; bl = val;   break
            case 4:  r = tint3; g = tint1; bl = val;   break
            case 5:  r = val;   g = tint1; bl = tint2; break
            default: r = val;   g = tint3; bl = tint1; break
        }
        return ColorPacking.rgba(Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255))
    }
}




class PatternBitmap {
    constructor(w, h) {
        this._background = 40
        this._canvas = document.createElement("canvas")
        this.resize(w, h)
    }


    resize(w, h) {
        this._canvas.width  = Math.max(1, w)
        this._canvas.height = Math.max(1, h)
        this._ctx = this._canvas.getContext("2d")
        this._image = this._ctx.createImageData(this._canvas.width, this._canvas.height)
        this._pixels = new Uint32Array(this._image.data.buffer)
        this._pixels.fill(ColorPacking.gray(this._background))
        this._dirty = true
    }


    width()  { return this._canvas.width }

    height() { return this._canvas.height }

    setPixel(i, packedColor) {
        this._pixels[i] = packedColor
        this._dirty = true
    }


    fadeToBackground(amount) {
        const px = this._pixels
        const bg = this._background * amount
        const keep = 1 - amount
        const fade = (c) => { return Math.round(c * keep + bg) }
        for (let i = 0; i < px.length; ++i) {
            const c = px[i]
            px[i] = ColorPacking.rgba(fade(c & 0xff), fade((c >>> 8) & 0xff), fade((c >>> 16) & 0xff))
        }
        this._dirty = true
    }


    // keep: the share of each pixel's distance to the background left after
    // one call. Unlike fadeToBackground, the distance always shrinks, so every
    // pixel gets to the background in the end.
    decayToBackground(keep) {
        const px = this._pixels
        const bg = this._background
        const k = Math.max(0, Math.min(255, Math.floor(keep * 256)))
        const decay = (c) => {
            const d = c - bg
            return bg + (d >= 0 ? (d * k) >> 8 : -((-d * k) >> 8))
        }
        for (let i = 0; i < px.length; ++i) {
            const c = px[i]
            px[i] = ColorPacking.rgba(decay(c & 0xff), decay((c >>> 8) & 0xff), decay((c >>> 16) & 0xff))
        }
        this._dirty = true
    }


    // Smoothing off: on HiDPI screens the bitmap is upscaled and must stay crisp.
    drawTo(ctx, x, y) {
        if (this._dirty) {
            this._ctx.putImageData(this._image, 0, 0)
            this._dirty = false
        }
        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(this._canvas, x, y, this.width(), this.height())
        ctx.restore()
    }
}
