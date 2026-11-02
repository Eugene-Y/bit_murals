// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Runs over the values from zero outward, negative and positive together,
// lighting up the pixels in turn and leaving a trail that fades out over the
// fade time; with an infinite one the picture builds up. Zeros are left out:
// they'd usually flood the picture. Over the old picture, as a transition from
// it, every pixel is painted, zeros last, and the old one doesn't fade: it is
// covered.
//
// The way is cut into steps much finer than the histogram's bins, so a narrow
// band is still passed through rather than flashed at once. Only non-empty
// steps count. Each one gets part of the time evenly and part by its number of
// pixels: by count alone a lone outlier would blink by unseen, evenly alone the
// sparse stretches between groups of values would leave the picture dark.
// Inside a step, pixels light up in the pattern's reveal order, like it emerged.
class ValueSweep {
    // look: { colorFunction, seconds, fadeSeconds, overOldPicture }
    constructor(values, revealOrder, numHistogramBins, bitmap, look) {
        this._seconds = look.seconds
        this._fadeSeconds = look.fadeSeconds
        this._overOldPicture = look.overOldPicture
        this._maxSecondsPerStep = 1.5 // before stretching to the whole time
        this._stepsPerHistogramBin = 64
        this._timeByPixels = 0.7      // the rest of the time is split evenly between steps
        this._clearSeconds = 1        // the picture from before the sweep fades out over this
        this._fadedLeft = 0.03        // the glow a pixel has left when it counts as faded
        this._settledGlow = 1 / 512   // below a gray level, so the pixel can stop changing

        this._axis = new SymLogScale()
        this._numHistogramBins = numHistogramBins
        this._bitmap = bitmap
        this._colorFunction = look.colorFunction
        // What the pattern looks like where it is all zero: dark in plain
        // mode, but bright in the negative, where the values are the dark ones.
        this._canvas = look.colorFunction(0)
        this._values = values
        this.groupPixelsBySteps(values, revealOrder)
        this.planTime()

        this._colors = bitmap.copyPixels()
        this._glow = new Float32Array(values.length).fill(1)
        this._lit = new Uint8Array(values.length)
        this._repaintLit = false
        this._repaintAll = false

        this._startMs = null
        this._lastMs = null
        this._currentStep = 0
        this._litPixels = 0
    }


    numSteps() { return this._stepDistances.length }


