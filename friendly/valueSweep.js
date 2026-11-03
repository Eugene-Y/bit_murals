// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Runs over the values from zero outward, negative and positive together,
// lighting up the pixels in turn and leaving a trail that fades out over the
// fade time; with an infinite one the picture builds up. Zeros come last.
// The canvas follows the finished picture. A trail runs over the picture's
// own background, the color most of it has, and the pixels of that color
// flash in their colors of the other negative, else the wave would pass them
// unseen; where those are too close to it, in the contrasting gray. A
// build-up starts from the gray contrasting with the nonzero pixels, like a
// transition from a contrasting slide, and the pixels already in that gray are
// left out. The texture is in the nonzero values, the zeros are one step: in a
// picture of the two grays, a canvas set against the zeros would swallow it
// all. Over the old picture, as a transition from it, every pixel is
// painted and the old one doesn't fade: it is covered.
//
// The way is cut into steps much finer than the histogram's bins, so a narrow
// band is still passed through rather than flashed at once. Only non-empty
// steps count. Each one gets part of the time evenly and part by its number of
// pixels: by count alone a lone outlier would blink by unseen, evenly alone the
// sparse stretches between groups of values would leave the picture dark.
// Inside a step, pixels light up in the pattern's reveal order, like it emerged.
class ValueSweep {
    // look: { colorFunction, flashColorFunction, seconds, fadeSeconds, overOldPicture, fromCanvas }
    // fromCanvas: the bitmap starts as the bare canvas, not the picture on it.
    constructor(values, revealOrder, numHistogramBins, bitmap, look) {
        this._seconds = look.seconds
        this._fadeSeconds = look.fadeSeconds
        this._overOldPicture = look.overOldPicture
        this._fromCanvas = Boolean(look.fromCanvas)
        this._maxSecondsPerStep = 1.5 // before stretching to the whole time
        this._stepsPerHistogramBin = 64
        this._timeByPixels = 0.7      // the rest of the time is split evenly between steps
        this._clearSeconds = 1        // the picture from before the sweep fades out over this
        this._fadedLeft = 0.03        // the glow a pixel has left when it counts as faded
        this._settledGlow = 1 / 512   // below a gray level, so the pixel can stop changing
        this._backgroundShare = 1 / 3 // a color covering less isn't the background; zero's color is
        this._darkGray = ColorPacking.gray(40)
        this._lightGray = ColorPacking.gray(240)
        this._minFlashContrast = 64   // in brightness, 0 … 255

        this._axis = new SymLogScale()
        this._numHistogramBins = numHistogramBins
        this._bitmap = bitmap
        this._values = values
        this._revealOrder = revealOrder
        this.takeColors(look.colorFunction, look.flashColorFunction)
        this.chooseCanvas()
        this.groupPixelsBySteps()
        this.planTime()

        this._colors = bitmap.copyPixels()
        this._glow = new Float32Array(values.length).fill(1)
        this._lit = new Uint8Array(values.length)
        if (this._fromCanvas) {
            bitmap.fill(this._canvas)
            this._glow.fill(0)
        }
        this._repaintLit = false
        this._repaintAll = false
        this._replanned = false

        this._startMs = null
        this._lastMs = null
        this._currentStep = 0
        this._litPixels = 0
    }


    takeColors(colorFunction, flashColorFunction) {
        this._colorFunction = colorFunction
        this._flashColorFunction = flashColorFunction
        const values = this._values
        this._finalColors = new Uint32Array(values.length)
        for (let i = 0; i < values.length; ++i)
            this._finalColors[i] = colorFunction(values[i])
    }


    buildsUp() { return this._fadeSeconds === Infinity }


    // A transition covers the old picture whole, so its canvas never shows.
    chooseCanvas() {
        const zeroColor = this._colorFunction(0)
        this._flashesAll = false
        if (this._overOldPicture)
            this._canvas = zeroColor
        else if (this.buildsUp())
            this._canvas = this.nonzeroLightShare() > 0.5 ? this._darkGray : this._lightGray
        else {
            const [top, share] = this.mostCommonColor()
            this._flashesAll = share >= this._backgroundShare
            this._canvas = this._flashesAll ? top : zeroColor
        }
    }


    // Of all pixels when every value is zero.
    nonzeroLightShare() {
        const values = this._values
        const colors = this._finalColors
        const allZero = !values.some(v => v !== 0)
        let light = 0
        let counted = 0
        for (let i = 0; i < colors.length; ++i) {
            if (values[i] === 0 && !allZero)
                continue
            ++counted
            if (ColorPacking.brightness(colors[i]) > 127)
                ++light
        }
        return light / counted
    }


    mostCommonColor() {
        const counts = new Map()
        let top = 0
        let topCount = 0
        for (const c of this._finalColors) {
            const n = (counts.get(c) || 0) + 1
            counts.set(c, n)
            if (n > topCount) {
                top = c
                topCount = n
            }
        }
        return [top, topCount / this._finalColors.length]
    }


    paints(i) { return this._overOldPicture || this._flashesAll || this._finalColors[i] !== this._canvas }


    flashColor(i) {
        const c = this._finalColors[i]
        if (!this._flashesAll || c !== this._canvas)
            return c
        const flash = this._flashColorFunction(this._values[i])
        if (Math.abs(ColorPacking.brightness(flash) - ColorPacking.brightness(c)) >= this._minFlashContrast)
            return flash
        return ColorPacking.brightness(c) > 127 ? this._darkGray : this._lightGray
    }


    numSteps() { return this._stepDistances.length }


    // A step is a distance from zero on the symlog axis, on either side.
    // Zeros get a distance past all the others.
    groupPixelsBySteps() {
        const values = this._values
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
            if (!this.paints(i)) {
                pixelDistance[i] = -1
                continue
            }
            if (v === 0) {
                pixelDistance[i] = zeroDistance
                ++distanceCounts[zeroDistance]
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
            if (dist === zeroDistance) bins.push(half - 1, half)
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
            const i = this._revealOrder(k)
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


    clearSeconds() {
        if (this._overOldPicture)
            return Infinity
        return this._fromCanvas ? 0 : Math.min(this._clearSeconds, this._seconds / 4)
    }


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


    setFadeSeconds(fadeSeconds) {
        const builtUp = this.buildsUp()
        this._fadeSeconds = fadeSeconds
        if (this.buildsUp() !== builtUp)
            this.replan()
    }


    setColorFunction(colorFunction, flashColorFunction) {
        this.takeColors(colorFunction, flashColorFunction)
        this.replan()
    }


    // Another canvas changes which pixels are painted, so the way is cut
    // anew; the pixels it has passed by now count as passed, lit or not.
    replan() {
        const canvas = this._canvas
        this.chooseCanvas()
        for (let i = 0; i < this._lit.length; ++i)
            if (this._lit[i])
                this._colors[i] = this.flashColor(i)
        this._repaintLit = true
        this._repaintAll ||= this._canvas !== canvas
        this.groupPixelsBySteps()
        this.planTime()
        this._currentStep = 0
        this._replanned = true
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
        if (this._replanned) {
            this._litPixels = this.pixelsDueAt(elapsed)
            this._replanned = false
        }
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
        for (; this._litPixels < due; ++this._litPixels) {
            const i = this._stepPixels[this._litPixels]
            this._colors[i] = this.flashColor(i)
            this._glow[i] = 1
            this._lit[i] = 1
            this._bitmap.setPixel(i, this._colors[i])
        }
    }
}
