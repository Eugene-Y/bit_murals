// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Two quick taps of one finger near the same place. Touch browsers fire
// dblclick unreliably once their own gestures are off, so taps are told
// from pointer events.
class DoubleTap {
    constructor(onDoubleTap) {
        this._onDoubleTap = onDoubleTap
        this._maxTapMs = 250
        this._maxGapMs = 300
        this._maxSlopPx = 12
        this._down = null
        this._lastTap = null
    }


    down(e, numHeld) {
        if (numHeld > 1) {
            this._down = null
            this._lastTap = null
            return
        }
        this._down = { x: e.clientX, y: e.clientY, ms: e.timeStamp }
    }


    move(e) {
        if (this._down && !this.near(this._down, e))
            this._down = null
    }


    up(e) {
        const d = this._down
        this._down = null
        if (!d || e.timeStamp - d.ms > this._maxTapMs)
            return
        const t = this._lastTap
        if (t && e.timeStamp - t.ms < this._maxGapMs && this.near(t, e)) {
            this._lastTap = null
            this._onDoubleTap()
            return
        }
        this._lastTap = { x: e.clientX, y: e.clientY, ms: e.timeStamp }
    }


    near(p, e) { return Math.hypot(e.clientX - p.x, e.clientY - p.y) <= this._maxSlopPx }
}
