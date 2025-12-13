// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class FramingRect {
    constructor (w = -1, h = -1, name = "no name", fullscreen = false) {
        this.rect = new Rectangle (w, h);
        this.name = name;
        this.fullscreen = fullscreen
    }
}



class Layout {
    constructor(){
        this._W = 0
        this._H = 0

        this._patternRect   = new Rectangle()
        this._patternArea   = new Rectangle()
        this._controlArea   = new Rectangle()
        this._userInputArea = new Rectangle()
        this._slidersArea   = new Rectangle()
        this._infoRect      = new Rectangle()
        this._numUserInputs = 0
        this._numSliders = 0
        this._userRects = []
        this._slidersRects = []

        this._patternFramings = [
            new FramingRect(256, 256, "256 square", false)
            ,new FramingRect(300, 300, "300 square", false)
            ,new FramingRect(350, 350, "350 square", false)
            ,new FramingRect(400, 400, "400 square", false)
            ,new FramingRect(450, 450, "450 square", false)
            ,new FramingRect(512, 512, "512 square", false)
            ,new FramingRect(1024, 1024, "1024 square", false)
            ,new FramingRect(-1, -1, "fullscreen", true)
            ,new FramingRect(1920, 1080, "1080p", true)
            //,new FramingRect(3840, 2160, "4K", true)
            //new FramingRect(7680, 4320, "8K", true)
        ]
        this._currFramingId = 3

        this._toggleHelpRect = new Rectangle()
        this._patternTouchRects = {
            prev     : new Rectangle(),
            next     : new Rectangle(),
            panZoom  : new Rectangle(),
            mutate   : new Rectangle(),
            randomize: new Rectangle()
        }
        this._menuTouchRects = {
            slideshow  : new Rectangle(),
            framing    : new Rectangle(),
            save       : new Rectangle(),
            load       : new Rectangle(),
            infrared   : new Rectangle(),
            negative   : new Rectangle(),
            color      : new Rectangle(),
            signed     : new Rectangle()
        }
        this._tourRects = {
            prev : new Rectangle(),
            next : new Rectangle(),
            close: new Rectangle(),
            text : new Rectangle()
        }

        this._drawControls  = true
        this._drawUserInput = true
        this._controlsHidePixelsThresh = 256
        this._controlsHideProportionThresh = 5/4

        this._txtSize = 12
        this._touchTextSize = 16
        this.l = new Logger("Layout")
    }


    setWidthAndHeight(w, h) {
        w = Math.floor(w)
        h = Math.floor(h)
        if (w !== this._W || h !== this._H) {
            this.l.log("set w & h:", w, h)
            this._W = w
            this._H = h
            return true
        }
        return false
    }


    setNumUserInputs(n) {
        this.l.logc("num user inputs:", n)
        this._numUserInputs = n
    }


    setNumSliders(n)    {
        this.l.logc("num sliders:", n)
        this._numSliders = n
    }


    recalc(all) {
        this.l.logc("recalc")
        this.decideWhatLayoutPartsToShow()
        const patternUpd = this.placePattern()
        this.placeToggleHelpRect()
        this.placePatternTouchRects()
        this.placeMenuTouchRects()
        this.placeTourRects()
        if (!this.getShowOnlyPattern() || all)
            this.placeControls()
        else
            this.clearControlRects()
        this.placeInfoRect()
        this.l.loge()
        return patternUpd
    }


    decideWhatLayoutPartsToShow(){
        const w = this._W
        const h = this._H
        const max = Math.max(w, h)
        const min = Math.min(w, h)
        if (this.patternIsFullscreen()
            || w < this._controlsHidePixelsThresh
            || h < this._controlsHidePixelsThresh
            || max/min < this._controlsHideProportionThresh) {

            this._drawControls  = false
            this._drawUserInput = false
            this.l.log("controls and user functions are hidden")
        }
        else {
            this._drawControls  = true
            this._drawUserInput = true
            this.l.log("showing controls and user functions")
        }
    }


