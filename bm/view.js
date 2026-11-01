// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class View {

    constructor(p5){
        this._g = p5
        this._pattern    = null
        this._controller = null
        this._layout     = new Layout()
        this._info = new Info()
        this._slideshow = new Slideshow()
        this._panZoomController = new PanZoomController()
        this._colorController = new PatternColorController()
        this._sliders    = []
        this._touchZones = {}
        this._userInputs = []
        this._noiseCanvas = null
        this._noiseCanvasSide = 500
        this._panning       = false
        this._drawGrids     = false
        this._settingSlider = false
        this._editingUserInput = false
        this._lastEditedUserInput = -1
        this._lastReframingMoment = 0
        this._showHelp = false
        this._tour = new Tour()
        this._showTour = false
        this._drawDebugInfo = false
        this._txtSize = 12
        this._clickX = 0
        this._clickY = 0
        this._patternDebugVal = null
        this._importExport = new ImportExport(p5)
        this.l = new Logger("View")
        //this.l.setActive(false)
    }


    setup(pattern, controller, w, h){
        this.l.logg("setup")

        this.l.assert(typeof pattern !== "undefined")
        this.setPattern(pattern)
        this._panZoomController.setPattern(pattern)
        this._colorController.setPattern(pattern)
        this._colorController.updateColorFunction()

        this.setController(controller)
        this._controller.setColorController(this._colorController)

        this._pattern.setDoneCallback(() => { this.onPatternDone() })

        this.createNoiseCanvas()
        this.createSliders()
        this.createTouchZones()
        this.createUserInputs()
        this.setWidthAndHeight(w, h)
        this.updateLayout(true)

        this._info.setFraming(this._pattern.getFraming())
        this._info.setDrawingOptions(this._colorController.getDrawingOptions())
        this._info.setTxtSize(this._txtSize)

        this.onPatternChange()

        this._tour.setOnCloseCallback(() => { this._showTour = false })
        setTimeout(() => { this._showTour = true; }, 2000);

        // TODO баг: после первой остановки слайдшоу не сохраняется польз. функция
        this._slideshow.setNextPatternCallback(() => {
            if (!this._pattern.done())
                return false
            this.jumpToAnotherPattern(() => this._controller.nextPattern())
            return true
        })
        setTimeout(()=> { this.toggleSlideshow() }, 2000)

        this.l.loge()
    }


    setPattern(p) {
        this.l.log("set pattern")
        this.l.assert(typeof p !== "undefined")
        this._pattern = p
    }


    setController(c) {
        this.l.log("set controller")
        this.l.assert(typeof c !== "undefined")
        this._controller = c
    }


    onPatternChange() {
        this._info.setFormulaString(this._controller.getReadableFormula())
        this._info.setPatternNum(this._controller.getPatternNumber())
        this._info.updateDrawingOptionsString()
        this._info.updateFramingString()
        this.startRedrawPattern()
    }


    createNoiseCanvas() {
        let n = this._g.createGraphics(this._noiseCanvasSide, this._noiseCanvasSide)
        n.colorMode(n.HSB, 255)
        this._noiseCanvas = n
        this.fillNoiseCanvas()
    }


    fillNoiseCanvas(){
        let n = this._noiseCanvas
        n.clear()
        let fill = (p, c, a) => {
            for (let i = 0; i < n.width; ++i)
		        for (let j = 0; j < n.height; ++j)
                    if (Math.random() < p) {
                        const r = Math.random()
                        n.stroke(c, a * r)
		        	    n.point(i, j)
                }
            }
        fill(0.5, 0, 25)
        fill(0.1, 255, 20)
    }


    createSliders(){
        this.l.logc("create sliders")
        const params = this._controller.getParamKeysAndValues()
        let s = this._sliders
        let n = 0
        for (let [k, v] of params) {
            s[n] = new Slider(k, this._g.textSize(), v)
            ++n
        }
        this._layout.setNumSliders(this.numSliders())
        this.l.loge()
    }


    createUserInputs(){
        let ui = this._userInputs
        this.l.assert(ui.length == 0)
        const n = this._controller.getNumUserFunctions()
        this._layout.setNumUserInputs(n)
        const subs = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"]
        for (let i = 0; i < n; ++i) {
            ui[i] = this._g.createInput()
            this.resetUserInputStyle(i)
            ui[i].input( ()=> { this.recordUserInputId(i) } )
            ui[i].elt.onblur = ()=> { this.stopEditingUserInput(); this.checkUserInput(i) }
            ui[i].elt.onfocus = ()=> { this._editingUserInput = true }
            ui[i].elt.placeholder = ' f' + subs[i]
        }
    }


    recordAndCheckUserInputOnSuddenFocusChange(){
        const i = this._lastEditedUserInput
        this.stopEditingUserInput()
        this.checkUserInput(i)
    }


    setUserFunctionsToInputFields(){
        this.l.logg("setting user functions from controller")
        const ufs = this._controller.getReadableUserFunctions()
        this._userInputs.forEach( (input, i) => {
            this.l.log(i, ":", ufs[i])
            input.elt.value = ufs[i] } )
        this.l.loge()
    }


    setUserInputVisibility(v){
        if (v)
            this._userInputs.forEach(i => i.show())
        else
            this._userInputs.forEach(i => i.hide())
    }


    recordUserInputId(i){
        if (i != this._lastEditedUserInput && this._lastEditedUserInput >= 0)
            this.checkUserInput(this._lastEditedUserInput)
        this._lastEditedUserInput = i
        this.setUserInputColor(i, this._g.color(200))
        this.l.log("edit user input", i)
    }


    stopEditingUserInput(){
        this._editingUserInput = false
        this._lastEditedUserInput = -1
    }


    checkUserInput(i){
        if (i < 0)
            return
        const uf = this._userInputs[i].value()
        this.l.log("check user input", i, ':', uf.length ? uf : "empty")
        const ok = this._controller.checkAndSetUserFunction(i, uf)
        let g = this._g
        if (ok)
            this.setUserInputColor(i, g.color(200))
        else
            this.setUserInputColor(i, g.color(0, 200, 200))
    }


    resetUserInputStyle(i){
        let ui = this._userInputs
        this.l.assert(i < ui.length)
        ui[i].style('border-top-width', '0px')
        ui[i].style('border-bottom-width', '0px')
        ui[i].style('border-left-width', '0px')
        ui[i].style('border-right-width', '0px')
        ui[i].style('outline', 'none')
        ui[i].style('background-color',  this._g.color(0, 0))
        this.setUserInputColor(i, this._g.color(150))
    }


    setUserInputColor(i, txtc) { this._userInputs[i].style('color', txtc) }


    createTouchZones(){
        this._touchZones = {
            menu       : new TouchZone("MENU", "[ O ]"),
            prev       : new TouchZone("  PREV  ", "[ ◄ ]"),
            next       : new TouchZone("  NEXT  ","[ ► ]"),
            mutate     : new TouchZone("MUTATE","[ M ]"),
            randomize  : new TouchZone("RANDOMIZE", "[ R ]"),
            panZoom    : new TouchZone("  PAN / ZOOM  "),
            slideshow  : new TouchZone("SLIDESHOW", "[ A ]"),
            framing    : new TouchZone("FRAMING", "[ F ]"),
            save       : new TouchZone("SAVE", "[ ▼ ]\npicture and settings"),
            load       : new TouchZone("LOAD",  "[ ▲ ]\nyou can use\ndrag'n'drop"),
            infrared   : new TouchZone("INFRARED", "[ I ]"),
            negative   : new TouchZone("NEGATIVE", "[ N ]"),
            colored    : new TouchZone("COLOR", "[ C ]"),
            signed     : new TouchZone("SIGNED", "[ S ]")
        }

        let tz = this._touchZones

        const pztxt = "drag / wheel\n2x click - reset pan and zoom"
                    + "\n2x click + SHIFT - reset to [0, 0, 1]"
                    + "\nwheel + CTRL - zoom slowly"
                    + "\nwheel + SHIFT - zoom by 2"
        tz.panZoom.setSubtext(pztxt)

        Object.values(tz).forEach(
            z => z.setColor({H: 0, S: 0, B: 240, A: 110}))

        tz.menu.setPressed(true)
        tz.slideshow.setPressed(this._slideshow.isPlaying())
        this.updateTouchZonesForPatternDrawingOptions()
    }


    updateTouchZonesForPatternDrawingOptions(){
        let tz = this._touchZones
        const d = this._colorController.getDrawingOptions()
        tz.infrared.setPressed(d.infrared)
        tz.negative.setPressed(d.negative)
        tz.colored.setPressed(d.colored)
        tz.signed.setPressed(d.signed)
    }


    setWidthAndHeight(w, h) {
        this._layout.setWidthAndHeight(w, h)
    }


    updateLayout(updateAll){
        const l = this._layout
        const patternUpd = l.recalc(updateAll)

        if (patternUpd) {
            this.startRedrawPattern()
            const [w, h] = l.getPatternRectWH()
            this._pattern.setWidthAndHeight(w, h)
        }

        this.updateSlidersRects()
        this.updateUserInputsRects()
        this.updateTouchZonesRectsAndTextSize()
        this._info.setRect(l.getInfoRect())
        this._info.setDrawOnFullscreen(this._layout.getShowOnlyPattern())
        this._tour.onResize(l.patternAreaW(), l.getTourButtonsRects())
    }


    updateUserInputsRects(){
        let ui = this._userInputs
        for (let i = 0; i < ui.length; ++i){
            const r = this._layout.getUserInputRect(i)
            ui[i].position(r.L(), r.T())
            ui[i].size(r.W(), r.H())
        }
        this.setUserInputVisibility(!this._layout.getShowOnlyPattern())
    }


    updateSlidersRects(){
        for (let i = 0; i < this.numSliders(); ++i)
            this._sliders[i].setRect(this._layout.getSliderRect(i))
    }


    updateTouchZonesRectsAndTextSize(){
        const tz = this._touchZones
        // TODO здесь и в layout мэп с доступом по лэйблу?
        // или геттеры
        const l = this._layout
        const ptz = l._patternTouchRects
        const mtz = l._menuTouchRects
        tz.menu      .setRect(l._toggleHelpRect)
        tz.prev      .setRect(ptz.prev)
        tz.next      .setRect(ptz.next)
        tz.mutate    .setRect(ptz.mutate)
        tz.randomize .setRect(ptz.randomize)
        tz.panZoom   .setRect(ptz.panZoom)
        tz.slideshow .setRect(mtz.slideshow)
        tz.framing   .setRect(mtz.framing)
        tz.save      .setRect(mtz.save)
        tz.load      .setRect(mtz.load)
        tz.infrared  .setRect(mtz.infrared)
        tz.negative  .setRect(mtz.negative)
        tz.colored   .setRect(mtz.colored)
        tz.signed    .setRect(mtz.signed)

        const ts = Math.min(16, this._layout.patternAreaW() / 24)
        Object.values(this._touchZones).forEach(z => {
            z.setTextSize(ts)
            z.setBorderWidth(ts/2)
        })
    }


    getPatternImage() {
        const [w, h] = this._pattern.getWidthAndHight()
        let ic = this._g.createGraphics(w, h)
        this._pattern.finishNow()
        this._pattern.getBitmap().drawTo(ic.drawingContext, 0, 0)
        this.drawNoise(ic, ic.width, ic.height)
        let img = ic.get()
        return img
    }


    numSliders() { return this._sliders.length}


    draw(){
        const oldPpr = this._pattern.getPercentReady()

        this._g.push()
        this.drawPattern()

        if (this._layout.getDrawControls())
            this.drawControls()

        this.drawInfo()

        if (this._drawGrids) {
            this.drawGrids()
            this.drawPanningShift()
        }

        if (this._g.frameCount - this._lastReframingMoment < this._g.frameRate() * 2)
            this.drawPatternFramingName()

        if (this._showHelp)
            this.drawHelp()

        if (this._showTour)
            this._tour.draw(this._g)

        this.drawNoise(this._g, this._g.width, this._g.height)

        if (this._drawDebugInfo)
            this.drawDebugInfo()

        if ((this._g.frameCount < this._g.frameRate() * 1.2) // blink help for user
            && (this._g.frameCount % 12 < 6))
            this._touchZones.menu.draw(this._g)

        this._g.pop()

        const newPpr = this._pattern.getPercentReady()
        if (oldPpr != newPpr)
            this._info.setPercentReady(newPpr)
    }


    drawPattern(){
        this._pattern.draw()
        const [ox, oy] = this._layout.getPatternRectOffsets()
        this._pattern.getBitmap().drawTo(this._g.drawingContext, ox, oy)
    }


    drawPatternFramingName(){
        let g = this._g
        g.push()
        const name = this._layout.getCurrentFramingName()
        const ts = this._txtSize
        let w = name.length * ts * 0.8
        let h = ts * 2
        let ox = ts
        let oy = this._layout.patternArea().B() - 2 * h
        g.textSize(ts)
        g.fill(40)
        g.noStroke()
        g.rect(ox, oy, w, h)
        g.fill(240)
        g.textAlign(g.CENTER, g.CENTER)
        g.text(name, ox + w/2, oy + h/2)
        g.pop()
    }


    drawNoise(destCanvas, areaW, areaH){
        const nSide = this._noiseCanvasSide
        const d = 50 // чтобы разброс рандома был побольше и шум не "застывал"
        const m = nSide / d
        const x0 = Math.ceil(Math.random() * m) * d
        const y0 = Math.ceil(Math.random() * m) * d

        let filledH = 0
        let destW = 0;

        let fillLine = (dy) => {
            let filledW = 0
            let destH = Math.min(nSide, areaH - (filledH - y0))
            while (filledW - x0 < areaW) {
                destW = Math.min(nSide, areaW - (filledW - x0))
                destCanvas.image(this._noiseCanvas,
                             -x0 + filledW, dy - y0,
                             destW, destH,
                             0, 0,
                             destW, destH)
                filledW += destW
            }
            return destH
        }

        while (filledH - y0 < areaH)
            filledH += fillLine(filledH)
    }


    startRedrawPattern(){
        this._info.setDrawingStatus(true)
        this._pattern.startRedraw()
    }


    drawInfo() {
        this._info.draw(this._g)
    }


    drawPanningShift(){
        let g = this._g
        g.push()
        g.strokeWeight(6)
        g.stroke(240)
        g.line(this._clickX, this._clickY, g.mouseX, g.mouseY)
        g.strokeWeight(4)
        g.stroke(40)
        g.line(this._clickX, this._clickY, g.mouseX, g.mouseY)
        g.pop()
    }


    drawGrids(){
        let g = this._g
        g.push()
        this.drawNStepGrid(4)
        this.drawNStepGrid(3)
        g.pop()
    }


    drawNStepGrid(n){
        this.l.assert(n <= 4)
        let g = this._g
        const weight = 0.5 + 2 * (4 - n)
        const m = 2
        g.strokeWeight(weight + 3)
        g.stroke(240)
        const [w, h] = this._pattern.getWidthAndHight()
        const dw = w/n
        const dh = h/n
        let [ox, oy] = this._layout.getPatternRectOffsets()
        const draw = () => {
            for (let i = 1; i < n; ++i){
                const x = ox + i * dw
                this._g.line(x, oy + m, x, oy + h - m)
            }
            for (let i = 1; i < n; ++i){
                const y = oy + i * dh
                this._g.line(ox + m, y, ox + w - m, y)
            }
        }
        draw();
        g.strokeWeight(weight)
        g.stroke(40)
        g.blendMode(g.BLEND)
        draw()
    }


    drawControls(){
        let g = this._g
        g.noStroke()
        g.fill(0, 0, 40)
        const r = this._layout.getControlAreaRect()
        g.rect(r.L(), r.T(), r.W(), r.H())
        this._sliders.forEach(s => {
            s.draw(g)
        })
    }


    drawDebugInfo(){
        this._layout.drawDebugRects(this._g)
        this.drawMouseInfo()
    }


    toggleDrawDebugInfo() { this._drawDebugInfo = !this._drawDebugInfo}


    drawMouseInfo(){
        let g = this._g
        g.push()
        g.noStroke()
        g.fill(40, 150)
        const x = Math.min(g.mouseX, g.width - 200)
        const y = Math.min(g.mouseY, g.height - 50)
        g.rect(x + 10, y -10, 150, 60)
        g.fill(240)
        const t = "window size: " + g.width + "x" + g.height
                + "\nmouse: " + Math.floor(g.mouseX) + " " + Math.floor(g.mouseY)
                + "\nframe# " + g.frameCount
                + " " + Math.floor(g.getFrameRate()) + " fps"
                + "\nval: " + this.getPatternDebugVal()
        g.text(t, x + 20, y)
        g.pop()
    }


    getPatternDebugVal() {
        let g = this._g
        if (g.mouseX !== g.pmouseX || g.mouseY !== g.pmouseY) {
            if (this._layout.pointInPatternRect(g.mouseX, g.mouseY)) {
                let [x, y] = this._layout.getPatternRectOffsets()
                x = g.mouseX - x
                y = g.mouseY - y
                this._patternDebugVal = this._pattern.getValueAt(x, y)
                //this.l.log("val at [", x, y, "]:", this._patternDebugVal)
            }
        }
        return this._patternDebugVal
    }


    drawHelp() {
        let g = this._g
        g.push()

        g.background(40, 200)

        this.drawTouchZones()

        g.noStroke()
        g.fill(240)
        g.textAlign(g.LEFT, g.TOP)

        g.textSize(this._txtSize)
        const txt = "BIT MURALS\n\nby Eugene Yakshin, 2021"
        const tx = this._touchZones.menu.getRect().R() + 2 * this._txtSize
        const ty = 2 * this._txtSize
        g.text(txt, tx, ty)
        g.pop()
    }


    drawTouchZones(){
        let g = this._g
        g.push()
        let tz = this._touchZones

        const col = {H: 150, S: 100, B: 240, A: 20 + 80 * (1 - this.blink())}

        tz.prev.setColor(col)
        tz.next.setColor(col)
        tz.panZoom.setColor(col)
        tz.mutate.setColor(col)
        tz.randomize.setColor(col)

        const x = tz.menu.getRect().R() + 2 * this._txtSize
        const y = tz.panZoom.getRect().T() - 2 * this._txtSize
        g.textAlign(g.LEFT)
        g.noStroke()
        g.fill(col.H, col.S, col.B, 100 + 2 * col.A)
        g.textSize(this._txtSize)
        g.text("PATTERN TOUCH ZONES:", x, y)

        g.fill(240)
        const y2 = y + tz.menu.getRect().H()
        g.text("MENU TOUCH ZONES:", x, y2)

        Object.values(tz).forEach(z => z.draw(this._g))
        g.pop()
    }


    blink(tSec = 3) { return 0.5 + 0.5 * Math.sin(0.001 * performance.now() * 2 * Math.PI / tSec) }


    mouseReleased() {
        //this.l.log("mouseReleased", p.mouseX, p.mouseY)
        this._panning = false
        this._drawGrids = false
        this._settingSlider = false
        this.springBackTouchZones()
        if (this._showTour)
            this._tour.mouseReleased()
    }


    keyReleased(){
        this.springBackTouchZones()
    }


    springBackTouchZones(){
        this._touchZones.load.setPressed(false)
        this._touchZones.save.setPressed(false)
        this._touchZones.prev.setPressed(false)
        this._touchZones.next.setPressed(false)
        this._touchZones.mutate.setPressed(false)
        this._touchZones.randomize.setPressed(false)
        this._touchZones.panZoom.setPressed(false)
        this._touchZones.framing.setPressed(false)
    }


    mouseClicked(x, y) {
        const l = this._layout

        if (this._editingUserInput && !l.pointInUserInputZone(x, y))
            this.recordAndCheckUserInputOnSuddenFocusChange()

        if (this._showTour) {
            this._tour.mouseClicked(x, y)
            return
        }

        if (l.pointInToggleHelpZone(x, y)){
            this.toggleHelp()
            return
        }

        if (l.pointInUserInputZone(x, y)){
            this._editingUserInput = true
            const id = l.getUserInputIdUnderPoint(x, y)
            //this.l.log("user input id:", id)
            return
        }

        this._clickX = x
        this._clickY = y

        if (this._showHelp) {
            if (l.pointInToggleSaveZone(x, y))
                this.savePictureAndSettings()

            else if (l.pointInToggleLoadZone(x, y)) {
                this._controller.eraseMutationBookmark()
                this.stopSlideshow()
                this.loadSettingsFromFilePicker()
            }

            else if (l.pointInToggleInfraredZone(x, y))
                this.toggleInfrared()

            else if (l.pointInToggleSignedZone(x, y))
                this.toggleSigned()

            else if (l.pointInToggleNegativeZone(x, y))
                this.toggleNegative()

            else if (l.pointInToggleColorZone(x, y))
                this.toggleColored()

            else if (l.pointInToggleSlideshowZone(x, y))
                this.toggleSlideshow()

            else if (l.pointInToggleFramingZone(x, y))
                this.nextPatternFraming()

            else if (l.pointInPanZoomZone(x, y))
                this._drawGrids = true

            else if (l.pointInMutateZone(x, y))
                this.mutateFormula()

            else if (l.pointInRandomizeZone(x, y))
                this.randomizeParams()

            else
                this.processPrevNextPatternClick(x, y)// allows to switch patterns while in menu
        }

        else if (l.pointInSlidersZone(x, y)){
            const s = this.getSliderUnderPoint(x, y)
            if (s) {
                this.l.log("slider id:", s.getLabel())
                this.setSliderValueByMouse(s, x, y)
                this.setParamValueFromSlider(s)
                this.updateAllSliderValues()
            }
            else
                this.l.log("no slider under mouse")
        }
        else if (l.pointInPanZoomZone(x, y))
            this._drawGrids = true

        else if (l.pointInMutateZone(x, y)) {
            this.stopSlideshow()
            this.mutateFormula()
        }
        else if (l.pointInRandomizeZone(x, y)) {
            this.stopSlideshow()
            this.randomizeParams()
        }
        else
            this.processPrevNextPatternClick(x, y)
    }


    getSliderUnderPoint(x, y) {
        const s = this._sliders
        for (let i = 0; i < s.length; ++i)
            if (s[i].mouseOver(x, y))
                return s[i]
        return null
    }


    processPrevNextPatternClick(x, y){
        const l = this._layout
        if (l.pointInPrevPatternZone(x, y)) {
            this.stopSlideshow()
            this.prevOrBookmarkedPattern()
        }

        else if (l.pointInNextPatternZone(x, y)) {
            this._controller.eraseMutationBookmark()
            this.stopSlideshow()
            this.jumpToAnotherPattern(() => this._controller.nextPattern(false))
            this._touchZones.next.setPressed(true)
        }
    }


    prevOrBookmarkedPattern(){
        const c = this._controller
        if (c.hasMutationBookmark() && !c.currentPatternIsMutationOrigin())
            this.jumpToAnotherPattern(() => this._controller.goToMutationOrigin())
        else {
            c.eraseMutationBookmark()
            this.jumpToAnotherPattern(() => this._controller.prevPattern())
        }
        this._touchZones.prev.setPressed(true)
    }


    jumpToAnotherPattern(callToController){
        callToController()
        this.onPatternChange()
        this.setUserFunctionsToInputFields()
        this.updateTouchZonesForPatternDrawingOptions()
    }


    shouldStartPanning(x, y, dx, dy){
        return (dx != 0 || dy != 0)
            && !this._panning && !this._settingSlider
            && this._layout.pointInPanZoomZone(x, y)
    }


    startPanning(){
        this._panning = true
        this._drawGrids = true
        this._touchZones.panZoom.setPressed(true)
    }


    doubleClicked(x, y, shiftDown) { // TODO неконсистентная ответственность за установку значений
        if (this._layout.pointInUserInputZone(x, y)){
            this._editingUserInput = true
            return
        }
        else if (this._editingUserInput)
            this.recordAndCheckUserInputOnSuddenFocusChange()

        const resetToInit = shiftDown
        if (this._layout.pointInPanZoomZone(x, y)) {
            //this._touchZones.panZoom.setPressed(true)
            this.resetPanAndZoom(resetToInit)
            return
        }

        if (this._showHelp)
            return

        if (this._layout.pointInSlidersZone(x, y)){
            if (resetToInit) {
                this._controller.resetAllParamsToDefault()
                this.l.log("resetting all sliders and vals to default")
            }
            else {
                const s = this.getSliderUnderPoint(x, y)
                if (s) {
                    this._controller.resetParamToDefault(s.getLabel())
                    this.l.log("resetting", s.getLabel(), "to default")
                }
            }
            this.updateAllSliderValues()
            return
        }

        if (this._layout.pointInNextPatternZone(x, y)){
            this._controller.eraseMutationBookmark()
            this.stopSlideshow()
            this.jumpToAnotherPattern(() => this._controller.goToEndOfHistory())
            this._touchZones.next.setPressed(true)
            return
        }
        if (this._layout.pointInPrevPatternZone(x, y)){
            this._controller.eraseMutationBookmark()
            this.stopSlideshow()
            this.jumpToAnotherPattern(() => this._controller.goToBeginningOfHistory())
            this._touchZones.prev.setPressed(true)
            return
        }
    }


    mouseWheel(x, y, d, shiftDown, ctrlDown) {
        this.l.log("mouseWheel", d)
        if (!d)
            return

        if (this._layout.pointInPatternRect(x, y)) { // we should be able to zoom in anywhere on the pattern
            this.stopSlideshow()
            this.zoomPattern(x, y, d, shiftDown, ctrlDown)
        }
    }


    mouseDragged(x, y, dx, dy) {
        if (this.shouldStartPanning(x, y, dx, dy)){
            this.stopSlideshow()
            this.startPanning()
        }

        if (this._panning && !this._settingSlider) {

            if (dx == 0 && dy == 0)
                return

            this.panPatternBy(dx, dy)
            return
        }

        if (this._showHelp)
            return

        if (!this._panning) {
            const s = this.getSliderUnderPoint(x, y)
            if (s) {
                this._settingSlider = true
                this.setSliderValueByMouse(s, x, y)
                this.setParamValueFromSlider(s)
                this.updateAllSliderValues()
            }
            return
        }
    }


    setParamValueFromSlider(s) {
        const v = s.getValue()
        const id = s.getLabel()
        //this.l.log("slider", id, "val", v)
        this._controller.setParamValue(id, v)
    }


    updateAllSliderValues() {
        this._sliders.forEach( s => {
            const v = this._controller.getParamValue(s.getLabel())
            s.setValue(v)
        })
    }


    setSliderValueByMouse(s, x, y) { s.mouseOn(x, y) }


    keyPressed (key, keyCode, shiftDown, controlDown, altDown) {
        //this.l.log("key pressed (code/key):", keyCode, key)

        if (key == 'Enter') {
            if (this._showTour)
                this._tour.goToNextItem()
            else
                this.checkUserInput(this._lastEditedUserInput)
            return
        }

        if (key == 'Escape') {
            if (this._showTour)
                this.toggleTour()
            else if (this._showHelp)
                this.toggleHelp()
            return
        }

        if (this._editingUserInput)
            return

        const g = this._g

        const ctrlShift = shiftDown && controlDown

        switch (keyCode) {
            case (g.RIGHT_ARROW):
                if (this._showTour)
                    this._tour.goToNextItem()

                else if (ctrlShift) {
                    this.stopSlideshow()
                    this.panPatternBy(1, 0)
                }

                else if (shiftDown){
                    this.stopSlideshow()
                    this.changeHueOffset(1)
                }
                else if (controlDown) {
                    this.stopSlideshow()
                    this.changeBrightnessOffset(1)
                }
                else {
                    this._controller.eraseMutationBookmark()
                    this.jumpToAnotherPattern(() => this._controller.nextPattern(false))
                    this._touchZones.next.setPressed(true)
                }
                break

            case (g.LEFT_ARROW):
                if (this._showTour)
                    this._tour.goToPrevItem()

                else if (ctrlShift) {
                    this.stopSlideshow()
                    this.panPatternBy(-1, 0)
                }

                else if (shiftDown) {
                    this.stopSlideshow()
                    this.changeHueOffset(-1)
                }
                else if (controlDown){
                    this.stopSlideshow()
                    this.changeBrightnessOffset(-1)
                }
                else {
                    this.stopSlideshow()
                    this.prevOrBookmarkedPattern()
                }
                break

            case (g.UP_ARROW):
                this.stopSlideshow()
                if (ctrlShift)
                    this.panPatternBy(0, -1)
                else if (shiftDown)
                    this.changeHueAmp(1)
                else if (controlDown)
                    this.changeBrightnessAmp(1)
                else {
                    this._controller.eraseMutationBookmark()
                    this.stopSlideshow()
                    this.loadSettingsFromFilePicker()
                }
                break

            case (g.DOWN_ARROW):
                this.stopSlideshow()
                if (ctrlShift)
                    this.panPatternBy(0, 1)
                else if (shiftDown)
                    this.changeHueAmp(-1)
                else if (controlDown)
                    this.changeBrightnessAmp(-1)
                else
                    this.savePictureAndSettings()
                break
        }

        if (!shiftDown && !controlDown)
            this.singleKeyPressed (key)
    }


    singleKeyPressed (key) {
        switch (key) {
            case 'i':
            case 'I':
            case 'ш':
            case 'Ш':
                this.stopSlideshow()
                this.toggleInfrared()
                break
            case 's':
            case 'S':
            case 'ы':
            case 'Ы':
                this.stopSlideshow()
                this.toggleSigned()
                break
            case 'n':
            case 'N':
            case 'т':
            case 'Т':
                this.stopSlideshow()
                this.toggleNegative()
                break
            case 'c':
            case 'C':
            case 'с':
            case 'С':
                this.stopSlideshow()
                this.toggleColored()
                break
            case 'r':
            case 'R':
            case 'к':
            case 'К':
                this.stopSlideshow()
                this._controller.eraseMutationBookmark()
                this.randomizeParams()
                break

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                this.stopSlideshow()
                this.mutateFormula(parseInt(key))
                break

            case 'm':
            case 'M':
            case 'ь':
            case 'Ь':
                this.stopSlideshow()
                this.mutateFormula()
                break

            case '9':
                this.stopSlideshow()
                this.resetHueParams()
                break
            case '0':
                this.stopSlideshow()
                this.resetBrightnessParams()
                break

            case 'h':
            case 'H':
            case 'р':
            case 'Р':
                this.toggleTour()
                break
            case 'o':
            case 'O':
            case 'щ':
            case 'Щ':
                this.toggleHelp()
                break

            case 'f':
            case 'F':
            case 'а':
            case 'А':
                this.nextPatternFraming()
                break
            case 'b':
            case 'B':
            case 'и':
            case 'И':
                this._controller.toggleSkipBoring()
                break
            case 'a':
            case 'A':
            case 'ф':
            case 'Ф':
                this._controller.eraseMutationBookmark()
                this.toggleSlideshow()
                break
            case 'd':
            case 'D':
            case 'в':
            case 'В':
                this.toggleDrawDebugInfo()
                break
        }
    }


    randomizeParams(){
        this._controller.nextPatternWithRandomizedParams()
        this.updateAllSliderValues()
        this.onPatternChange()
    }

    mutateFormula(opt){
        this._controller.bookmarkPattern()
        const upd = this._controller.nextPatternWithMutatedFormula(opt)
        if (upd) {
            this.onPatternChange()
            this._touchZones.mutate.setPressed(true)
        }
    }

    nextPatternFraming(){
        this._lastReframingMoment = this._g.frameCount
        const oldWH = this._pattern.getWidthAndHight()
        const fs1 = this._layout.patternIsFullscreen()
        this._layout.nextPatternFraming()
        const fs2 = this._layout.patternIsFullscreen()
        if (!fs1 && fs2)
            this._g.canvas.requestFullscreen()
        else if (fs1 && !fs2)
            document.exitFullscreen()
        this.updateLayout()
        this.adjustPatternCenter(oldWH)
        this.startRedrawPattern()
        this.setUserInputVisibility(!fs2)
        this._touchZones.framing.setPressed(true)
    }


    adjustPatternCenter(oldWH){
        const newWH = this._pattern.getWidthAndHight()
        const z = this._pattern.getZoom()
        let dx = (newWH[0] - oldWH[0]) / 2 * z
        let dy = (newWH[1] - oldWH[1]) / 2 * z
        // TODO сползает вверх после полного цикла всех фреймингов
        this._panZoomController.panPatternBy(dx, dy)
        this._info.updateFramingString()
    }


    panPatternBy(dx, dy){
	    this._panZoomController.panPatternBy(dx, dy)
        this.startRedrawPattern()
        this._info.updateFramingString()
    }


    zoomPattern(x, y, amount, shiftDown, ctrlDown){
        const [oX, oY] = this._layout.getPatternRectOffsets()
        const upd = this._panZoomController.zoomPattern(x, y, oX, oY,
                                            amount, shiftDown, ctrlDown)
        if (!upd) return
        this.startRedrawPattern()
        this._info.updateFramingString()
    }


    toggleHelp() {
        this._showHelp = !this._showHelp
        this.l.log("show help:", this._showHelp)
    }


    toggleTour() {
        this._tour.restart()
        this._showTour = !this._showTour
        this.l.log("show tour:", this._showTour)
    }


    stopSlideshow(){
        this._slideshow.stop()
        this._info.setSlideshowStatus(false)
        this._touchZones.slideshow.setPressed(false)
    }


    toggleSlideshow(){
        const a = this._slideshow.toggle()
        this._info.setSlideshowStatus(a)
        this._touchZones.slideshow.setPressed(a)
    }


    onPatternDone(){
        this._info.setDrawingStatus(false)
    }


    resetPanAndZoom(resetToInit) {
        const framing = resetToInit ? new Framing()
                                    : this._controller.getInitialFramingForCurrentPattern()
        const upd = this._panZoomController.setFraming(framing)
        if (!upd) return

        this.l.log("reset pan and zoom to", (resetToInit ? "0, 0, 1" : "history vals"))
        this._info.updateFramingString()
        this.startRedrawPattern()
    }


    toggleInfrared() {
        const i = this._colorController.toggleInfrared()
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
        this._touchZones.infrared.setPressed(i)
    }


    toggleSigned() {
        const s = this._colorController.toggleSigned()
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
        this._touchZones.signed.setPressed(s)
    }


    toggleNegative() {
        const n = this._colorController.toggleNegative()
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
        this._touchZones.negative.setPressed(n)
    }


    toggleColored() {
        const c = this._colorController.toggleColored()
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
        this._touchZones.colored.setPressed(c)
    }


    changeHueOffset(d){
        this._colorController.changeHueOffset(d)
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
    }


    changeHueAmp(d){
        this._colorController.changeHueAmp(d)
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
    }


    changeBrightnessOffset(d){
        this._colorController.changeBrightnessOffset(d)
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
    }


    changeBrightnessAmp(d){
        this._colorController.changeBrightnessAmp(d)
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
    }


    resetHueParams(){
        this._colorController.resetHueParams()
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
    }


    resetBrightnessParams(){
        this._colorController.resetBrightnessParams()
        this._info.updateDrawingOptionsString()
        this.startRedrawPattern()
    }


    savePictureAndSettings(){
        this.l.log("saving picture and settings")
        this._touchZones.save.setPressed(true)
        const img = this.getPatternImage()
        const s = this._controller.getCurrentSettingsCopy()
        // TODO restart slideshow
        this._importExport.savePictureAndSettings(img, s)
    }


    loadSettingsFromDroppedFile(file) {
        this.l.logc("loading settings from dropped file")
        const s = this._importExport.loadSettingsFromDroppedFile(file)
        this.loadParsedSettings(s)
    }


    loadSettingsFromFilePicker() {
        this.l.logc("loading settings from file picker")
        this._importExport.loadSettingsFromFilePicker(
            (s) => { this.loadParsedSettings(s)}
        )
    }


    loadParsedSettings(s){
        if (typeof s === "undefined"){
            this.l.warn("failed to load settings")
            this.l.loge()
            return
        }
        this._controller.nextPatternFromLoadedSettings(s)
        this.setUserFunctionsToInputFields()
        this.updateAllSliderValues()
        this.onPatternChange()
        this.l.log("settings loaded")
        this.l.loge()
    }

}