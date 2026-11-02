// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Slideshow {
    constructor() {
        this._playing = false
        this._delayMs = 2000
        this.l = new Logger("Slideshow")
        this._nextPatternCallback = () => { this.l.warn("no next pattern callback") }
    }


    isPlaying() { return this._playing }

    getDelayMs() { return this._delayMs }


    setNextPatternCallback(cb) {
        this.l.log("set redraw callback")
        this.l.assert(typeof cb !== "undefined")
        this._nextPatternCallback = cb
    }


    stop() {
        if (!this._playing)
            return
        this.l.log("stop")
        this._playing = false
    }


    start() {
        if (this._playing)
            return
        this.l.log("start")
        this._playing = true
        this.restartCycle()
    }


    toggle(){
        this.l.log("toggle")
        if (this._playing)
            this.stop()
        else
            this.start()
        return this._playing
    }


    restartCycle() {
        if (!this._playing)
            return

        this.l.log("calling redraw cb")
        const canRestart = this._nextPatternCallback()

        if (!canRestart)
            setTimeout(() => { this.restartCycle() }, 200)

        else {
            setTimeout(() => {
                if (this._playing) {
                    this.l.log("next animation cycle")
                    this.restartCycle()
                }}, this._delayMs)
        }
    }




}