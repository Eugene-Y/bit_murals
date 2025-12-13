// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class SampleGroup {
    constructor(n = 0, sum = 0, min = Number.MAX_VALUE, max = -Number.MAX_VALUE) {
        this.n   = n
        this.sum = sum
        this.min = min
        this.max = max
    }


    clear() {
        this.n = 0
        this.sum = 0
        this.min =  Number.MAX_VALUE
        this.max = -Number.MAX_VALUE
    }


    isFlat() { return this.min == this.max }

    isEmpty() { return this.n == 0 }


    isEqualTo(other){
        return this.n   == other.n   && this.sum == other.sum
            && this.min == other.min && this.max == other.max
    }


    copy() {
        return new SampleGroup(this.n, this.sum,
                               this.min, this.max)
    }
}




class SampleSet {
    constructor(){
        this._numCollected = 0
        this._margin = 60
        this._step = 5
        this._nonemptyIds = []
        this._pattern = null
        const numGroups = this.indexFor(Number.MAX_VALUE) + 1
        this._groups = new Array(numGroups)
        for (let i = 0; i != numGroups; ++i)
            this._groups[i] = new SampleGroup()
        this.l = new Logger("Sample Set")
        this.l.setActive(false)
    }


    reset() {
        this._numCollected = 0
        this._nonemptyIds  = []
        for (let i = 0; i != this._groups.length; ++i)
            this._groups[i].clear()
    }


    copy() {
        const c = new SampleSet()
        this._numCollected = c._numCollected
        this._pattern      = c._pattern
        this._margin       = c._margin
        this._step         = c._step

        for (let i = 0; i != this._nonemptyIds.length; ++i) 
            c._nonemptyIds.push(this._nonemptyIds[i])

        for (let i = 0; i != this._groups.length; ++i)
            c._groups[i] = this._groups[i].copy()

    }


    numGroups() { return this._groups.length }

    getGroup(i) { return this._groups[i] }

    numCollected() { return this._numCollected }

    getNonemptyIds() { return this._nonemptyIds }

    haveZeros() { return this._groups[0].n != 0 }

    numZeros() { return this._groups[0].n }

    numNonempty() { return this._nonemptyIds.length }

    getNonemptyId(i) { return this._nonemptyIds[i] }

    getNonemptyGroup(i) { return this._groups[this._nonemptyIds[i]] }


    canSample() {
        const [w, h] = this._pattern.getWidthAndHight()
        return w > 2 * this._margin && h > 2 * this._margin
    }


    setPattern(p){
        this.l.assert(typeof p !== "undefined")
        this._pattern = p
    }


    addSample(v) {
        v = Math.abs(v)
        const i = this.indexFor(v)
        let g = this._groups[i]
        ++g.n
        g.min = Math.min(g.min, v)
        g.max = Math.max(g.max, v)
        g.sum = Math.min(g.sum + v, Number.MAX_VALUE)
        ++this._numCollected
    }


    indexFor(v) {
        v = Math.abs(v)
        if (v == 0) return 0
        if (v < 1) return 1
        return Math.ceil(Math.log10(v)) + 1
    }


    collectSamples(formula) {
        const p = this._pattern
        const [w, h] = p.getWidthAndHight()
        const m = this._margin
        const s = this._step

        // псевдорандом чтобы не попасть на какую-нибудь решетку, 
        // и при этом быть предсказуемым
        // чтобы сравнивать наборы семплов для проверки на похожесть с предыдущим патерном
        const r = 7
        this.l.assert(r < m)
        let v = 0
        const rand = () => { ++v; return Math.round(2 * ((1.3 * v) % r) - r) }

        for (let x = m; x < w - m; x += s)
            for (let y = m; y < h - m; y += s) {
                let px = x + rand()
                let py = y + rand()
                let v = p.getValueAt(px, py, formula)
                this.addSample(v)
            }
        this._groups.forEach((g, i) => {
            if (g.n > 0)
                this._nonemptyIds.push(i)
        })
        this.log()
    }


    log() {
        this.l.logc("sampled", this._numCollected, "non-empty:", this._nonemptyIds.length)
        for (let i = 0; i != this._groups.length; ++i) {
            const g = this._groups[i]
            if (g.n > 0) {
                if (g.isFlat())
                    this.l.log(i, ":", g.n, ",\t flat", (g.max == Number.MAX_VALUE) ? "INF" : g.max)
                else
                    this.l.log(i, ":", g.n, ",\t", g.min, "-", g.max)
            }
        }
        this.l.loge()
    }


