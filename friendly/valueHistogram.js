// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// How the pattern's values spread over the whole double range (symlog axis,
// zero in the middle), with the part the current drawing mode resolves marked.
//   click        - pick a value
//   drag         - pick a range, reported while dragging
//   double click - reset
class ValueHistogram {
    constructor() {
        this._scale = new SymLogScale()
        this._numBins = 400
        this._counts = new Float64Array(this._numBins)
        this._zeros = 0
        this._total = 0
        this._mark = null
        this._markCenter = null
        this._dragThresholdPx = 3
        this._onPickValue = () => {}
        this._onPickRange = () => {}
        this._onReset = () => {}
        this._usageTip = ""

        this._el = document.createElement("canvas")
        this._el.className = "histogram"
        this.listen()
    }


    element() { return this._el }

    onPickValue(cb) { this._onPickValue = cb }

    onPickRange(cb) { this._onPickRange = cb }

    onReset(cb) { this._onReset = cb }

    setUsageTip(text) { this._usageTip = text }


    listen() {
        const el = this._el
        let downX = null
        let dragging = false
        el.addEventListener("pointerdown", (e) => {
            el.setPointerCapture(e.pointerId)
            downX = e.clientX
            dragging = false
        })
        el.addEventListener("pointermove", (e) => {
            el.dataset.tip = "value here: " + ScaleUtils.formatNumber(this.valueAt(e.clientX))
                           + (this._usageTip ? "\n" + this._usageTip : "")
            if (downX === null || !el.hasPointerCapture(e.pointerId))
                return
            dragging = dragging || Math.abs(e.clientX - downX) > this._dragThresholdPx
            if (dragging) {
                const a = this.valueAt(downX)
                const b = this.valueAt(e.clientX)
                this._onPickRange(Math.min(a, b), Math.max(a, b))
            }
        })
        el.addEventListener("pointerup", (e) => {
            if (downX !== null && !dragging)
                this._onPickValue(this.valueAt(e.clientX))
            downX = null
            el.releasePointerCapture(e.pointerId)
        })
        el.addEventListener("dblclick", () => { this._onReset() })
    }


    valueAt(clientX) {
        const r = this._el.getBoundingClientRect()
        return ScaleUtils.fromPosition(this._scale, (clientX - r.left) / r.width)
    }


    binOf(v) {
        const t = ScaleUtils.toPosition(this._scale, v)
        return Math.min(this._numBins - 1, Math.max(0, Math.floor(t * this._numBins)))
    }


    setValues(values) {
        this.startCounting()
        this.countValues(values)
        this.draw()
    }


    // For values that come in parts: countValues doesn't redraw, draw() when needed.
    startCounting() {
        this._counts.fill(0)
        this._zeros = 0
        this._total = 0
    }


    countValues(values) {
        for (let i = 0; i < values.length; ++i) {
            const v = values[i]
            if (v === 0) ++this._zeros
            else ++this._counts[this.binOf(v)]
        }
        this._total += values.length
    }


    clear() {
        this._total = 0
        this.draw()
    }


    // range: [from, to] in values, or null; center: a value or null
    setMark(range, center = null) {
        this._mark = range
        this._markCenter = center
        this.draw()
    }


    draw() {
        const c = this._el
        const dpr = window.devicePixelRatio || 1
        const w = Math.max(1, Math.round(c.clientWidth * dpr))
        const h = Math.max(1, Math.round(c.clientHeight * dpr))
        if (c.width !== w || c.height !== h) {
            c.width = w
            c.height = h
        }
        const g = c.getContext("2d")
        g.fillStyle = "rgb(52, 52, 52)"
        g.fillRect(0, 0, w, h)

        const xOf = (v) => { return ScaleUtils.toPosition(this._scale, v) * w }
        if (this._mark) {
            const x0 = xOf(this._mark[0])
            const x1 = xOf(this._mark[1])
            g.fillStyle = "rgba(230, 230, 230, 0.18)"
            g.fillRect(x0, 0, Math.max(1, x1 - x0), h)
        }

        if (this._total) {
            const maxLog = Math.log1p(Math.max(this._zeros, ...this._counts))
            const barW = w / this._numBins
            g.fillStyle = "rgb(140, 140, 140)"
            this._counts.forEach((n, i) => {
                if (!n) return
                const bh = Math.max(1, h * Math.log1p(n) / maxLog)
                g.fillRect(i * barW, h - bh, Math.max(1, barW), bh)
            })
            if (this._zeros) {
                g.fillStyle = "rgb(200, 200, 200)"
                const bh = Math.max(1, h * Math.log1p(this._zeros) / maxLog)
                g.fillRect(w / 2 - dpr, h - bh, 2 * dpr, bh)
            }
        }

        // over the bars, or a tall bar hides them
        if (this._mark) {
            const x0 = xOf(this._mark[0])
            const x1 = xOf(this._mark[1])
            g.fillStyle = "rgb(220, 220, 220)"
            g.fillRect(x0, 0, dpr, h)
            g.fillRect(Math.max(x0, x1 - dpr), 0, dpr, h)
        }
        if (this._markCenter !== null) {
            const xc = xOf(this._markCenter)
            g.fillStyle = "rgb(40, 40, 40)"
            g.fillRect(xc - 2 * dpr, 0, 4 * dpr, h)
            g.fillStyle = "rgb(255, 255, 255)"
            for (let y = 0; y < h; y += 4 * dpr)
                g.fillRect(xc - dpr, y, 2 * dpr, 2 * dpr)
        }

        g.fillStyle = "rgb(120, 120, 120)"
        g.font = `${10 * dpr}px ui-monospace, Menlo, monospace`
        g.textBaseline = "top"
        const at = (v) => { return ScaleUtils.toPosition(this._scale, v) }
        const labels = [[0.005, "−1e308"], [at(-1), "−1"], [0.5, "0"], [at(1), "1"], [0.995, "1e308"]]
        labels.forEach(([t, s]) => {
            g.textAlign = t < 0.1 ? "left" : (t > 0.9 ? "right" : "center")
            g.fillText(s, t * w, 2 * dpr)
        })
    }
}
