// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class DrawingOptions {
    constructor(ir = false, neg = false,
        col = false, signed = false,
        hueAmp = 1, hueOffset = 0,
        brightnessAmp = 1, brightnessOffset = 0,
        window = false, windowCenter = 0, windowDecades = 1) {
        this.infrared = ir
        this.negative = neg
        this.colored = col
        this.signed = signed
        this.hueAmp = hueAmp
        this.hueOffset = hueOffset
        this.brightnessAmp = brightnessAmp
        this.brightnessOffset = brightnessOffset
        this.window = window
        this.windowCenter = windowCenter
        this.windowDecades = windowDecades
    }


    copy() {
        return new DrawingOptions(
            this.infrared, this.negative, this.colored, this.signed,
            this.hueAmp, this.hueOffset,
            this.brightnessAmp, this.brightnessOffset,
            this.window, this.windowCenter, this.windowDecades)
    }


    set(d) {
        this.infrared = d.infrared
        this.colored = d.colored
        this.negative = d.negative
        this.signed = d.signed
        this.hueAmp = d.hueAmp
        this.hueOffset = d.hueOffset
        this.brightnessAmp = d.brightnessAmp
        this.brightnessOffset = d.brightnessOffset
        // settings saved before the window mode existed don't have these
        this.window = d.window ?? false
        this.windowCenter = d.windowCenter ?? 0
        this.windowDecades = d.windowDecades ?? 1
    }
}




class PatternColorController {
    constructor() {
        this._drawingOptions = new DrawingOptions()
        this._colorFunction = null
        this._pattern = null
        this._lowBrightness = 40
        this._midBrightness = 140
        this._hiBrightness  = 240
        this._saturation = 100
        this._offsetStep = 8
        this._ampStep = Math.pow(2, 0.25)
        this._valueAxis = new SymLogScale()
        this._thresholdInPlainMode = true
        this.l = new Logger("Color Controller")
    }


    setPattern(p) { this._pattern = p }


    getDrawingOptions() { return this._drawingOptions }


    getOffsetAndAmpSteps() { return [this._offsetStep, this._ampStep] }


    setDrawingOptions(d) {
        this._drawingOptions.set(d)
        this.updateColorFunction()
    }


    // Without infrared, brightness offset / amp acts as a threshold: |value|
    // below it is dark. The window does the same and more, so a UI may drop
    // the threshold and turn the one of old settings into a window.
    useWindowInsteadOfThreshold() {
        this._thresholdInPlainMode = false
        this.updateColorFunction()
    }


    // Close, not exact: the inside of the window gets a ramp instead of being flat.
    convertThresholdToWindow() {
        const d = this._drawingOptions
        const t = Math.abs(d.brightnessOffset / d.brightnessAmp)
        if (d.infrared || d.window || !(t > 0))
            return
        d.window = true
        d.windowCenter = 0
        d.windowDecades = this._valueAxis.toUnits(t)
        d.negative = !d.negative
        d.brightnessOffset = 0
        d.brightnessAmp = 1
        this.updateColorFunction()
    }


    // [from, to]: the window is symmetric on the symlog value axis, not in values
    getWindowRange() {
        const d = this._drawingOptions
        const axis = this._valueAxis
        const c = axis.toUnits(d.windowCenter)
        return [axis.fromUnits(c - d.windowDecades), axis.fromUnits(c + d.windowDecades)]
    }


    setWindowRange(from, to) {
        const axis = this._valueAxis
        const a = axis.toUnits(from)
        const b = axis.toUnits(to)
        this._drawingOptions.windowCenter = axis.fromUnits((a + b) / 2)
        this._drawingOptions.windowDecades = Math.abs(b - a) / 2
        this.updateColorFunction()
    }


    toggleInfrared() {
        let d = this._drawingOptions
        const v = !d.infrared
        d.infrared = v
        this.l.log("infrared:", v)
        this.updateColorFunction()
        return v
    }


    toggleSigned() {
        let d = this._drawingOptions
        const v = !d.signed
        d.signed = v
        this.l.log("signed:", v)
        this.updateColorFunction()
        return v
    }


    toggleNegative() {
        let d = this._drawingOptions
        const v = !d.negative
        d.negative = v
        this.l.log("negative:", v)
        this.updateColorFunction()
        return v
    }


    toggleColored() {
        let d = this._drawingOptions
        const v = !d.colored
        d.colored = v
        this.l.log("colored:", v)
        this.updateColorFunction()
        return v
    }


