// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// TOTO переименовать в Button
class TouchZone {
    constructor(text = "touch here", subtext = "",
                color = {H: 0, S: 0, B: 255, A: 255},
                rect = new Rectangle()) {
        this.pressed = false
        this.text = text
        this.subtext = subtext
        this.textYAlign = 0
        this.textSize = 12
        this.drawInnerBorder = true
        this.drawOuterBorder = true
        this.drawFilled = false
        this.borderWidth = 6
        this.rect = rect
        this.rectWMargin = rect.copy()
        this.color = color
    }


    mouseOn() { this.pressed = !this.pressed }

    mouseOver(x, y) { return this.rect.contains(x, y) }

    setPressed(p) { this.pressed = p }

    isPressed() { return this.pressed }

    setDrawInnerBorder(b) { this.drawInnerBorder = b }
    setDrawOuterBorder(b) { this.drawOuterBorder = b }
    setDrawFilled(f) { this.drawFilled = f }

    setRect(r) { 
        this.rect = r 
        this.rectWMargin = r.getWithMargin(-2)
    }

    setTextSize(s) { this.textSize = s }

    setTextYAlignment(a) { 
        if (a == "top")
            this.textYAlign = 0
        else if (a == "middle")
            this.textYAlign = 1
        else {
            console.warn("Button: unknown vertical text alignment")
            this.textYAlign = 0
        }
     }

    setBorderWidth(w) { this.borderWidth = w }

    setColor(c) { this.color = c }

    setSubtext(t) { this.subtext = t }

    getRect() { return this.rect }


    draw(g) {
        g.push()
        const rm = this.rectWMargin
        const col = this.color

        if (this.drawFilled)
            this.fillRect(g, col.B, col.A)

        if (this.drawInnerBorder)
            this.drawRectInnerBorder(g, rm, col, this.borderWidth)
        
        if (this.drawOuterBorder)
            this.drawRectInnerBorder(g, rm, col, 1)

        if (this.pressed)
            this.fillRect(g, 200, 150)

        this.drawText(g)
        g.pop()
    }


    fillRect(g, br, alpha) {
        const rm = this.rectWMargin
        g.noStroke()
        g.fill(br, alpha)
        g.rect(rm.L(), rm.T(), rm.W(), rm.H())
    }


    drawText(g) {
        const r = this.rect
        const col = this.color

        g.textAlign(g.CENTER)
        g.textSize(this.textSize)
        g.noStroke()
        this.pressed ? g.fill(40) : g.fill(col.H, col.S, col.B, 3 * col.A)

        let y = r.T()
        if (this.textYAlign == 0)
            y += 3 * this.textSize
        else if (this.textYAlign == 1) {
            g.textAlign(g.CENTER, g.CENTER)
            y = r.MY()
        }

        g.text(this.text, r.MX(), y)
        g.textSize(this.textSize / 1.3)
        g.text(this.subtext, r.MX(), y + this.textSize)
    }


    drawRectInnerBorder(g, r, col, m) {
        g.push()
        const mr = r.getWithMargin(-m)
        g.noFill()
        g.stroke(col.H, col.S, col.B, col.A)
        g.strokeWeight(2 * m)
        g.rect(mr.L(), mr.T(), mr.W(), mr.H())
        g.pop()
    }

}