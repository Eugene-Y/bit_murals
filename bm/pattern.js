// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// The helpers below also run inside the pattern workers.

// Pixels are visited in the order k * jump (mod total), with jump coprime
// to total: a full permutation that looks like noise, so the picture emerges
// evenly everywhere instead of line by line.
function patternPixelIndex(k, jump, total) { return (k * jump) % total }


function normalizePatternValue(v) {
    if (isNaN(v)) v = 0
    else if (v == null) v = 0
    else if (!isFinite(v))
        v = (v > 0) ?
            Number.MAX_VALUE
            : -Number.MAX_VALUE
    return v
}


// Values of the reveal steps start .. start + count - 1, in reveal order.
function calculatePatternChunk(formula, job, start, count) {
    const { w, h, z, x0, y0, jump, total } = job
    const values = new Float64Array(count)
    for (let j = 0; j < count; ++j) {
        const i = patternPixelIndex(start + j, jump, total)
        const x = i % w
        const y = (i - x) / w
        values[j] = normalizePatternValue(formula(x0 + x * z, y0 + y * z, w, h, z, x0, y0))
    }
    return values
}




class Pattern {
    constructor(w, h) {
        this._W = w
        this._H = h
        this._formula = null
        this._formulaSource = null
        this._doneCallback = null
        this._values = new Float64Array(w * h)
        this._bitmap = new PatternBitmap(w, h)
        this._process = {
            pointsCalculated : 0,
            pointsShown      : 0,
            numSteps         : 75, // TODO move to slideshow?
            jump             : 5,
            dropSaved        : true,
            gen              : 0,
            receivedChunks   : new Map()
        }
        this._workers = new PatternWorkers((start, values) => { this.receiveChunk(start, values) })
        this._redrawFade = 10 / 255
        this._framing = new Framing(0, 0, 1)
        this.l = new Logger("Pattern")
        this.l.setActive(false)
        this._colorFunction = null
        this.pickJump()
    }


    getPercentReady() { return 100.0 * this._process.pointsShown / this.totalPoints() }


    getBitmap() { return this._bitmap }


    getValueAt(x, y, f = null) {
        this.l.assert(x < this._W)
        this.l.assert(y < this._H)
        if (!f) f = this._formula
        const fr = this._framing
        const z = fr.zoom
        return normalizePatternValue(f(fr.x0 + x * z, fr.y0 + y * z, this._W, this._H, z, fr.x0, fr.y0))
    }


    done() { return this._process.pointsShown >= this.totalPoints() }


    setFormula(f, source) {
        this.l.logg("set formula")
        this._formula = f
        this._formulaSource = source
        this._process.dropSaved = true
        this.l.loge()
    }


    setColorFunction(f) { this._colorFunction = f }


    setDoneCallback(f) {
        this._doneCallback = f
        this.l.log("set callback", f)
    }


    getFraming() { return this._framing }

    getWidthAndHight() { return [this._W, this._H] }

    setFraming(f) {
        this.l.log("set framing:", f.x0, f.y0, f.zoom)
        this._framing.set(f)
        this._process.dropSaved = true
    }


    getZoom() { return this._framing.zoom }

    setZoom(z) {
        this.l.log("set zoom:", z)
        this.l.assert(z >= 0.0)
        this._framing.zoom = z
        this._process.dropSaved = true
    }

    shiftOXYby(dx, dy) {
        this.l.log("shift oXY by", dx, dy)
        let f = this._framing
        f.x0 -= dx
        f.y0 -= dy
        this.l.log("current oXY:", f.x0, f.y0)
        this._process.dropSaved = true
    }


    setOXY(ox, oy) {
        this.l.log("set oXY:", ox, oy)
        let f = this._framing
        f.x0 = ox
        f.y0 = oy
        this._process.dropSaved = true
    }


