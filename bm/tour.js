// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// TODO меню и тур это объекты одного класса
// с массивом TourItems, в котором тексты, кнопки и ссылки
class Tour {
    constructor() {
        this._pageTexts = []
        this._item = 0
        this._btnPrev = new TouchZone("PREV ◄")
        this._btnNext = new TouchZone("NEXT ►")
        this._btnClose = new TouchZone("CLOSE")
        this._txtRect = new Rectangle()
        this._txtSize = 14
        this._onClose = () => { }
        this.fillPageTexts()
        this.styleButtons()
        this.setButtonsToInitialState()
    }


    setOnCloseCallback(cb) {
        this._onClose = cb
    }


    mouseClicked(x, y) {
        if (this._btnPrev.mouseOver(x, y) && this.notOnFirstItem())
            this._btnPrev.setPressed(true)

        else if (this._btnNext.mouseOver(x, y) && this.notOnLastItem())
            this._btnNext.setPressed(true)

        else if (this._btnClose.mouseOver(x, y))
            this._btnClose.setPressed(true)
    }


    mouseReleased() {
        if (this._btnClose.isPressed())
            this._onClose()

        else if (this._btnPrev.isPressed())
            this.goToPrevItem()

        else if (this._btnNext.isPressed())
            this.goToNextItem()

        this.springBackButtons()
    }


    goToPrevItem() {
        if (this.notOnFirstItem())
            --this._item

        if (this.onFirstItem())
            this.setButtonInactive(this._btnPrev)

        if (this.notOnLastItem())
            this.setButtonActive(this._btnNext)
    }


    goToNextItem() {
        if (this.notOnLastItem())
            ++this._item
        else
            this._onClose()

        if (this.onLastItem())
            this.setButtonInactive(this._btnNext)

        if (this.notOnFirstItem())
            this.setButtonActive(this._btnPrev)
    }


    restart() {
        this._item = 0
        this.setButtonsToInitialState()
    }


    onFirstItem() { return this._item == 0 }
    notOnFirstItem() { return this._item > 0 }

    onLastItem() { return this._item == this._pageTexts.length - 1 }
    notOnLastItem() { return this._item < this._pageTexts.length - 1 }


    springBackButtons() {
        this._btnPrev.setPressed(false)
        this._btnNext.setPressed(false)
        this._btnClose.setPressed(false)
    }


    setButtonActive(btn) {
        const c = { H: 0, S: 0, B: 240, A: 110 }
        btn.setColor(c)
    }


    setButtonInactive(btn) {
        const c = { H: 0, S: 0, B: 140, A: 110 }
        btn.setColor(c)
    }


    onResize(areaSize, rects) {
        const s = Math.min(14, areaSize / 24)
        this._txtSize = s
        this._btnPrev.setTextSize(s)
        this._btnNext.setTextSize(s)
        this._btnClose.setTextSize(s)
        this._btnPrev.setRect(rects.prev)
        this._btnNext.setRect(rects.next)
        this._btnClose.setRect(rects.close)
        this._txtRect = rects.text
    }


    setButtonsToInitialState() {
        this.setButtonInactive(this._btnPrev)
        this.setButtonInactive(this._btnNext)
        this.setButtonActive(this._btnClose)
        if (this.notOnLastItem())
            this.setButtonActive(this._btnNext)
    }


    styleButtons() {
        this._btnPrev.setDrawInnerBorder(false)
        this._btnNext.setDrawInnerBorder(false)
        this._btnClose.setDrawInnerBorder(false)

        this._btnPrev.setDrawOuterBorder(false)
        this._btnNext.setDrawOuterBorder(false)
        this._btnClose.setDrawOuterBorder(false)

        this._btnPrev.setDrawFilled(true)
        this._btnNext.setDrawFilled(true)
        this._btnClose.setDrawFilled(true)

        const a = "middle"
        this._btnPrev.setTextYAlignment(a)
        this._btnNext.setTextYAlignment(a)
        this._btnClose.setTextYAlignment(a)
    }