    currentFraming() { return this._patternFramings[this._currFramingId] }


    placePattern() {
        this.l.log("placing pattern")
        
        let pA
        let pR
        const w = this._W
        const h = this._H

        const fr = this.currentFraming()

        if (this.patternIsFullscreen()) {
            if (fr.rect.W() == -1) {
                pA = new Rectangle(w, h)
                pR = pA.copy()
            }
            else {
                pA = new Rectangle(Math.min(w, fr.rect.W()), Math.min(h, fr.rect.H()))
                pR = fr.rect.copy()
            }
        }

        else {
            const a = Math.min(w, h)
            pA = new Rectangle(a, a)

            let s = fr.rect.W()
            pR = new Rectangle(s, s)
            const off = s < pA.W() ? Math.floor((pA.W() - pR.W()) / 2) : 0
            pR.setOffsets(off, off)
        }

        let updated = false
        if (pR.equalWH(this._patternRect))
            this.l.log("same pattern rect")
        else {
            this.l.log("new pattern rect:", pR.log())
            updated = true
        }

        this._patternRect = pR
        this._patternArea = pA

        return updated
    }

    placeToggleHelpRect() {
        // always in top-left
        const a = 1/4
        let r = this._patternArea.copy()
        const side = a * Math.min(r.W(), r.H())
        r._w = side
        r._h = side
        this._toggleHelpRect = r
    }

    placePatternTouchRects() {
        let r = this._patternArea.copy()
        r._h -= this._toggleHelpRect.H() - 1
        r._oY = this._toggleHelpRect.B() + 1

        const prevNextW = 1/4

        let pr = r.copy()
        pr._w *= prevNextW
        this._patternTouchRects.prev = pr

        let pz = pr.copy()
        pz._oX = pr.R() + 1
        pz._w = r.W() * prevNextW * 2 - 1
        this._patternTouchRects.panZoom = pz

        let nr = pr.copy()
        nr._oX = pz.R() + 1
        this._patternTouchRects.next = nr

        let mr = this._toggleHelpRect.copy()
        mr._oX = nr._oX
        mr._w = nr._w
        this._patternTouchRects.mutate = mr

        let rr = mr.copy()
        rr._oX = mr.L() - mr.W() + 1
        rr._w = mr._w
        this._patternTouchRects.randomize = rr
    }

    placeMenuTouchRects() {
        const pr = this._patternArea
        const w = pr.W()/4
        const h = pr.H()/4
        const buttonRect = new Rectangle(w - 1, h - 1, 0, 2 * h + 1)

        let mtrs = this._menuTouchRects

        mtrs.load      = buttonRect.copy()
        mtrs.save      = mtrs.load.getShiftedBy(0, h + 1)
        mtrs.slideshow = mtrs.load.getShiftedBy(w + 1, 0)
        mtrs.framing   = mtrs.save.getShiftedBy(w + 1, 0)

        mtrs.infrared = mtrs.load.getShiftedBy(2 * w + 1, 0)
        mtrs.colored  = mtrs.infrared.getShiftedBy(0, h + 1)
        mtrs.negative = mtrs.infrared.getShiftedBy(w + 1, 0)
        mtrs.signed   = mtrs.colored.getShiftedBy(w + 1, 0)
    }


    placeTourRects(){
        const pr = this._patternArea
        const w = Math.min(80, pr.W() / 6)
        const h = Math.min(pr.H() / 12, 30)
        const s = Math.min(w, h) / 2
        const m = Math.max(w, h) + 2 * s
        
        const buttonRect = new Rectangle(w, h, m, pr.B() - m - h)
        let trs = this._tourRects
        trs.prev = buttonRect.copy()
        trs.next = trs.prev.getShiftedBy(w + s, 0)
        trs.close = trs.next.getShiftedBy(w + s, 0)
        
        trs.text = new Rectangle(pr.W() - m, pr.H() - m, m, m)
    }



