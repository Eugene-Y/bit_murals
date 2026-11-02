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
        this._staged = null
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
        this._staged = null
        this.l.loge()
    }


    // The formula is calculated aside while the pattern stays as it is, values
    // and all; commitStaged() then swaps it in, done, without painting it.
    // A redraw that has to recalculate takes the staged formula the usual way.
    stageFormula(f, source) {
        this._staged = {
            formula          : f,
            source           : source,
            values           : new Float64Array(this.totalPoints()),
            pointsCalculated : 0,
            receivedChunks   : new Map()
        }
        ++this._process.gen
        if (this.calculatesInWorkers())
            this._workers.startJob(this.makeJob(), source)
    }


    isStaging() { return this._staged !== null }

    stagedReady() { return this._staged !== null && this._staged.pointsCalculated >= this.totalPoints() }

    getStagedPercent() { return this._staged ? 100.0 * this._staged.pointsCalculated / this.totalPoints() : 0 }


    commitStaged() {
        const s = this._staged
        this._staged = null
        this._formula = s.formula
        this._formulaSource = s.source
        this._values = s.values
        const p = this._process
        p.pointsCalculated = p.pointsShown = this.totalPoints()
        p.receivedChunks.clear()
        p.dropSaved = false
    }


    adoptStagedFormula() {
        const s = this._staged
        this._staged = null
        this._formula = s.formula
        this._formulaSource = s.source
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
        if (p.dropSaved && this._staged)
            this.adoptStagedFormula()
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


    calculatesInWorkers() {
        const source = this._staged ? this._staged.source : this._formulaSource
        return this._workers.available() && source !== null
    }


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
        if (this._staged && !this.calculatesInWorkers())
            this.calculatePoints(this.pointsInOneDraw())
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


    // Repaints everything shown so far with the current color function, at once.
    recolor() {
        const cf = this._colorFunction
        if (this.done()) {
            for (let i = 0; i < this.totalPoints(); ++i)
                this._bitmap.setPixel(i, cf(this._values[i]))
            return
        }
        for (let k = 0; k < this._process.pointsShown; ++k) {
            const i = this.pixelIndex(k)
            this._bitmap.setPixel(i, cf(this._values[i]))
        }
    }


    // Indexed by pixel; only the first pointsShown in the reveal order are final.
    getValues() { return this._values }


    getPointsShown() { return this._process.pointsShown }


    // Values of the reveal steps from .. to - 1, in reveal order.
    getRevealedValues(from, to) {
        const out = new Float64Array(to - from)
        for (let k = from; k < to; ++k)
            out[k - from] = this._values[this.pixelIndex(k)]
        return out
    }


    pointsInOneDraw() { return Math.ceil(this.totalPoints() / this._process.numSteps) }


    // Synchronous: for saving a picture right away, or when there are no workers.
    finishNow() {
        if (this.done())
            return
        const p = this._process
        this.calculatePoints(this.totalPoints() - p.pointsCalculated)
        this._workers.stopJob()
        this.showPoints(this.totalPoints() - p.pointsShown)
    }


    calculatePoints(n) {
        const s = this._staged
        const start = (s || this._process).pointsCalculated
        n = Math.min(n, this.totalPoints() - start)
        const formula = s ? s.formula : this._formula
        this.receiveChunk(start, calculatePatternChunk(formula, this.makeJob(), start, n))
    }


    // Whatever is calculated while a formula is staged is the staged one's.
    receiveChunk(start, values) {
        if (this._staged)
            this.storeChunk(this._staged, this._staged.values, start, values)
        else
            this.storeChunk(this._process, this._values, start, values)
    }


    // Chunks from the workers can come out of order; pointsCalculated only
    // grows over the contiguous prefix of the reveal order.
    storeChunk(progress, into, start, values) {
        if (start < progress.pointsCalculated)
            return
        for (let j = 0; j < values.length; ++j)
            into[this.pixelIndex(start + j)] = values[j]
        progress.receivedChunks.set(start, values.length)
        while (progress.receivedChunks.has(progress.pointsCalculated)) {
            const k = progress.pointsCalculated
            progress.pointsCalculated += progress.receivedChunks.get(k)
            progress.receivedChunks.delete(k)
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