    draw(g) {
        g.push()
        g.background(40, 200)
        this._btnPrev.draw(g)
        this._btnNext.draw(g)
        this._btnClose.draw(g)
        g.noStroke()
        g.fill(240)
        g.textSize(this._txtSize)
        g.textAlign(g.LEFT, g.TOP);
        const r = this._txtRect
        const x = r.L()
        const y = r.T()
        const posstr = (this._item).toString() + '/' + (this._pageTexts.length - 1).toString()
        g.text(posstr, x, y)
        g.text(this._pageTexts[this._item], x, y + 2 * this._txtSize, r.W(), r.H())
        g.pop()
    }


    fillPageTexts() {
        let t = this._pageTexts

        let s = "welcome to bit murals."

        s += "\n \nit is a math art experiment"
        s += "\ninspired by many visual and sound artists,"
        s += "\nmost notably folds2d and emptyset."
        s += "\nit is also inspired"
        s += "\nby brutalist architecture."

        s += "\n \nthis tour will show you around."
        s += "\nyou can always toggle it by pressing 'h'."
        s += "\npress esc or 'close' button to close it."
        s += "\nuse arrow keys or the buttons"
        s += "\non the bottom left to navigate it."
        t.push(s.toUpperCase())

        s = "interaction with bm is a balance"
        s += "\nbetween randomness"
        s += "\nand your artistic intention."

        s += "\n \nthe code generates a formula"
        s += "\nbased on the probabilities"
        s += "\nthat are set by the user."
        s += "\nit then computes the values"
        s += "\nfor each point, forming a mural."

        s += "\n \nyou can tweak the probabilities,"
        s += "\nrandomize and mutate the formula,"
        s += "\nnavigate and explore the number field,"
        s += "\nand change the pattern drawing options."

        s += "\n \nyou can also simply observe"
        s += "\nthe flow of patterns in a slideshow."

        s += "\n \nnow let`s take a closer look at the controls."
        t.push(s.toUpperCase())

        s = "to enter the menu"
        s += "\nwith additional options, press 'o',"
        s += "\nor, when not in this tour,"
        s += "\ntap the upper-left corner of the screen."

        s += "\n \nit will also show you the touch zones,"
        s += "\nthat are active inside the menu,"
        s += "\nand the ones that are active outside of it."
        t.push(s.toUpperCase())

        s = "each new pattern is saved in the history."

        s += "\n \nto navigate the history,"
        s += "\nuse left and right arrows"
        s += "\nor tap on the left and the right"
        s += "\nsides of the pattern and margins area."

        s += "\n \ndouble-tap to go"
        s += "\nto the very beginning"
        s += "\nand the end of it."

        s += "\n \nto toggle the slideshow,"
        s += "\npress 's' or the button in the menu."
        t.push(s.toUpperCase())

        s = "press 'R' to randomize the params."
        s += "\n \npress 'M' to mutate the current mural."
        s += "\n(more on that later)"

        s += "\n \nif you like what you see, you can save it."
        s += "\npress down arrow or the button"
        s += "\nin the menu to save a picture"
        s += "\nand a file with its settings."
        s += "\n(this may require a user permission)"

        s += "\n \nto load a saved mural,"
        s += "\ndrag and drop the txt file in this window,"
        s += "\nor open a file picker by pressing up arrow,"
        s += "\nor use the load button in the menu."
        t.push(s.toUpperCase())

        s = "pinch or use mouse wheel"
        s += "\nin the middle portion"
        s += "\nof the pattern and margins area"
        s += "\nto zoom in and out."
        s += "\nuse pinch + ctrl to zoom slowly,"
        s += "\nand pinch + shift to zoom 2x."

        s += "\n \ndrag to navigate across the plane."
        s += "\nuse ctrl + shift + arrows to shift by 1 pixel."

        s += "\n \n2x click to reset"
        s += "\nto initial origin and zoom,"
        s += "\n2x click + shift to reset"
        s += "\nthe origin to (0,0) and zoom to 1."
        t.push(s.toUpperCase())

        s = "you can change the pattern size"
        s += "\nby pressing 'f',"
        s += "\nor by pressing the 'framing' button"
        s += "\nin the menu."
        t.push(s.toUpperCase())

        s = "there are several drawing"
        s += "\nmodifiers for a mural."

        s += "\n \nthe default monocrome option has none."
        s += "\nit draws a black dot"
        s += "\nif a formula value"
        s += "\nis below a certain threshold,"
        s += "\nand a white one if it's above it."
        s += "\nmore on the threshold later."

        s += "\n \nthe negative and color options"
        s += "\nare selfexplanatory."
        s += "\nto toggle them, use 'n' and 'c' keys"
        s += "\nor the buttons in the menu."
        t.push(s.toUpperCase())

        s = "infrared doesn't use a threshold."
        s += "\ninstead, it wraps the magnitude"
        s += "\nof a number around"
        s += "\nthe brightness range."
        s += "\nuse 'i' or the button in the menu."

        s += "\n \nsigned option draws"
        s += "\nnegative values darker,"
        s += "\npositive ones brighter,"
        s += "\nand zeros in grey."
        s += "\nuse 's' or the button in the menu."

        s += "\n \noptions combine with each other."
        t.push(s.toUpperCase())

        s = "now for the deeper stuff."

        s += "\n \nformula values can be unevenly"
        s += "\nscattered across any range."
        s += "\nthis range may consist of a few values,"
        s += "\nor of a wide variety of them."

        s += "\n \nin a way, deeper tweaks serve"
        s += "\nas a depth of field and exposition controls,"
        s += "\nhiding some elements and revealing others."

        s += "\n \nif the whole field consists of"
        s += "\nonly a few different values,"
        s += "\nthere's not much that can be changed."

        s += "\n \nif the variety of values is rich,"
        s += "\na tweak can change the feel significantly."
        t.push(s.toUpperCase())

        s = "before the formula values"
        s += "\nare converted to pixels,"
        s += "\nthey are automatically"
        s += "\nevenly scaled and offset"
        s += "\nto make a mural more interesting."

        s += "\n \nthere are separate scaling factors"
        s += "\nand offsets for brightness and hue."

        s += "\n \nfor the original monochrome mural,"
        s += "\nbrightness offset serves as a threshold"
        s += "\nfor drawing, as mentioned above."

        s += "\n \nfor the infrared option, brightness factor"
        s += "\nadds more contrast brightness jumps."
        t.push(s.toUpperCase())

        s = "in color mode,"
        s += "\nhue factor makes a mural more colorful,"
        s += "\nwhereas the offset just shifts the hue."

        s += "\n \nto tweak the brightness factor,"
        s += "\nuse ctrl + up/down arrows."
        s += "\nfor the offset"
        s += "\nuse ctrl + left/right arrows."

        s += "\n \nto tweak hue params,"
        s += "\nuse shift + arrows instead."

        s += "\n \nto reset brightness factor to 1"
        s += "\nand offset to 0, press '0'."

        s += "\n \nto reset hue params, press '9'."
        t.push(s.toUpperCase())

        s = "the formula is a binary tree."

        s += "\n \nevery node can have"
        s += "\nan operand, or a subtree."
        s += "\nthe two branches of the subtree"
        s += "\nhave an operation"
        s += "\nto which they are the operands."

        s += "\n \na node may contain a function,"
        s += "\na pair of surrounding brackets,"
        s += "\na scaling factor, and an offset."
        s += "\n(the latter two aren't related"
        s += "\nto the drawing options)"

        s += "\n \nthe values of all these properties"
        s += "\nare random."
        t.push(s.toUpperCase())

        s = "the probabilities for the random choices"
        s += "\nare set with the sliders."

        s += "\n \nsome groups of sliders are equalized,"
        s += "\nbecause they are mutually exclusive."
        s += "\ne.g. there's only one function per node,"
        s += "\nso when you increase the probability of sqrt,"
        s += "\nall the other function probs get lower."

        s += "\n \n2x click on a slider"
        s += "\nto reset it to its default value."
        s += "\nshift + 2x click to reset all sliders."
        t.push(s.toUpperCase())

        s = ("some less obvious slider functions:").toUpperCase()

        s += "\n \nd - "
        s += ("approximate depth of the formula tree.").toUpperCase()
        s += ("\n\t\tcpu use increases exponentially.").toUpperCase()

        let s2
        s2 = "\n \n[] - approximate magnitude"
        s2 += "\n\t\tof generated factors, offsets"
        s2 += "\n\t\tand numeric parameters"
        s2 += "\n\t\tof user functions"
        s2 += "\n\t\t(more on that later)"
        s += s2.toUpperCase()

        s += "\n \na - " + ("factor prob.").toUpperCase()
        s += "\ns - " + ("offset prob.").toUpperCase()

        s2 = "\n \nB/A - prevalence of bitwise"
        s2 += "\n\t\tor algebraic operations"
        s += s2.toUpperCase()

        s2 = "\n \nF - prob. of using a function"
        s2 += "\nT/U - prevalence of transcendental"
        s2 += "\n\t\tor user functions"
        s += s2.toUpperCase()
        t.push(s)

        s = "you can type in up to 4 user functions"
        s += "\nin the text fields above the sliders."

        s += "\n \nsupported functions are"
        s += "\nsin, cos, tan and their inverse"
        s += "\nand hyperbolic versions,"
        s += "\nlog, log2, log10, pow, exp,"
        s += "\nmin, max, ceil, floor, round,"
        s += "\ntrunc, abs, sign, sqrt, cbrt,"
        s += "\nrandom, clz32, imul, and hypot"
        s += "\n(all lower case)."

        s += "\n \navailable constants are"
        s += "\nPI, E, LN2, LN10, LOG2E, LOG10E,"
        s += "\nSQRT2 and SQRT1_2"
        s += "\n(all upper case)."
        t.push(s.toUpperCase())

        s = "available arguments"
        s += "\nfor user functions are"
        s += "\nx, y,"
        s += "\nx0, y0 (origin),"
        s += "\nw, h (width and height of the pattern),"
        s += "\nz (zoom),"
        s += "\ngen (token for generating"
        s += "\na subexpression)."

        s += "\n \nthere are also 8 numeric params,"
        s += "\nfrom a to h (lowercase)"
        s += "\nto use as factors, offsets, etc."
        s += "\nthese are being regenerated"
        s += "\nfor every new pattern."

        s += "\n \nexamples of a valid user function:"
        s = s.toUpperCase()
        s += "\n \na * sin(x/PI) + pow(x%50, 2)"
        s += "\n \ncosh(y) >> atanh(x) <= 1024 + 10 * random"
        s += "\n \ngen + (y%100 < 50) ? 0 : sin(gen)"
        t.push(s)

        s = "a formula can be mutated"
        s += "\nby pressing 'm'."
        s += "\nsome random property"
        s += "\nof one or several nodes will change,"
        s += "\nbased on set probabilities."

        s += "\n \nas with hue and brightness tweaks,"
        s += "\nthe degree of mutation varies a lot."

        s += "\n \nwhen you mutate a mural,"
        s += "\nit is bookmarked,"
        s += "\nand the new one is appended"
        s += "\nat the end of the history."
        s += "\nyou can go back to the original"
        s += "\nwith left arrow "
        t.push(s.toUpperCase())

        s = "if you want to mutate not random,"
        s += "\nbut a specific property,"
        s += "\nuse keys 1-6:"

        s += "\n \n1 - numeric properties"
        s += "\n2 - operands (randomize / replace)"
        s += "\n3 - functions (add / del / replace)"
        s += "\n4 - tree operation"
        s += "\n5 - branch (add / del / swap / replace)"
        s += "\n6 - brackets."

        t.push(s.toUpperCase())

        s2 = "if you want to share a picture,"
        s2 += "\nplease use hashtag "
        s = s2.toUpperCase() + "#bit_murals"

        s2 = "\n \nfor commercial use"
        s2 += "\nemail bitmurals@gmail.com"

        s2 += "\n \nBM uses p5.js and lzwcompress.js libs."
        s += s2.toUpperCase()
        //s += "\n \n if you want to support the project,"
        //s += "\nyou can purchase nfts here"

        s2 = "\n \nhave fun"
        s2 += "\n \nEugene Yakshin, 2021"
        s2 += "\n \nCC BY-NC 3.0"
        s += s2.toUpperCase()
        t.push(s)
    }


}