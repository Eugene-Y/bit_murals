// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Slider {
    constructor(label = "label", txtSz = 12, defaultVal = 0, rectangle = new Rectangle) {
        this.rect = rectangle
        this.valRect = rectangle
        this.val = defaultVal
        this.label = label
        this.valOff = txtSz
        this.labelX = 0
        this.labelY = 0
        this.rectFill = 0
        this.txtFill = 255
        this.textSize = txtSz
        this.l = new Logger(label)
        this.l.setActive(false)
        this.recalc()
    }


    mouseOver(x, y) { return this.rect.contains(x, y) }


    mouseOn(x, y) {
        x -= this.rect.L()
        y -= this.rect.T()

        if (this.verticalOrientation())
            this.val = (this.rect.H() - this.valOff - y)
                     / (this.rect.H() - this.valOff)

        else
            this.val = (this.rect.W() - this.valOff - x)
                     / (this.rect.W() - this.valOff)

        if      (this.val > 0.99) this.val = 1.0
        else if (this.val < 0.01) this.val = 0.0

        this.l.log("val", this.val)

        this.recalc()
    }


	getValue() { return this.val }

    setValue(v) {
        this.val = v
        this.recalc()
    }


    getLabel() { return this.label }


    verticalOrientation() { return this.rect.H() > this.rect.W() }


    setRect(r) {
        this.rect = r
        this.recalc()
    }


    getRect() { return this.rect }


    recalc() {
        this.calcColors()

        if (this.verticalOrientation()) {
            const barH = this.val * (this.rect.H() - this.valOff) + this.valOff
            const head = this.rect.T() + this.rect.H() - barH
            this.valRect = new Rectangle(this.rect.W(), barH, this.rect.L(), head)

            this.labelX = this.rect.MX()
            this.labelY = this.rect.B() - this.textSize
        }

        else {
            const barW = this.val * (this.rect.W() - this.valOff) + this.valOff
            const head = this.rect.R() - barW
            this.valRect = new Rectangle(barW, this.rect.H(), head, this.rect.T())

            this.labelX = this.rect.R() - this.textSize
            this.labelY = this.rect.MY()
        }
    }


    calcColors(){
        this.rectFill = this.val == 0 ? 60 : 75 + this.val * 90
        this.txtFill = (this.rectFill + 127) % 255
    }


    draw(g){
        g.push()
		g.noStroke()
		g.fill(this.rectFill)
        g.rectMode(g.CORNER)
        const r = this.valRect
		g.rect(r.L(), r.T(), r.W(), r.H())
        g.noStroke()
		g.fill(this.txtFill)
		g.textAlign(g.CENTER)
		g.text(this.label, this.labelX, this.labelY)
		g.pop()
	}


}