    isEqualTo(other){
        if (this._numCollected != other._numCollected)
            return false

        if (this.numNonempty() != other.numNonempty())
            return false

        for (let i = 0; i != this.numNonempty(); ++i) {
            const g1 = this.getNonemptyGroup(i)
            const g2 = other.getNonemptyGroup(i)
            if (!g1.isEqualTo(g2))
                return false
        }

        return true
    }
}




class FascinationChecker {
    constructor (){
        this.l = new Logger("OMG checker")
        this._samples = new SampleSet()
    }
    

    setPattern(p){
        this.l.assert(typeof p !== "undefined")
        this._samples.setPattern(p)
    }


    getSampleSet()     { return this._samples }
    getSampleSetCopy() { return this._samples.copy() }


    isAbsolutelyFascinatingOMGICantEven(formula) {
        this.l.log("checking the formula")
        this.l.assert(typeof formula !== "undefined")
        if (!this._samples.canSample()){
            this.l.warn("pattern is too small to check how beautiful it is. so assume it just is.")
            return true
        }

        this._samples.reset()
        this._samples.collectSamples(formula)
        const ok = this.basicallyOK()
        if (ok)
            this.l.logok("nice! :3")
        else
            this.l.warn("not nice :<")
        return ok
    }


    basicallyOK(){
        const thresh = 4
        for (let i = 0; i != this._samples.numGroups(); ++i) {
            const g = this._samples.getGroup(i)
            if (g.n >= this._samples.numCollected() - thresh && g.isFlat()) {
                this.l.warn("(almost) all vals are", g.min)
                return false
            }
        }
        return true
    }


    niceWithoutDrawingAdjustments(){
        const samp = this._samples
        let nice = samp.numNonempty() > 1 && samp.haveZeros()
        const z = samp.numZeros()
        const thr = 31
        nice &= (z > thr) && (samp.numCollected() - z > thr)
        if (nice)
            this.l.log("nice original:", z, "/", samp.numCollected())
        else
            this.l.warn("needs ajustments")
        return nice
    }
}




class PatternEnhancer {
    constructor(){
        this._COM = 0
        this._balanceVal = 0
        this._niceOptions = new DrawingOptions()
        this._offsetStep = 8
        this._ampStep = Math.pow(2, 0.25)
        this._samples = null
        this.l = new Logger("Pattern Enhancer")
    }


    calculteImprovedDrawingOptions(samples, 
                                   monochrome, adjustOffset, 
                                   offs, amps) {
        this.l.logc("calculating improved drawing options")
        this.l.assert(typeof samples != "undefined")
        this._samples = samples
        this._offsetStep = offs
        this._ampStep = amps
        this.calculateCenterOfMass()
        this.chooseBalanceVal()
        this.adjustBrightnessParams(monochrome, adjustOffset)
        this.adjustHueParams()
        this.l.loge()
        return this._niceOptions.copy()
    }


    calculateCenterOfMass() {
        let mrS = 0
        let mS = 0
        for (let i = 0; i != this._samples.numGroups(); ++i) {
            const g = this._samples.getGroup(i)
            mrS += g.n * i
            mS  += g.n
        }
        this._COM = mrS / mS
        this.l.log("COM:", this._COM)
    }


    chooseBalanceVal() {
        const samp = this._samples        
        const ne = samp.getNonemptyIds()
        const oneGroup = ne.length == 1

        const b = this.balanceId()
        this.l.log("balance id:", b)
        const g = samp.getGroup(b)

        this.l.assert(!oneGroup || !g.isFlat())

        const firstNonemptyId = ne[0]
        const lastNonemptyId = ne[ne.length - 1]

        if (g.isEmpty()) {
            this.l.log("empty balance group. using empty middle")
            this.l.assert(!oneGroup)
            this.l.assert(b > firstNonemptyId && b < lastNonemptyId)
            this._balanceVal = 5 * Math.pow(10, b - 2)
        }

        else if (oneGroup || !g.isFlat()) {
            this.l.log(oneGroup ? "single group" : "several groups")
            this.l.log(g.isFlat() ? "flat" : "non-flat", "balance group. using group COM")
            this.l.assert(!g.isEmpty())
            this._balanceVal = g.sum / g.n
        }

        else {
            this.l.log("several groups and flat balance group")
            // TODO когда подавляющее большинство значений (99.99%) в моногруппе,
            // надо выбирать, основываясь на том, с какой стороны от нее больше точек в других группах

            if (b == firstNonemptyId) {
                this.l.log("using min of 2nd nonempty id", samp.getNonemptyId(1))
                this._balanceVal = samp.getNonemptyGroup(1).min
            }

            else if (b == lastNonemptyId) {
                this._balanceVal = samp.getGroup(b).min
                this.l.log("balance id is last nonempty. using min")
            }

            else {
                this._balanceVal = g.min
                this.l.log("balance is min of balance group", b)
            }
        }

        this.l.log("balance val:", this._balanceVal)
    }