    placeControls(){
        this.l.logg("placing controls")
        this.placeCommonControlAreaRect()
        this.placeUserRects()
        this.placeSliderRects()
        this.l.loge()
    }


    placeCommonControlAreaRect(){
        this.l.logg("placing control area rect")
        const w = this._W
        const h = this._H
        let cW, cH, coX, coY

        if (this.generalLayoutOrientation() === 'h'){
            cH = h
            cW = Math.min(cH * this._controlsHideProportionThresh,
                           w - this._patternArea.W() - 1)
            coX = this._patternArea.R() + 1
            coY = 0
        }
        else {
            cW = w
            cH = Math.min(cW * this._controlsHideProportionThresh,
                          cH = h - this._patternArea.H())
            coX = 0
            coY = this._patternArea.B() + 1
        }

        const controlsR = new Rectangle(cW, cH, coX, coY)
        if (controlsR.equalWH(this._controlArea)) {
            this.l.log("same controls area")
            this.l.loge()
            return
        }

        this._controlArea = controlsR
        this.l.log("common control area:", controlsR.log())
        this.l.loge()
    }


    placeInfoRect() {
        this.l.log("placing info rect")
        let r
        let voff = 0
        let h = this._txtSize * 16
        const m = 10
        if (this.getDrawControls()){
            r = this._userInputArea
            voff = r.B() + m
        }
        else {
            r = this._patternArea
            voff = r.B() - m - h
        }
        
        this._infoRect = new Rectangle(r.W() - 2 * m, h,
            r.L() + m, voff)
    }


    placeUserRects(){
        this.l.logg("placing user input rects")

        const [oX, oY] = (this.generalLayoutOrientation() === 'v') ?
              [0, this._patternArea.H() + 1]
            : [this._patternArea.W() + 1, 0]

        const uiH = this.userInputHeight()
        const n = this._numUserInputs

        const commonW = this._controlArea.W()
        const proportion = commonW / this._controlArea.H()
        this.l.log("proportion:", proportion)

        if (proportion > 2.5) {
            this.l.log("placing in 1 row")
            this._userInputArea = new Rectangle(commonW, uiH, oX, oY)
            const r = new Rectangle(commonW/4, uiH, oX, oY)
            for (let i = 0; i < n; ++i)
                this._userRects[i] = r.getShiftedBy(i * commonW/4, 0)
        }
        else if (proportion > 1.25){
            this.l.log("placing in 2 rows")
            this._userInputArea = new Rectangle(commonW, 2 * uiH, oX, oY)
            const r = new Rectangle(commonW/2, uiH, oX, oY)
            for (let i = 0; i < n; ++i)
                this._userRects[i] = r.getShiftedBy((i % 2) * commonW/2,
                                                    (Math.floor(i/2)) * uiH)
        }
        else {
            this.l.log("placing in 4 rows")
            this._userInputArea = new Rectangle(commonW, 4 * uiH, oX, oY)
            const r = new Rectangle(commonW, uiH, oX, oY)
            for (let i = 0; i < n; ++i)
                this._userRects[i] = r.getShiftedBy(0, i * uiH)
        }


        for (const r of this._userRects) {
            this.l.assert(r.isValid())
            //this.l.log("user rect", r.log())
        }
        this.l.loge()
    }