    pickJump(){
        let j = this._process.numSteps
        if (j % 2 === 0) ++j
        const total = this.totalPoints()
        while (this.gcd(total, j) > 1) j += 2
        this._process.jump = j
        this.l.log("jump =", j)
    }


    pixelIndex(k) { return patternPixelIndex(k, this._process.jump, this.totalPoints()) }


    gcd(x, y) {
        while(y) {
          let t = y
          y = x % y
          x = t
        }
        return x
    }


    totalPoints() { return this._W * this._H }


    setWidthAndHeight(w, h) {
        w = Math.floor(w)
        h = Math.floor(h)
        if (w === this._W && h === this._H)
            return 0
        this.l.log("set w & h:", w, h)
        this._W = w
        this._H = h
        this._values = new Float64Array(w * h)
        this._bitmap.resize(w, h)
        this.pickJump()
        this._process.dropSaved = true
        this.resetProcess()
        return 1
    }


    startRedraw(){
        this.l.log("redraw")
        this.resetProcess()
        this._bitmap.fadeToBackground(this._redrawFade)
    }


    // Without dropSaved the already calculated values are only recolored,
    // in the same order and at the same pace as they were revealed.
    resetProcess(){
        this.l.log("reset process")
        let p = this._process
        if (p.dropSaved) {
            p.pointsCalculated = 0
            p.dropSaved = false
            p.receivedChunks.clear()
            ++p.gen
            if (this.calculatesInWorkers())
                this._workers.startJob(this.makeJob(), this._formulaSource)
        }
        p.pointsShown = 0
    }


    calculatesInWorkers() { return this._workers.available() && this._formulaSource !== null }


    makeJob() {
        const f = this._framing
        return {
            gen   : this._process.gen,
            w     : this._W,
            h     : this._H,
            z     : f.zoom,
            x0    : f.x0,
            y0    : f.y0,
            jump  : this._process.jump,
            total : this.totalPoints()
        }
    }


    draw(silent = false){
        if (this.done())
            return

        const p = this._process
        const n = this.pointsInOneDraw()
        if (!this.calculatesInWorkers() && p.pointsShown >= p.pointsCalculated)
            this.calculatePoints(n)
        this.showPoints(Math.min(n, p.pointsCalculated - p.pointsShown))

        if (!silent && this.done()) {
            this.l.log("done")
            if (this._doneCallback)
                this._doneCallback()
            else
                this.l.log("no done callback")
        }
    }


    pointsInOneDraw() { return Math.ceil(this.totalPoints() / this._process.numSteps) }


    // Synchronous: for saving a picture right away, or when there are no workers.
    finishNow() {
        const p = this._process
        this.calculatePoints(this.totalPoints() - p.pointsCalculated)
        this._workers.stopJob()
        this.showPoints(this.totalPoints() - p.pointsShown)
    }


    calculatePoints(n) {
        const start = this._process.pointsCalculated
        n = Math.min(n, this.totalPoints() - start)
        this.receiveChunk(start, calculatePatternChunk(this._formula, this.makeJob(), start, n))
    }


    // Chunks from the workers can come out of order; pointsCalculated only
    // grows over the contiguous prefix of the reveal order.
    receiveChunk(start, values) {
        const p = this._process
        if (start < p.pointsCalculated)
            return
        for (let j = 0; j < values.length; ++j)
            this._values[this.pixelIndex(start + j)] = values[j]
        p.receivedChunks.set(start, values.length)
        while (p.receivedChunks.has(p.pointsCalculated)) {
            const k = p.pointsCalculated
            p.pointsCalculated += p.receivedChunks.get(k)
            p.receivedChunks.delete(k)
        }
    }


    showPoints(n) {
        const p = this._process
        const end = p.pointsShown + n
        const cf = this._colorFunction
        for (let k = p.pointsShown; k < end; ++k) {
            const i = this.pixelIndex(k)
            this._bitmap.setPixel(i, cf(this._values[i]))
        }
        p.pointsShown = end
    }


  }