    changeHueOffset(d) {
        d *= this._offsetStep
        this._drawingOptions.hueOffset += d
        this.l.log("hue offset:", this._drawingOptions.hueOffset)
        this.updateColorFunction()
    }


    changeHueAmp(d) {
        let a = this._ampStep
        d = (d > 0) ? a : 1 / a
        let op = this._drawingOptions
        op.hueAmp *= d
        op.hueAmp = numUtils.pow2gridFix(op.hueAmp)
        this.l.log("hue amp:", op.hueAmp)
        this.updateColorFunction()
    }


    changeBrightnessOffset(d) {
        d *= this._offsetStep
        this._drawingOptions.brightnessOffset += d
        this.l.log("brightness offset:", this._drawingOptions.brightnessOffset)
        this.updateColorFunction()
    }


    changeBrightnessAmp(d) {
        let a = this._ampStep
        d = (d > 0) ? a : 1 / a
        let op = this._drawingOptions
        op.brightnessAmp *= d
        op.brightnessAmp = numUtils.pow2gridFix(op.brightnessAmp)
        this.l.log("brightness amp:", op.brightnessAmp)
        this.updateColorFunction()
    }


    setAmpsAndOffsets(ba, bo, ha, ho){
        let op = this._drawingOptions
        op.brightnessOffset = bo
        op.brightnessAmp = ba
        op.hueOffset = ho
        op.hueAmp = ha
        this.l.log("set brightness/hue amps/offs:", ba, bo, "\t ", ha, ho)
        this.updateColorFunction()
    }


    setInfrared(on) {
        this._drawingOptions.infrared = on
        this.updateColorFunction()
    }


    setWindow(on) {
        this._drawingOptions.window = on
        this.updateColorFunction()
    }


    setSigned(on) {
        this._drawingOptions.signed = on
        this.updateColorFunction()
    }


    setNegative(on) {
        this._drawingOptions.negative = on
        this.updateColorFunction()
    }


    setColored(on) {
        this._drawingOptions.colored = on
        this.updateColorFunction()
    }


    setBrightnessAmp(a) {
        this._drawingOptions.brightnessAmp = a
        this.updateColorFunction()
    }


    setBrightnessOffset(o) {
        this._drawingOptions.brightnessOffset = o
        this.updateColorFunction()
    }


    setHueAmp(a) {
        this._drawingOptions.hueAmp = a
        this.updateColorFunction()
    }


    setHueOffset(o) {
        this._drawingOptions.hueOffset = o
        this.updateColorFunction()
    }


    setWindowCenter(c) {
        this._drawingOptions.windowCenter = c
        this.updateColorFunction()
    }


    // half the window's width on the symlog axis: decades, for |values| above 1e-300
    setWindowDecades(w) {
        this._drawingOptions.windowDecades = w
        this.updateColorFunction()
    }


    resetHueParams() {
        this._drawingOptions.hueAmp = 1
        this._drawingOptions.hueOffset = 0
        this.l.log("reset hue params")
        this.updateColorFunction()
    }


    resetBrightnessParams() {
        this._drawingOptions.brightnessAmp = 1
        this._drawingOptions.brightnessOffset = 0
        this.l.log("reset brightness params")
        this.updateColorFunction()
    }


    getColorFunction() { return this._colorFunction }


    updateColorFunction() {
        const d = this._drawingOptions
        const hf = this.makeHueFunc(d)
        const sf = this.makeSaturationFunc(d)
        const bf = this.makeBrightnessFunc(d)
        let cf = (p) => {
            const b = bf(p)
            return ColorPacking.hsb(hf(p), sf(b), b)
        }
        if (d.window)
            cf = this.limitToWindow(d, cf)
        this._colorFunction = cf
        this._pattern.setColorFunction(cf)
    }


    // MRI-style window: only values within center ± decades on the symlog
    // axis are drawn, the rest is background.
    limitToWindow(drawingOptions, colorInside) {
        const d = drawingOptions
        const axis = this._valueAxis
        const center = axis.toUnits(d.windowCenter)
        const decades = d.windowDecades
        const outside = ColorPacking.gray(d.negative ? this._hiBrightness : this._lowBrightness)
        return (p) => { return Math.abs(axis.toUnits(p) - center) > decades ? outside : colorInside(p) }
    }


