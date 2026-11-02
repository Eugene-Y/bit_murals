// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// An animated GIF, looping forever. Each frame is stored as the rectangle
// around the pixels that changed since the last one, the unchanged ones
// transparent, with its own palette of at most 255 colors (one index is the
// transparency); a frame with more colors is quantized to fewer bits per
// channel. Frames are added as packed 0xAABBGGRR pixels, alpha ignored.
class GifEncoder {
    constructor(width, height) {
        this._w = width
        this._h = height
        this._bytes = []
        this._previous = null
        this._pending = null
        this.writeHeader()
    }


    addFrame(pixels, delayCs) {
        const rect = this.changedRect(pixels)
        if (!rect) {
            if (this._pending)
                this._pending.delayCs += delayCs
            return
        }
        this.flushPending()
        this._pending = this.encodeFrame(pixels, rect, delayCs)
        this._previous = pixels.slice()
    }


    // holdCs: how long the last frame stays before the loop starts over.
    finish(holdCs = 0) {
        if (this._pending)
            this._pending.delayCs += holdCs
        this.flushPending()
        this._bytes.push(0x3b)
        return Uint8Array.from(this._bytes)
    }


    writeHeader() {
        const b = this._bytes
        for (const c of "GIF89a")
            b.push(c.charCodeAt(0))
        this.pushWord(this._w)
        this.pushWord(this._h)
        b.push(0x00, 0x00, 0x00)                     // no global palette
        b.push(0x21, 0xff, 0x0b)
        for (const c of "NETSCAPE2.0")
            b.push(c.charCodeAt(0))
        b.push(0x03, 0x01, 0x00, 0x00, 0x00)         // loop forever
    }


    pushWord(v) { this._bytes.push(v & 0xff, (v >> 8) & 0xff) }


    changedRect(pixels) {
        const w = this._w
        const prev = this._previous
        if (!prev)
            return { x: 0, y: 0, w: w, h: this._h }
        let x0 = w, y0 = this._h, x1 = -1, y1 = -1
        for (let i = 0; i < pixels.length; ++i)
            if (pixels[i] !== prev[i]) {
                const x = i % w
                const y = (i - x) / w
                if (x < x0) x0 = x
                if (x > x1) x1 = x
                if (y < y0) y0 = y
                if (y > y1) y1 = y
            }
        if (x1 < 0)
            return null
        return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
    }


    encodeFrame(pixels, rect, delayCs) {
        const prev = this._previous
        const changed = (i) => !prev || pixels[i] !== prev[i]
        const quantize = this.pickQuantization(pixels, rect, changed)

        const colorIndex = new Map()
        const palette = []
        const indices = new Uint8Array(rect.w * rect.h)
        let transparent = false
        let k = 0
        for (let y = rect.y; y < rect.y + rect.h; ++y)
            for (let x = rect.x; x < rect.x + rect.w; ++x, ++k) {
                const i = y * this._w + x
                if (!changed(i)) {
                    transparent = true
                    continue
                }
                const c = quantize(pixels[i])
                let index = colorIndex.get(c)
                if (index === undefined) {
                    index = palette.length
                    colorIndex.set(c, index)
                    palette.push(c)
                }
                indices[k] = index
            }

        const transparentIndex = palette.length
        if (transparent)
            for (let y = rect.y, j = 0; y < rect.y + rect.h; ++y)
                for (let x = rect.x; x < rect.x + rect.w; ++x, ++j)
                    if (!changed(y * this._w + x))
                        indices[j] = transparentIndex

        const numColors = Math.max(2, palette.length + (transparent ? 1 : 0))
        const tableBits = Math.max(1, Math.ceil(Math.log2(numColors)))
        return { rect, palette, indices, tableBits, transparent, transparentIndex, delayCs }
    }