    adjustBrightnessParams(monochrome, adjustOffset) {
        // нужно подобрать такую комбинацию оффсета и усиления, 
        // чтобы в случае монохрома примерно все точки ниже балланса были равны нулю,
        // а в случае infrared контрастность картинки была достаточная
        let off = 0
        let amp = 1

        if (monochrome) {
            amp = this.pickMonochromeAmp()
            if (adjustOffset)
                off = this.pickMonochromeOffset(amp)
        }
        else 
            amp = this.pickContrastAmp()

        this._niceOptions.brightnessAmp = amp
        this._niceOptions.brightnessOffset = off
        this.l.log("brightness amp:", amp, "offset:", off)
    }


    adjustHueParams(){
        // достаточно просто расширить цветовой охват
        const a = this.pickContrastAmp()
        this._niceOptions.hueAmp = a
        this._niceOptions.hue = 0
        this.l.log("hue amp:", a)
    }


    pickMonochromeAmp(){
        this.l.log("monochrome amp")
        const g = this._samples.getGroup(this.balanceId())
        const boringGroup = g.isEmpty() || g.isFlat()

        this.l.assert(boringGroup || (g.min < this._balanceVal && this._balanceVal < g.max))

        const v = boringGroup ? this._balanceVal : this._balanceVal - g.min
        this.l.assert(v >= 0)
        
        let amp = 1
        if (v == 0)
            return 1

        const d = boringGroup ? 64 : 32 // удобное кол-во шагов чтобы поиграться с картинкой

        // эти while не выполняются одновременно
        while (v * amp < d * this._offsetStep && this.normalNumber(amp, d))
            amp *= this._ampStep

        while (v * amp > (d + 1) * this._offsetStep && this.normalNumber(amp, d))
            amp /= this._ampStep

        if (!this.normalNumber(amp))
            amp = 1

        this.l.assert(this.normalNumber(amp))
        return amp
    }
        
        
    pickMonochromeOffset(amp){
        const off = Math.floor(this._balanceVal * amp / this._offsetStep) * this._offsetStep
        this.l.assert(isFinite(off))
        return off
    }


    pickContrastAmp(){
        this.l.log("picking contrast amp")
        const samp = this._samples
        const ne = samp.getNonemptyIds()
        this.l.assert(ne.length)

        const g1 = samp.getNonemptyGroup(0)
        const g2 = samp.getNonemptyGroup(ne.length - 1)

        const min = g1.min
        let max = this._balanceVal

        if (ne.length == 1) {
            this.l.log("amping for one group")
            this.l.assert(!g1.isFlat())
            max = g1.max
        }

        else if (max >= Number.MAX_VALUE) {
            this.l.warn("COM too big")
            this.l.assert(g2.isFlat())
            const prevID = ne[ne.length - 2]
            max = samp.getGroup(prevID).max
        }

        this.l.log("min/max:", min, max)
        this.l.assert(min <= max) // wtf если использовать COM то вылетает
        
        const d = max - min
        let amp = 1
        while (d * amp < 64 && this.normalNumber(amp, 64)) // условно 1/4 диапазона это достаточно
            amp *= this._ampStep

        while (d * amp > 512 && this.normalNumber(amp, 512))
            amp /= this._ampStep

        if (!this.normalNumber(amp))
            amp = 1
        
        this.l.assert(this.normalNumber(amp))
        return amp
    }


    balanceId() { return Math.round(this._COM) }


    normalNumber(a, d = 2){
        const max = Number.MAX_VALUE / d
        const min = Number.MIN_VALUE * d
        if (a >= max) {
            this.l.warn("amp too big", a)
            return false
        }
        else if (a <= min) {
            this.l.warn("amp too small", a)
            return false
        }
        return true
    }


    reset(){
        this._COM = 0
        this._balanceVal = 0
        this._niceOptions = new DrawingOptions()
    }
}