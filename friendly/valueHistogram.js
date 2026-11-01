// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// How the pattern's values spread over the whole double range (symlog axis,
// zero in the middle), with the part the current drawing mode resolves marked.
class ValueHistogram {
    constructor() {
        this._scale = new SymLogScale()
        this._numBins = 400
        this._counts = new Float64Array(this._numBins)
        this._zeros = 0
        this._total = 0
        this._mark = null
        this._onPick = () => {}

        this._el = document.createElement("canvas")
        this._el.className = "histogram"
        this._el.addEventListener("click", (e) => { this._onPick(this.valueAt(e.clientX)) })
        this._el.addEventListener("pointermove", (e) => {
            this._el.dataset.tip = "value here: " + ScaleUtils.formatNumber(this.valueAt(e.clientX))
                                 + (this._clickTip ? "\n" + this._clickTip : "")
        })
    }


    element() { return this._el }

    onPick(cb, tip) {
        this._onPick = cb
        this._clickTip = tip
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
        this._counts.fill(0)
        this._zeros = 0
        for (let i = 0; i < values.length; ++i) {
            const v = values[i]
            if (v === 0) ++this._zeros
            else ++this._counts[this.binOf(v)]
        }
        this._total = values.length
        this.draw()
    }


    clear() {
        this._total = 0
        this.draw()
    }


    // [from, to] in values, or null
    setMark(range) {
        this._mark = range
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

        if (this._mark) {
            const x0 = ScaleUtils.toPosition(this._scale, this._mark[0]) * w
            const x1 = ScaleUtils.toPosition(this._scale, this._mark[1]) * w
            g.fillStyle = "rgba(230, 230, 230, 0.18)"
            g.fillRect(x0, 0, Math.max(1, x1 - x0), h)
            g.fillStyle = "rgb(220, 220, 220)"
            g.fillRect(x0, 0, 1, h)
            g.fillRect(Math.max(x0, x1 - 1), 0, 1, h)
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