    // The finest uniform quantization that leaves room for the transparency.
    pickQuantization(pixels, rect, changed) {
        const depths = [[8, 8, 8], [7, 7, 7], [6, 6, 6], [5, 5, 5], [4, 4, 4], [3, 3, 3], [3, 3, 2], [2, 3, 2]]
        for (const [rb, gb, bb] of depths) {
            const q = GifEncoder.quantizer(rb, gb, bb)
            const seen = new Set()
            let fits = true
            for (let y = rect.y; y < rect.y + rect.h && fits; ++y)
                for (let x = rect.x; x < rect.x + rect.w; ++x) {
                    const i = y * this._w + x
                    if (!changed(i))
                        continue
                    seen.add(q(pixels[i]))
                    if (seen.size > 255) {
                        fits = false
                        break
                    }
                }
            if (fits)
                return q
        }
        return GifEncoder.quantizer(2, 3, 2)
    }


    // Keeps the top bits of each channel and puts the rest in the middle of
    // what they could have been.
    static quantizer(rBits, gBits, bBits) {
        const channel = (v, bits) => bits >= 8 ? v : ((v >> (8 - bits)) << (8 - bits)) | (1 << (7 - bits))
        return (c) => {
            const r = channel(c & 0xff, rBits)
            const g = channel((c >>> 8) & 0xff, gBits)
            const b = channel((c >>> 16) & 0xff, bBits)
            return (b << 16) | (g << 8) | r
        }
    }


    flushPending() {
        const f = this._pending
        if (!f)
            return
        this._pending = null
        const b = this._bytes

        b.push(0x21, 0xf9, 0x04)
        b.push((1 << 2) | (f.transparent ? 1 : 0))   // keep the frame under the next one
        this.pushWord(Math.max(2, Math.round(f.delayCs)))
        b.push(f.transparent ? f.transparentIndex : 0, 0x00)

        b.push(0x2c)
        this.pushWord(f.rect.x)
        this.pushWord(f.rect.y)
        this.pushWord(f.rect.w)
        this.pushWord(f.rect.h)
        b.push(0x80 | (f.tableBits - 1))
        for (let i = 0; i < (1 << f.tableBits); ++i) {
            const c = i < f.palette.length ? f.palette[i] : 0
            b.push(c & 0xff, (c >>> 8) & 0xff, (c >>> 16) & 0xff)
        }

        const minCodeSize = Math.max(2, f.tableBits)
        b.push(minCodeSize)
        const data = GifEncoder.lzw(f.indices, minCodeSize)
        for (let i = 0; i < data.length; i += 255) {
            const n = Math.min(255, data.length - i)
            b.push(n)
            for (let j = 0; j < n; ++j)
                b.push(data[i + j])
        }
        b.push(0x00)
    }


    // Variable-width LZW as GIF wants it. The code width grows one code late,
    // when the next free code no longer fits, which is when the decoder grows it.
    static lzw(indices, minCodeSize) {
        const maxCodes = 4096
        const clearCode = 1 << minCodeSize
        const endCode = clearCode + 1
        const out = []
        let accum = 0
        let accumBits = 0
        let codeSize = minCodeSize + 1
        let maxCode = (1 << codeSize) - 1
        let nextCode = endCode + 1
        let clearing = false
        const table = new Map()

        const emit = (code) => {
            accum |= code << accumBits
            accumBits += codeSize
            while (accumBits >= 8) {
                out.push(accum & 0xff)
                accum >>>= 8
                accumBits -= 8
            }
            if (clearing) {
                codeSize = minCodeSize + 1
                maxCode = (1 << codeSize) - 1
                clearing = false
            }
            else if (nextCode > maxCode && codeSize < 12) {
                ++codeSize
                maxCode = codeSize === 12 ? maxCodes : (1 << codeSize) - 1
            }
        }

        emit(clearCode)
        let prefix = indices[0]
        for (let i = 1; i < indices.length; ++i) {
            const k = indices[i]
            const key = prefix * 256 + k
            const code = table.get(key)
            if (code !== undefined) {
                prefix = code
                continue
            }
            emit(prefix)
            prefix = k
            if (nextCode < maxCodes)
                table.set(key, nextCode++)
            else {
                table.clear()
                nextCode = endCode + 1
                clearing = true
                emit(clearCode)
            }
        }
        emit(prefix)
        emit(endCode)
        if (accumBits > 0)
            out.push(accum & 0xff)
        return out
    }
}
