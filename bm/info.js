// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Info {
    constructor(){
        this._formulaString = "?"
        this._drawingParamsString = "?"
        this._processString = "?"
        this._framingString = "?"
        this._patternNum = -1
        this._framing = new Framing(-1, -1, -1)
        this._drawingOptions = new DrawingOptions()
        this._drawing = false
        this._slideshowPlaying = false
        this._drawOnFullscreen = false
        this._textSize = 16
        this._rect = new Rectangle()
        this._BGrect = new Rectangle()
        this._percentReady = 0
    }

    setRect(r)          { 
        this._rect = r 
        this._BGrect = r.getWithMargin(this._textSize * 2)
    }

    setTxtSize(s)       { this._textSize = s }
    setFormulaString(f) { this._formulaString = f }
    setPatternNum(n)    { this._patternNum = n.toString() }

    setDrawingOptions(d) {
        this._drawingOptions = d
        this.updateDrawingOptionsString()
    }

    setFraming(f) {
        this._framing = f
        this.updateFramingString()
    }

    setDrawingStatus(d){
        this._drawing = d
        this.updateProcessString()
    }

    setSlideshowStatus(s){
        this._slideshowPlaying = s
        this.updateProcessString()
    }

    setPercentReady(p) {
        if (p < 100.0) {
            this._percentReady = p.toFixed(2).toString()
            if (p < 10.0)
                this._percentReady = "0" + this._percentReady.toString()
        }
        else
            this._percentReady = "100"
        this._percentReady += '%'
    }

    setDrawOnFullscreen(d) {
        this._drawOnFullscreen = d;
    }

    updateDrawingOptionsString() {
        const d = this._drawingOptions
        let s = ""
        if (d.infrared) s += "i"
        if (d.negative) s += (s.length ? ", " : "") + "n"
        if (d.colored)  s += (s.length ? ", " : "") + "c"
        if (d.signed)   s += (s.length ? ", " : "") + "s"
        if (s.length) s = "[ " + s + " ]\n"

        s += "b amp : " + d.brightnessAmp + "\nb off : " + d.brightnessOffset
        if (d.colored)
            s += "\nh amp : " + d.hueAmp + "\nh off : " + d.hueOffset

        this._drawingParamsString = s
    }

    updateProcessString() {
        let s = ""
        if (this._drawing) s = "▶"
        else if (this._slideshowPlaying) s = "▷"
        else s = "| |"
        this._processString = s
    }

    updateFramingString() {
        let f = this._framing
        this._framingString = "x₀ : " + f.x0 + "\ny₀ : " + f.y0 + "\nz :   " + f.zoom
    }

    draw(c) {
        c.push()
        c.noStroke()
        c.textSize(this._textSize)
        c.textAlign(c.LEFT, c.TOP)

        if (this._drawOnFullscreen){
            c.fill(40, 128)
            const b = this._BGrect
            c.rect(b.L(), b.T(), b.W(), b.H())
        }
        else {
            c.blendMode(c.DIFFERENCE)
        }

        c.fill(240)

        const r = this._rect

        let y = r.T()
        let x = r.L()
        let d = this._textSize

        c.text(this._processString, x, y)
        x += 1.5 * d
        c.text(this._patternNum, x, y)
        x += 0.7 * d * (this._patternNum.length + 0.7)
        c.text(this._percentReady, x, y)

        x = r.L()
        y += 1.5 * d
        c.text(this._formulaString, x, y)
        y += 2.5 * d
        c.text(this._framingString, x, y)
        y += 4.5 * d
        c.text(this._drawingParamsString, x, y)
        c.pop()
    }


}