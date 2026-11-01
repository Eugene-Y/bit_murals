// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Runs over the values from zero outward, negative and positive together,
// lighting up the pixels in turn and leaving a fading trail. Zeros are left
// out: they'd usually flood the picture.
//
// The way is cut into steps much finer than the histogram's bins, so a narrow
// band is still passed through rather than flashed at once. Only non-empty
// steps count. Each one gets part of the time evenly and part by its number of
// pixels: by count alone a lone outlier would blink by unseen, evenly alone the
// sparse stretches between groups of values would leave the picture dark.
// Inside a step, pixels light up in the pattern's reveal order, like it emerged.
class ValueSweep {
    constructor(values, revealOrder, numHistogramBins, colorFunction, bitmap) {
        this._minSeconds = 2
        this._maxSeconds = 16
        this._maxSecondsPerStep = 1.5 // a big area of one value fills in no slower
        this._stepsPerHistogramBin = 64
        this._timeByPixels = 0.7      // the rest of the time is split evenly between steps
        this._trailSeconds = 1        // the trail fades to almost nothing over this
        this._trailLeft = 0.03        // what "almost nothing" is

        this._axis = new SymLogScale()
        this._numHistogramBins = numHistogramBins
        this._bitmap = bitmap
        this._colorFunction = colorFunction
        this._values = values
        this.groupPixelsBySteps(values, revealOrder)
        this.planTime()

        this._startMs = null
        this._lastMs = null
        this._currentStep = 0
        this._litPixels = 0
    }


    numSteps() { return this._stepDistances.length }


    // A step is a distance from zero on the symlog axis, on either side.
    groupPixelsBySteps(values, revealOrder) {
        const half = this._numHistogramBins / 2
        const numDistances = half * this._stepsPerHistogramBin
        const unitsPerDistance = this._axis.unitsRange()[1] / numDistances
        const total = values.length

        const pixelDistance = new Int32Array(total)
        const distanceCounts = new Uint32Array(numDistances)
        const negative = new Uint8Array(numDistances)
        const positive = new Uint8Array(numDistances)
        for (let i = 0; i < total; ++i) {
            const v = values[i]
            if (v === 0) {
                pixelDistance[i] = -1
                continue
            }
            const dist = Math.min(numDistances - 1, Math.floor(Math.abs(this._axis.toUnits(v)) / unitsPerDistance))
            pixelDistance[i] = dist
            ++distanceCounts[dist]
            if (v < 0) negative[dist] = 1
            else positive[dist] = 1
        }

        const stepOfDistance = new Int32Array(numDistances).fill(-1)
        this._stepDistances = []
        this._stepBins = []
        for (let dist = 0; dist < numDistances; ++dist) {
            if (!distanceCounts[dist])
                continue
            stepOfDistance[dist] = this._stepDistances.length
            this._stepDistances.push(dist)
            const binDistance = Math.floor(dist / this._stepsPerHistogramBin)
            const bins = []
            if (negative[dist]) bins.push(half - 1 - binDistance)
            if (positive[dist]) bins.push(half + binDistance)
            this._stepBins.push(bins)
        }

        const n = this.numSteps()
        this._stepStarts = new Uint32Array(n + 1)
        for (let s = 0; s < n; ++s)
            this._stepStarts[s + 1] = this._stepStarts[s] + distanceCounts[this._stepDistances[s]]

        const fill = this._stepStarts.slice(0, n)
        this._stepPixels = new Uint32Array(this._stepStarts[n])
        for (let k = 0; k < total; ++k) {
            const i = revealOrder(k)
            if (pixelDistance[i] >= 0)
                this._stepPixels[fill[stepOfDistance[pixelDistance[i]]]++] = i
        }
    }


    // Capping steps makes the sweep shorter than the max, but not than the min.
    planTime() {
        const n = this.numSteps()
        const numPixels = this._stepPixels.length
        const stepSeconds = new Float64Array(n)
        let total = 0
        for (let s = 0; s < n; ++s) {
            const pixels = this._stepStarts[s + 1] - this._stepStarts[s]
            const share = (1 - this._timeByPixels) / n + this._timeByPixels * pixels / numPixels
            stepSeconds[s] = Math.min(this._maxSecondsPerStep, share * this._maxSeconds)
            total += stepSeconds[s]
        }
        const stretch = Math.max(1, this._minSeconds / total)
        this._seconds = total * stretch
        this._stepEnds = new Float64Array(n)
        let t = 0
        for (let s = 0; s < n; ++s) {
            t += stepSeconds[s] * stretch
            this._stepEnds[s] = t
        }
    }


    trailSeconds() { return Math.min(this._trailSeconds, this._seconds / 4) }


    // Advances to the time now; returns the histogram bins of the leading
    // step, or null once the trail has faded after the last one.
    step(nowMs) {
        if (this._startMs === null)
            this._startMs = this._lastMs = nowMs
        const dt = (nowMs - this._lastMs) / 1000
        this._lastMs = nowMs
        if (dt > 0)
            this._bitmap.decayToBackground(Math.pow(this._trailLeft, dt / this.trailSeconds()))

        const elapsed = (nowMs - this._startMs) / 1000
        const n = this.numSteps()
        while (this._currentStep < n - 1 && this._stepEnds[this._currentStep] <= elapsed)
            ++this._currentStep
        this.lightUpTo(this.pixelsDueAt(elapsed))

        if (elapsed > this._seconds + this.trailSeconds())
            return null
        return this._stepBins[this._currentStep]
    }


    pixelsDueAt(elapsed) {
        const s = this._currentStep
        const begin = s ? this._stepEnds[s - 1] : 0
        const end = this._stepEnds[s]
        const part = Math.min(1, Math.max(0, (elapsed - begin) / (end - begin)))
        const first = this._stepStarts[s]
        return first + Math.floor(part * (this._stepStarts[s + 1] - first))
    }


    lightUpTo(due) {
        const cf = this._colorFunction
        const values = this._values
        for (; this._litPixels < due; ++this._litPixels) {
            const i = this._stepPixels[this._litPixels]
            this._bitmap.setPixel(i, cf(values[i]))
        }
    }
}
