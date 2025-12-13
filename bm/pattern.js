// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Pattern {
    constructor(w, h) {
        this._W = w
        this._H = h
        this._formula = null
        this._doneCallback = null
        this._process = {
            pos               : 0,
            pointsCalculated  : 0,
            numSteps          : 75, // TODO move to slideshow?
            jump              : 5,
            speedCoeff        : 1.0,
            step              : 0,
            savedCalculations : [],
            dropSaved         : true
        }
        this._framing = new Framing(0, 0, 1)
        this.l = new Logger("Pattern")
        this.l.setActive(false)
        this._colorFunction = null
        this.pickJump()
    }


    getPercentReady() { return 100.0 * this._process.pointsCalculated / this.totalPoints() }


    getValueAt(x, y, f = null) {
        this.l.assert(x < this._W)
        this.l.assert(y < this._H)
        const i = x + y * this._W
        this.l.assert(i >= 0 && i < this.totalPoints())
        const dontStop = function() { return false }
        if (!f) f = this._formula
        return this.calculateNPoints(f, 1, i, 0, dontStop)[0].v
    }


    done() {
        let p = this._process
        return p.step >= p.savedCalculations.length && p.pointsCalculated >= this.totalPoints()
     }


    setFormula(f) {
        this.l.logg("set formula")
        this._formula = f
        this._process.dropSaved = true
        this.l.loge()
    }


    setColorFunction(f) { this._colorFunction = f }


    adjustNumPointsPerDraw(t0, t1) {
        return
        //this.l.log("adjusting num points per draw")
        const minFPS = 40
        const desiredMs = 1000 / minFPS
        const elapsedMs = t1 - t0

        const oldppd = this.pointsInOneDraw()
        const c = elapsedMs / minFPS
        if (c <= 1)
            return

        this._process.speedCoeff /= c
        const newppd = this.pointsInOneDraw()
        const sc = newppd / oldppd

        //if (sc > 1)
        //    this.l.log("speed up by", sc.toFixed(2), ". points per draw:", newppd)
        //else if (sc < 1)
        //    this.l.log("slow down by", (1/sc).toFixed(2), ". points per draw:", newppd)
    }


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
        this.pickJump()
        this._process.dropSaved = true
        return 1
    }


    startRedraw(){
        this.l.log("redraw")
        this.resetProcess()
    }


    resetProcess(){
        this.l.log("reset process")
        let p = this._process
        if (p.dropSaved) {
            p.pos = 0
            p.pointsCalculated = 0
            p.speedCoeff = 1.0
            p.savedCalculations = []
            p.dropSaved = false
            //this.l.log("dropped calculated")
        }
        p.step = 0
    }


    draw(canvas, callCallbackOnDone = false){
        if (this.done())
            return

        canvas.push()
        const t0 = performance.now()
        const calculated = this.updateProcess(callCallbackOnDone)
        this.drawCalculatedVals(canvas, calculated)
        const t1 = performance.now()
        if (this.calculatedNewVals())
            this.adjustNumPointsPerDraw(t0, t1)
        canvas.pop()
    }


    pointsInOneDraw() {
        const n = this.totalPoints() / this._process.numSteps
        let ppd = n * this._process.speedCoeff
        ppd = Math.max(5, ppd)
        ppd = Math.min(n, ppd)
        ppd = Math.ceil(ppd)
        return ppd
    }


    drawCalculatedVals(canvas, vals) {
        this.l.assert(vals.length)
        canvas.strokeWeight(1)
        vals.forEach(p => {
            canvas.stroke(this._colorFunction(p.v, canvas))
            canvas.point(p.x, p.y)
            })
    }


    updateProcess(silent){
        const calculated = this.getCalculatedVals()
        if (!silent && this.done()) {
            this.l.log("done")
            if (this._doneCallback)
                this._doneCallback()
            else
                this.l.log("no done callback")
        }
        return calculated
    }


    calculatedNewVals() {
        return this._process.step >= this._process.savedCalculations.length
    }


    getCalculatedVals() {
        let p = this._process
        let calculated = []
        if (p.step < p.savedCalculations.length) {
            calculated = p.savedCalculations[p.step]
            ++p.step
        }
        else {
            const stopWhenDone = () => { return this.done() }
            calculated = this.calculateNPoints(this._formula,
                                               this.pointsInOneDraw(),
                                               p.pos, p.jump, stopWhenDone)
            p.pos += calculated.length * p.jump
            p.pointsCalculated += calculated.length
            p.savedCalculations[p.step] = calculated
            ++p.step
            }
        return calculated
    }


    calculateNPoints(formula, numPoints, startPos, jump, stopCondition) {
        const w = this._W
        const h = this._H
        const z = this._framing.zoom
	    const x0 = this._framing.x0
        const y0 = this._framing.y0

        let calculated = new Array(numPoints).fill(0)
        let i = 0
        for (i; i < numPoints && !stopCondition(); ++i) {
            const x = startPos % w
            const y = (Math.floor(startPos / w)) % h
            let v = formula(x0 + x * z, y0 + y * z, w, h, z, x0, y0)
            v = this.normalFix(v)
            calculated[i] = { v: v, x: x, y: y}
            startPos += jump
        }
        //this.l.log("calculated", i, "vals")
        return calculated
    }


    normalFix(v) {
        if (isNaN(v)) v = 0
        else if (v == null) v = 0
        else if (!isFinite(v))
            v = (v > 0) ?
                Number.MAX_VALUE
                : -Number.MAX_VALUE
        return v
    }


  }