    makeHueFunc(drawingOptions) {
        const d = drawingOptions
        
        const loHue = 0
        const midHue = 127
        const hiHue = 255

        let h = (p) => { return loHue }

        if (!d.colored)
            return h

        if (d.signed)
            h = (p) => {
                if (p > 0) return midHue + 1 + (midHue + p) % midHue
                else return midHue + 1 - (midHue + 1 - p) % (midHue + 1)
            }
            
        else
            h = (p) => { return Math.abs(p) % hiHue }

        if (d.negative) {
            let a = h
            h = (p) => { return (a(p) + midHue) % hiHue }
        }

        let map = (p) => { return p * d.hueAmp + d.hueOffset }
        let a = h
        h = (p) => {
            p = map(p)
            return a(p)
        }

        return h
    }


    makeSaturationFunc(drawingOptions) {
        const d = drawingOptions

        const lo = 0
        const hi = this._saturation

        function s(b) { return lo }
        
        if (!d.colored)
            return s

        if (d.infrared) {
            const brThresh = 100
            const brFix = (br) => {
                if (br < brThresh) 
                    return (br - this._lowBrightness) / brThresh
                return 1
            }
            s = (b) => { return brFix(b) * hi }
        }

        else 
            s = (b) => { return (b > this._lowBrightness) ? hi : lo }
            
        return s
    }


    makeBrightnessFunc(drawingOptions) {
        const d = drawingOptions
        if (d.window && !d.infrared)
            return this.makeWindowRampFunc(d)

        let b = (p) => { return 0 }

        const low = this._lowBrightness
        const mid = this._midBrightness
        const hi  = this._hiBrightness

        const lowToHi = hi - low
        const midToHi = hi - mid
        const midToLo = mid - low

        if (d.infrared) {
            if (d.signed) {
                if (d.negative)
                    b = (p) => {
                        if (p == 0) return mid
                        if (p < 0) return mid + Math.abs(p) % midToHi
                        else return mid - Math.abs(p) % midToLo
                    }
                else
                    b = (p) => {
                        if (p == 0) return mid
                        if (p > 0) return mid + Math.abs(p) % midToHi
                        else return mid - Math.abs(p) % midToLo
                    }
            }
            else {
                if (d.negative)
                    b = (p) => {
                        return hi - Math.abs(p) % lowToHi
                    }
                else
                    b = (p) => {
                        return low + Math.abs(p) % lowToHi
                    }
            }
        }

        else {
            if (d.signed) {
                if (d.negative)
                    b = (p) => {
                        if (p < 0) return hi
                        if (p == 0) return 80
                        if (p > 0) return low
                    }
                else
                    b = (p) => {
                        if (p < 0) return low
                        if (p == 0) return 80
                        if (p > 0) return hi
                    }
            }
            else {
                // для этого режима offset выступает как threshold
                // так что вся логика в map
                    b = (p) => {
                        return (p == 0) ? low : hi
                    }
            }
        }

        let a = b
        let map = this.makeBrightnessMapFunction(d)
        b = (p) => {
            p = map(p)
            return a(p)
        }

        return b
    }


    // Inside the window without infrared: dark at its low end, bright at the
    // high one. Amp and offset don't apply here.
    makeWindowRampFunc(drawingOptions) {
        const d = drawingOptions
        const low = this._lowBrightness
        const range = this._hiBrightness - low
        const axis = this._valueAxis
        const center = axis.toUnits(d.windowCenter)
        const width = Math.max(2 * d.windowDecades, Number.MIN_VALUE)
        const ramp = (p) => {
            const t = 0.5 + (axis.toUnits(p) - center) / width
            return t <= 0 ? 0 : (t >= 1 ? 1 : t)
        }
        if (d.negative)
            return (p) => { return low + range * (1 - ramp(p)) }
        return (p) => { return low + range * ramp(p) }
    }


    makeBrightnessMapFunction(drawingOptions) {
        const d = drawingOptions

        let map = (p) => { return p }

        if (d.infrared) {
            map = (p) => {
                return p * d.brightnessAmp + d.brightnessOffset
            }
        }

        else {
            const threshold = this._thresholdInPlainMode ? Math.abs(d.brightnessOffset) : 0
            if (d.negative)
                map = (p) => {
                    if (p == 0) p = Number.MAX_VALUE
                    else if (Math.abs(p * d.brightnessAmp) > threshold)
                        p = 0
                    return p
                }

            else
                map = (p) => {
                    if (Math.abs(p * d.brightnessAmp) < threshold)
                        p = 0
                    return p
                }
        }

        return map
    }




}