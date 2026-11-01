// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Scales map a value to a slider position in [0, 1] and back.
// "units" is the scale's own linear coordinate, used for fine steps.

class LinearScale {
    constructor(min, max) {
        this._min = min
        this._max = max
    }

    toUnits(v)   { return v }
    fromUnits(u) { return this.clamp(u) }
    clamp(v)     { return Math.min(this._max, Math.max(this._min, v)) }
    unitsRange() { return [this._min, this._max] }
}




// Positive values over decades: units are log10 of the value.
class LogScale {
    constructor(minExp, maxExp) {
        this._minExp = minExp
        this._maxExp = maxExp
    }

    toUnits(v)   { return Math.log10(Math.max(v, Math.pow(10, this._minExp))) }
    fromUnits(u) { return Math.pow(10, Math.min(this._maxExp, Math.max(this._minExp, u))) }
    clamp(v)     { return Math.min(Math.pow(10, this._maxExp), Math.max(Math.pow(10, this._minExp), v)) }
    unitsRange() { return [this._minExp, this._maxExp] }
}




// Any double, sign included: units are sign(v) * log10(1 + |v| / tiny), so zero
// sits in the middle, 1e-300 is a hair away from it and 1e308 at the ends.
// |v| / tiny overflows for |v| > 1e8, so big values go through logarithms.
class SymLogScale {
    constructor() {
        this._tiny = 1e-300
        this._logTiny = -300
        this._bigUnits = 15 // above this, the 1 in (1 + |v| / tiny) is lost anyway
        this._maxUnits = Math.log10(Number.MAX_VALUE) - this._logTiny
    }

    toUnits(v) {
        const a = Math.abs(v)
        if (!isFinite(a))
            return Math.sign(v) * this._maxUnits
        const units = Math.log10(a) - this._logTiny
        if (units > this._bigUnits)
            return Math.sign(v) * Math.min(units, this._maxUnits)
        return Math.sign(v) * Math.log10(1 + a / this._tiny)
    }

    fromUnits(u) {
        u = Math.min(this._maxUnits, Math.max(-this._maxUnits, u))
        const a = Math.abs(u)
        const v = a > this._bigUnits ?
                  Math.pow(10, a + this._logTiny)
                : this._tiny * (Math.pow(10, a) - 1)
        return Math.sign(u) * Math.min(v, Number.MAX_VALUE)
    }

    clamp(v) { return Math.min(Number.MAX_VALUE, Math.max(-Number.MAX_VALUE, v)) }

    unitsRange() { return [-this._maxUnits, this._maxUnits] }
}




const ScaleUtils = {

    toPosition: (scale, v) => {
        const [lo, hi] = scale.unitsRange()
        return (scale.toUnits(v) - lo) / (hi - lo)
    },

    fromPosition: (scale, t) => {
        const [lo, hi] = scale.unitsRange()
        return scale.fromUnits(lo + t * (hi - lo))
    },

    formatNumber: (v) => {
        if (v === 0) return "0"
        const a = Math.abs(v)
        if (a >= 1e4 || a < 1e-3) return v.toExponential(2)
        return String(Number(v.toPrecision(4)))
    }
}