    placeSliderRects(){
        this.l.logg("placing slider rects")

        const ca = this._controlArea
        const commonW = ca.W()
        const commonH = ca.H()
        const commonOX = ca.L()
        const commonOY = ca.T()

        const soY = this._userInputArea.B() + 1

        const areaW = commonW
        const areaH = Math.max(0, commonH - this._userInputArea.H())
        const proportion = areaW / areaH
        this.l.log("proportion:", proportion)

        const n = this._numSliders

        if (proportion >= 1) {
            this.l.log("vertical sliders")
            const w = areaW / n
            const r = new Rectangle(w, areaH, commonOX, soY)
            for (let i = 0; i < n; ++i)
                this._slidersRects[i] = r.getShiftedBy(i * w, 0)
        }
        else {
            this.l.log("horizontal sliders")
            const h = areaH / n
            const r = new Rectangle(areaW, h, commonOX, soY)
            for (let i = 0; i < n; ++i)
                this._slidersRects[i] = r.getShiftedBy(0, i * h)
        }

        for (let i = 0; i < n; ++i)
            this.l.assert(this._slidersRects[i].isValid())

        this._slidersArea = new Rectangle(commonW, commonH, commonOX, commonOY)
        this._slidersArea._oY += this._userInputArea.H()
        this._slidersArea._h -= this._userInputArea.H()
        this.l.assert(this._slidersArea.isValid())

        this.l.loge()
    }


    clearControlRects() {
        this._controlArea.clear()
        this._userInputArea.clear()
        this._slidersArea.clear()
        this._userRects.forEach(r => r.clear())
        this._slidersRects.forEach(r => r.clear())
    }



    nextPatternFraming() {
        let i = this._currFramingId
        i = (i + 1) % this._patternFramings.length
        const fr = this._patternFramings [i]
        this.l.log("pattern framing rect:", fr.name)
        this._currFramingId = i
    }


    getCurrentFramingName() { return this.currentFraming().name }


    patternIsFullscreen() { return this.currentFraming().fullscreen }


    getShowOnlyPattern() {
        return !(this._drawControls && this._drawUserInput)
    }


    generalLayoutOrientation(){ return (this._W >= this._H) ? 'h' : 'v' }
    individualSliderOrientation() {
        const r = this._slidersRects[0]
        return (r.W() >= r.H()) ? 'h' : 'v'
    }

    getDrawControls() { return this._drawControls }

    pointInToggleHelpZone(x, y) { return this._toggleHelpRect.contains(x, y) }
    pointInSlidersZone(x, y)    { return this._slidersArea.contains(x, y) }
    pointInPatternRect(x, y)    { return this._patternRect.contains(x, y) }
    pointInPatternArea(x, y)    { return this._patternArea.contains(x, y) }
    pointInUserInputZone(x, y)  { return this._userInputArea.contains(x, y) }

    pointInPanZoomZone(x, y)         { return this._patternTouchRects.panZoom.contains(x, y) }
    pointInMutateZone(x, y)          { return this._patternTouchRects.mutate.contains(x, y) }
    pointInRandomizeZone(x, y)       { return this._patternTouchRects.randomize.contains(x, y) }
    pointInPrevPatternZone(x, y)     { return this._patternTouchRects.prev.contains(x, y) }
    pointInNextPatternZone(x, y)     { return this._patternTouchRects.next.contains(x, y) }
    pointInToggleSlideshowZone(x, y) { return this._menuTouchRects.slideshow.contains(x, y) }
    pointInToggleFramingZone(x, y)   { return this._menuTouchRects.framing.contains(x, y) }

    pointInToggleSaveZone(x, y)     { return this._menuTouchRects.save.contains(x, y) }
    pointInToggleLoadZone(x, y)     { return this._menuTouchRects.load.contains(x, y) }
    pointInToggleColorZone(x, y)    { return this._menuTouchRects.colored.contains(x, y) }
    pointInToggleInfraredZone(x, y) { return this._menuTouchRects.infrared.contains(x, y) }
    pointInToggleNegativeZone(x, y) { return this._menuTouchRects.negative.contains(x, y) }
    pointInToggleSignedZone(x, y)   { return this._menuTouchRects.signed.contains(x, y) }


    getUserInputIdUnderPoint(x, y) {
        const ui = this._userRects
        for (let i = 0; i < ui.length; ++i)
            if (ui[i].contains(x, y))
                return i
        return -1
    }


