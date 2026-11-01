// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Runs over the histogram's non-empty bins from zero outward, negative and
// positive together, lighting up the pixels of each step in turn and leaving
// a fading trail. Zeros are left out: they'd usually flood the picture.
class ValueSweep {
    constructor(values, binOf, numBins, colorFunction, bitmap) {
        this._totalSeconds = 16      // unless there are few steps
        this._maxSecondsPerStep = 1  // few steps get slowed down only this much
        this._trailSteps = 6         // the trail fades to almost nothing over these
        this._trailLeft = 0.03       // what "almost nothing" is

        this._bitmap = bitmap
        this._colorFunction = colorFunction
        this._values = values
        this.groupPixelsBySteps(values, binOf, numBins)

        this._secondsPerStep = Math.min(this._totalSeconds / Math.max(1, this.numSteps()), this._maxSecondsPerStep)
        this._startMs = null
        this._lastMs = null
        this._litSteps = 0
    }


    numSteps() { return this._stepBins.length }


    // Step i covers the bins i away from zero on either side.
    groupPixelsBySteps(values, binOf, numBins) {
        const half = numBins / 2
        const distance = (b) => { return b >= half ? b - half : half - 1 - b }

        const pixelBins = new Int32Array(values.length)
        const binCounts = new Uint32Array(numBins)
        for (let i = 0; i < values.length; ++i) {
            const b = values[i] === 0 ? -1 : binOf(values[i])
            pixelBins[i] = b
            if (b >= 0) ++binCounts[b]
        }

        const stepOfDistance = new Int32Array(half).fill(-1)
        this._stepBins = []
        for (let dist = 0; dist < half; ++dist) {
            const bins = [half - 1 - dist, half + dist].filter((b) => binCounts[b] > 0)
            if (!bins.length)
                continue
            stepOfDistance[dist] = this._stepBins.length
            this._stepBins.push(bins)
        }

        const n = this.numSteps()
        this._stepStarts = new Uint32Array(n + 1)
        for (let b = 0; b < numBins; ++b)
            if (binCounts[b])
                this._stepStarts[stepOfDistance[distance(b)] + 1] += binCounts[b]
        for (let s = 0; s < n; ++s)
            this._stepStarts[s + 1] += this._stepStarts[s]

        const fill = this._stepStarts.slice(0, n)
        this._stepPixels = new Uint32Array(this._stepStarts[n])
        for (let i = 0; i < values.length; ++i)
            if (pixelBins[i] >= 0)
                this._stepPixels[fill[stepOfDistance[distance(pixelBins[i])]]++] = i
    }


    // With few steps a full-length trail would keep most of them lit at once.
    trailSeconds() {
        const steps = Math.min(this._trailSteps, Math.max(1, this.numSteps() / 2))
        return steps * this._secondsPerStep
    }


    // Advances to the time now; returns the bins of the leading step, or null
    // once the trail has faded after the last one.
    step(nowMs) {
        if (this._startMs === null)
            this._startMs = this._lastMs = nowMs
        const dt = (nowMs - this._lastMs) / 1000
        this._lastMs = nowMs
        if (dt > 0)
            this._bitmap.decayToBackground(Math.pow(this._trailLeft, dt / this.trailSeconds()))

        const elapsed = (nowMs - this._startMs) / 1000
        const n = this.numSteps()
        const due = Math.min(n, Math.floor(elapsed / this._secondsPerStep) + 1)
        for (; this._litSteps < due; ++this._litSteps)
            this.light(this._litSteps)

        if (elapsed > n * this._secondsPerStep + this.trailSeconds())
            return null
        return this._stepBins[Math.min(n, due) - 1] || []
    }


    light(s) {
        const cf = this._colorFunction
        const values = this._values
        for (let j = this._stepStarts[s]; j < this._stepStarts[s + 1]; ++j) {
            const i = this._stepPixels[j]
            this._bitmap.setPixel(i, cf(values[i]))
        }
    }
}