    // A step is a distance from zero on the symlog axis, on either side.
    // Zeros, when they are painted, get a distance past all the others.
    groupPixelsBySteps(values, revealOrder) {
        const half = this._numHistogramBins / 2
        const numValueDistances = half * this._stepsPerHistogramBin
        const zeroDistance = numValueDistances
        const numDistances = numValueDistances + 1
        const unitsPerDistance = this._axis.unitsRange()[1] / numValueDistances
        const total = values.length

        const pixelDistance = new Int32Array(total)
        const distanceCounts = new Uint32Array(numDistances)
        const negative = new Uint8Array(numDistances)
        const positive = new Uint8Array(numDistances)
        for (let i = 0; i < total; ++i) {
            const v = values[i]
            if (v === 0) {
                if (this._overOldPicture) {
                    pixelDistance[i] = zeroDistance
                    ++distanceCounts[zeroDistance]
                }
                else
                    pixelDistance[i] = -1
                continue
            }
            const dist = Math.min(numValueDistances - 1, Math.floor(Math.abs(this._axis.toUnits(v)) / unitsPerDistance))
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


    // The cap keeps a big area of one value from taking most of the time;
    // the stretch gives what it frees to the other steps.
    planTime() {
        const n = this.numSteps()
        const numPixels = this._stepPixels.length
        const stepSeconds = new Float64Array(n)
        let total = 0
        for (let s = 0; s < n; ++s) {
            const pixels = this._stepStarts[s + 1] - this._stepStarts[s]
            const share = (1 - this._timeByPixels) / n + this._timeByPixels * pixels / numPixels
            stepSeconds[s] = Math.min(this._maxSecondsPerStep, share * this._seconds)
            total += stepSeconds[s]
        }
        const stretch = total > 0 ? this._seconds / total : 0
        this._stepEnds = new Float64Array(n)
        let t = 0
        for (let s = 0; s < n; ++s) {
            t += stepSeconds[s] * stretch
            this._stepEnds[s] = t
        }
    }


    clearSeconds() { return this._overOldPicture ? Infinity : Math.min(this._clearSeconds, this._seconds / 4) }


    // After the last step, until everything that fades is down to the background.
    tailSeconds() {
        const fading = [this.clearSeconds(), this._fadeSeconds].filter(s => s < Infinity)
        const fadesToSettle = Math.log(this._settledGlow) / Math.log(this._fadedLeft)
        return fadesToSettle * Math.max(0, ...fading)
    }


    totalSeconds() { return this._seconds + this.tailSeconds() }


    // An infinite fade keeps it all: dt / Infinity is 0.
    glowLeftAfter(dt, fadeSeconds) {
        if (fadeSeconds > 0)
            return Math.pow(this._fadedLeft, dt / fadeSeconds)
        return dt > 0 ? 0 : 1
    }


    // Keeps the share of the way already passed.
    setSeconds(seconds, nowMs) {
        if (this._startMs !== null) {
            const progress = this._seconds > 0 ? (nowMs - this._startMs) / 1000 / this._seconds : 1
            this._startMs = nowMs - progress * seconds * 1000
        }
        this._seconds = seconds
        this.planTime()
        this._currentStep = 0
    }


    setFadeSeconds(fadeSeconds) { this._fadeSeconds = fadeSeconds }


    setColorFunction(colorFunction) {
        this._colorFunction = colorFunction
        for (let k = 0; k < this._litPixels; ++k) {
            const i = this._stepPixels[k]
            this._colors[i] = colorFunction(this._values[i])
        }
        this._repaintLit = true
        const canvas = colorFunction(0)
        if (canvas !== this._canvas) {
            this._canvas = canvas
            this._repaintAll = true
        }
    }


    // Advances to the time now; returns the histogram bins of the leading
    // step, or null once the trail has faded after the last one.
    step(nowMs) {
        if (this._startMs === null)
            this._startMs = this._lastMs = nowMs
        const dt = (nowMs - this._lastMs) / 1000
        this._lastMs = nowMs
        if (dt > 0 || this._repaintLit || this._repaintAll)
            this.fade(dt)

        const elapsed = (nowMs - this._startMs) / 1000
        const n = this.numSteps()
        while (this._currentStep < n - 1 && this._stepEnds[this._currentStep] <= elapsed)
            ++this._currentStep
        this.lightUpTo(this.pixelsDueAt(elapsed))

        if (elapsed > this._seconds + this.tailSeconds())
            return null
        return this._stepBins[this._currentStep]
    }


    // Lit pixels fade into the canvas over the fade time, the ones left from
    // before the sweep over the clear time. Settled pixels are only repainted
    // when the canvas itself changes.
    fade(dt) {
        const keepLit = this.glowLeftAfter(dt, this._fadeSeconds)
        const keepOld = this.glowLeftAfter(dt, this.clearSeconds())
        const repaintAll = this._repaintAll
        const repaintLit = this._repaintLit || repaintAll
        this._repaintLit = this._repaintAll = false
        if (keepLit === 1 && keepOld === 1 && !repaintLit)
            return
        const glow = this._glow
        const lit = this._lit
        const colors = this._colors
        const canvas = this._canvas
        for (let i = 0; i < glow.length; ++i) {
            let g = glow[i]
            if (g === 0 && !repaintAll)
                continue
            const keep = lit[i] ? keepLit : keepOld
            if (keep === 1 && !(lit[i] ? repaintLit : repaintAll))
                continue
            g *= keep
            if (g < this._settledGlow)
                g = 0
            glow[i] = g
            this._bitmap.setPixelBetween(i, canvas, colors[i], g)
        }
    }


    pixelsDueAt(elapsed) {
        const s = this._currentStep
        const begin = s ? this._stepEnds[s - 1] : 0
        const end = this._stepEnds[s]
        const part = end > begin ? Math.min(1, Math.max(0, (elapsed - begin) / (end - begin))) : 1
        const first = this._stepStarts[s]
        return first + Math.floor(part * (this._stepStarts[s + 1] - first))
    }


    lightUpTo(due) {
        const cf = this._colorFunction
        const values = this._values
        for (; this._litPixels < due; ++this._litPixels) {
            const i = this._stepPixels[this._litPixels]
            this._colors[i] = cf(values[i])
            this._glow[i] = 1
            this._lit[i] = 1
            this._bitmap.setPixel(i, this._colors[i])
        }
    }
}