    patternArea() { return this._patternArea.copy() }
    patternAreaW() { return this._patternArea.W() }

    getPatternRectOffsets() { return [this._patternRect.L(), this._patternRect.T()] }
    getPatternRectWH() { return [this._patternRect.W(), this._patternRect.H()] }

    getSliderRect(i) { return this._slidersRects[i] }
    getUserInputRect(i) { return this._userRects[i] }

    getControlAreaRect() { return this._controlArea }
    getSlidersArea() { return this._slidersArea }
    getInfoRect() { return this._infoRect }

    getTourButtonsRects() { return this._tourRects }

    userInputHeight() { return 1.5 * this._txtSize }


    drawDebugRects(g){
        g.push()
        g.strokeWeight(5)
        this.drawPatternRects(g)

        if (!this.getDrawControls()) {
            g.pop()
            return
        }

        this.drawControlAreaRect(g)
        this.drawSliderRects(g)
        this.drawUserRects(g)
        this.drawInfoRect(g)

        g.pop()
    }


    drawPatternRects(g) {
        g.push()
        g.noFill()
        const pR = this._patternRect
        const pA = this._patternArea
        g.stroke(100, 255, 255)
        g.rect(pR.L(), pR.T(), pR.W(), pR.H())
        g.stroke(100, 200, 200)
        g.rect(pA.L(), pA.T(), pA.W(), pA.H())
        g.noStroke()
        g.fill(40, 100)
        g.rect(pA.L(), pA.T(), pA.L() + 80, pA.T() + 40)
        g.fill(100, 255, 255)
        g.text("pa: " + pA.W() + " * " + pA.H(), pA.L() + 5, pA.T() + 15)
        g.text("pr: " + pR.W() + " * " + pR.H(), pA.L() + 5, pA.T() + 35)
        g.text("pr off: " + pR.L() + ", " + pR.T(), pA.L() + 5, pA.T() + 55)
        g.pop()
    }


    drawControlAreaRect(g) {
        g.push()
        const cR = this._controlArea
        g.fill(200, 255, 255, 20)
        g.stroke(200, 255, 255)
        //g.fill(200, 255, 255)
        g.strokeWeight(3)
        g.rect(cR.L(), cR.T(), cR.W(), cR.H())
        g.fill(200, 255, 255)
        g.noStroke()
        g.text(cR.W() + " * " + cR.H(), this._patternArea.L() + 5, cR.T() - 5)
        g.pop()
    }


    drawSliderRects(g) {
        g.push()
        g.stroke(50, 255, 255)
        g.strokeWeight(1)
        g.noFill()
        for (let i = 0; i < this._numSliders; ++i) {
            const r = this._slidersRects[i]
            //g.fill(50, 255, 255, 20 + 5 * i)
            g.rect(r.L(), r.T(), r.W(), r.H())
            g.text(i, r.L() + 5, r.T() + 5)
        }
        const rs0 = this._slidersRects[0]
        g.noStroke()
        g.fill(0, 255, 255)
        g.text(Math.round(rs0.W()) + "*" + Math.round(rs0.H()), rs0.L() + 5, rs0.T() + 15)
        g.pop()
    }


    drawUserRects(g){
        g.push()
        g.stroke(150, 255, 255)
        g.strokeWeight(1)
        g.noFill()
        for (let i = 0; i < this._numUserInputs; ++i) {
            const r = this._userRects[i]
            //g.fill(150, 255, 255, 20 + 2 *i)
            g.rect(r.L(), r.T(), r.W(), r.H())
            g.text(i, r.L() + 5, r.T() + 10)
        }
        g.pop()
    }


    drawInfoRect(g) {
        g.push()
        const iR = this._infoRect
        g.stroke(100, 255, 255)
        g.strokeWeight(1)
        g.fill(100, 255, 255, 10)
        g.rect(iR.L(), iR.T(), iR.W(), iR.H())
        g.pop()
    }
}