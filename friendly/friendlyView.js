// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


const ParamTips = {
    "x/y" : "chance that a leaf of the formula tree is x rather than y",
    "d"   : "depth of the formula tree. deeper = more complex, and the cost grows exponentially",
    "()"  : "chance of brackets around a subexpression",
    "[]"  : "magnitude of generated numbers: factors, offsets and the a…h of user functions",
    "a"   : "chance that a node gets a scaling factor",
    "s"   : "chance that a node gets an offset",
    "=="  : "chance of comparisons (<, >, ==, !=) between branches. stronger on shallow trees",
    "B/A" : "bitwise vs arithmetic operations between branches",
    "|"   : "weight of OR among the bitwise operations",
    "^"   : "weight of XOR among the bitwise operations",
    "&"   : "weight of AND among the bitwise operations",
    "<<"  : "weight of shifts (<< and >>) among the bitwise operations",
    "%"   : "weight of modulo among the arithmetic operations",
    "*"   : "weight of multiplication among the arithmetic operations",
    "/"   : "weight of division among the arithmetic operations",
    "±"   : "weight of + and − among the arithmetic operations",
    "F"   : "chance that a node is wrapped in a function",
    "T/U" : "built-in functions vs your user functions f₀…f₃",
    "ln"  : "weight of log among the built-in functions",
    "e"   : "weight of exp among the built-in functions",
    "√"   : "weight of sqrt among the built-in functions",
    "tg"  : "weight of tan among the built-in functions",
    "◉"   : "weight of primes among generated numbers (1/p below 1)",
    "◎"   : "weight of powers of two among generated numbers",
    "◒"   : "weight of fractions p/q with a small p or q among generated numbers",
    "◐"   : "weight of plain numbers among generated numbers: the only kind before",
    "⛋"   : "chance of mirror symmetry of x and y around the center"
}




class FriendlyView {
    constructor(p5) {
        this._g = p5
        this._pattern = new Pattern(1, 1)
        this._generator = new Generator()
        this._controller = new Controller(p5)
        this._colorController = new PatternColorController()
        this._panZoom = new PanZoomController()
        this._slideshow = new Slideshow()
        this._importExport = new ImportExport(p5)
        this._noise = new NoiseOverlay(p5)
        this._histogram = new ValueHistogram()
        this._tooltip = new Tooltip()
        this._framingSides = [0, 256, 384, 512, 768, 1024] // 0 - as big as fits
        this._framingId = 0
        this._patternRect = { x: 0, y: 0, side: 1 }
        this._shownPercent = -1
        this._buttons = {}
        this._toneSliders = {}
        this._paramSliders = new Map()
        this._userInputs = []
        this._recolorPending = false
        this.l = new Logger("Friendly View")
    }


    setup() {
        const cc = this._colorController
        cc.setPattern(this._pattern)
        cc.updateColorFunction()
        this._controller.setup(this._pattern, this._generator)
        this._controller.setColorController(cc)
        this._panZoom.setPattern(this._pattern)
        this._pattern.setDoneCallback(() => { this.onPatternDone() })
        this._slideshow.setNextPatternCallback(() => {
            if (!this._pattern.done())
                return false
            this.jumpToAnotherPattern(() => this._controller.nextPattern())
            return true
        })

        this._area = document.getElementById("pattern-area")
        this.buildPanel(document.getElementById("panel"))
        this.listenToPatternArea()
        this.listenToKeys()
        this.listenToFileDrops()
        this.resize()

        this._controller.nextPattern()
        this.onPatternChange()
        setTimeout(() => { if (!this._slideshowTouched) this.toggleSlideshow() }, 2000)
    }


    // ---------- panel ----------

    buildPanel(panel) {
        panel.append(
            this.buildHeader(),
            this.buildUserFunctions(),
            this.buildInfo(),
            this.buildTransport(),
            this.buildModes(),
            this.buildTone(),
            this.buildGeneratorSliders(),
            this.buildHints())
    }


    section(className, ...children) {
        const div = document.createElement("div")
        div.className = className
        div.append(...children)
        return div
    }


    text(className, s = "") {
        const span = document.createElement("div")
        span.className = className
        span.textContent = s
        return span
    }


    button(label, tip, onClick) {
        const b = document.createElement("button")
        b.className = "btn"
        b.textContent = label
        b.dataset.tip = tip
        b.addEventListener("click", () => { onClick(); b.blur() })
        return b
    }


    buildHeader() {
        const link = document.createElement("a")
        link.href = "index.html"
        link.textContent = "classic version"
        link.dataset.tip = "the original interface: everything on the keyboard and touch zones"
        return this.section("header", this.text("title", "bit murals"), link)
    }


    buildUserFunctions() {
        const subs = ["₀", "₁", "₂", "₃"]
        const div = this.section("user-functions")
        for (let i = 0; i < this._controller.getNumUserFunctions(); ++i) {
            const input = document.createElement("input")
            input.placeholder = `f${subs[i]}  e.g.  gen + ((y%100 < 50) ? 0 : sin(gen))`
            input.spellcheck = false
            input.dataset.tip = "your function. x, y, w, h, z, x0, y0, numbers a…h, Math functions; "
                              + "gen is replaced by a generated subtree. "
                              + "used by new formulas when T/U lets it (Enter to check)"
            const check = () => {
                const ok = this._controller.checkAndSetUserFunction(i, input.value)
                input.classList.toggle("bad", !ok)
            }
            input.addEventListener("change", check)
            input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur() })
            this._userInputs.push(input)
            div.append(input)
        }
        return div
    }


    buildInfo() {
        this._infoStatus = this.text("status")
        this._infoFormula = this.text("formula")
        this._infoFraming = this.text("framing")
        this._infoValue = this.text("value", "move over the pattern to read values")
        return this.section("info", this._infoStatus, this._infoFormula, this._infoFraming, this._infoValue)
    }


    buildTransport() {
        const b = this._buttons
        b.prev      = this.button("◀", "previous pattern  [←]", () => { this.stopSlideshow(); this.prevPattern() })
        b.play      = this.button("▶", "slideshow  [a]", () => { this.toggleSlideshow() })
        b.next      = this.button("▶▶", "next pattern  [→]", () => { this.stopSlideshow(); this.nextPattern() })
        b.randomize = this.button("rnd", "randomize the generator sliders and make a new pattern  [r]",
                                  () => { this.stopSlideshow(); this.randomize() })
        b.mutate    = this.button("mut", "mutate the current formula a bit  [m]\n1…6: numbers, operand, function, operation, branches, brackets",
                                  () => { this.stopSlideshow(); this.mutate() })
        b.framing   = this.button("size", "pattern size: fit, 256, 384, 512, 768, 1024 px  [f]", () => { this.nextFraming() })
        b.save      = this.button("save", "save the picture and a settings file  [↓]", () => { this.save() })
        b.load      = this.button("load", "load a settings file, or drop it on the page  [↑]", () => { this.load() })
        return this.section("buttons transport",
                            b.prev, b.play, b.next, b.randomize, b.mutate, b.framing, b.save, b.load)
    }


    buildModes() {
        const b = this._buttons
        b.plain    = this.button("plain", "black and white: zero vs non-zero", () => { this.setMode("plain") })
        b.infrared = this.button("infra", "brightness cycles with the value: |v·amp + offset| mod 200  [i]",
                                 () => { this.setMode("infrared") })
        b.window   = this.button("window", "MRI-style window: dark below center − delta, bright above center + delta, "
                                         + "a ramp in between  [w]", () => { this.setMode("window") })
        b.signed   = this.button("sign", "plain: negative dark, positive bright. infra: around a middle gray  [s]",
                                 () => { this.toggleDrawingOption("signed") })
        b.negative = this.button("neg", "invert the brightness  [n]", () => { this.toggleDrawingOption("negative") })
        b.colored  = this.button("color", "hue from the value: |v·hue amp + hue offset| mod 255  [c]",
                                 () => { this.toggleDrawingOption("colored") })
        return this.section("buttons modes", b.plain, b.infrared, b.window, b.signed, b.negative, b.colored)
    }


    buildTone() {
        const cc = this._colorController
        const s = this._toneSliders

        s.amp = this.toneSlider("amp", new LogScale(-300, 300), 1, (v) => cc.setBrightnessAmp(v))
        s.offset = this.toneSlider("offset", new SymLogScale(), 0, (v) => cc.setBrightnessOffset(v))
        s.center = this.toneSlider("center", new SymLogScale(), 0, (v) => cc.setWindowCenter(v))
        s.center.setTooltip("the value in the middle of the window")
        s.delta = this.toneSlider("delta", new LogScale(-300, 308), 1, (v) => cc.setWindowDelta(v))
        s.delta.setTooltip("half the width of the window")
        s.hueAmp = this.toneSlider("hue amp", new LogScale(-300, 300), 1, (v) => cc.setHueAmp(v))
        s.hueAmp.setTooltip("values are multiplied by this before the hue is taken")
        s.hueOffset = this.toneSlider("hue offset", new SymLogScale(), 0, (v) => cc.setHueOffset(v))
        s.hueOffset.setTooltip("added after the hue amp, before mod 255")

        this._buttons.fit = this.button("fit", "put the window over the middle half of the values", () => { this.fitWindow() })
        this._histogram.element().addEventListener("pointerdown", () => { this.stopSlideshow() })

        const fine = this.text("hint", "drag · shift+drag fine · wheel · 2× click default · click the number to type")
        this._windowRow = this.section("window-row", s.center.element(), s.delta.element(), this._buttons.fit)
        return this.section("tone",
                            this._histogram.element(),
                            s.amp.element(), s.offset.element(),
                            this._windowRow,
                            s.hueAmp.element(), s.hueOffset.element(),
                            fine)
    }


    toneSlider(label, scale, defaultValue, setter) {
        const s = new BarSlider(label, scale)
        s.setDefaultValue(defaultValue)
        s.setFineStep(0.01, 0.1)
        s.onChange((v) => {
            this.stopSlideshow()
            setter(v)
            this.onColorChange()
        })
        return s
    }


    buildGeneratorSliders() {
        const params = this._generator.getParams()
        const div = this.section("generator")
        const head = this.section("generator-head",
            this.text("caption", "generator: probabilities for the next new formula"),
            this.button("reset", "all sliders to defaults", () => {
                this._controller.resetAllParamsToDefault()
                this.syncGeneratorSliders()
            }))
        div.append(head)
        for (const [k, v] of this._controller.getParamKeysAndValues()) {
            const s = new BarSlider(k, new LinearScale(0, 1))
            s.setFillFromRight(true)
            s.setReadoutVisible(false)
            s.setFineStep(0.002, 0.02)
            s.setDefaultValue(params.get(k).defaultVal)
            s.setValue(v)
            s.onChange((val) => {
                this._controller.setParamValue(k, val)
                this.syncGeneratorSliders()
            })
            this._paramSliders.set(k, s)
            div.append(s.element())
        }
        this.syncGeneratorSliders()
        return div
    }


    buildHints() {
        return this.text("hint",
            "pattern: drag to pan · wheel to zoom (shift ×2, ctrl slow) · 2× click resets the view, shift+2× click to 0, 0, 1")
    }


    // ---------- syncing the panel with the state ----------

    syncGeneratorSliders() {
        for (const [k, s] of this._paramSliders) {
            const v = this._controller.getParamValue(k)
            s.setValue(v)
            s.setTooltip(`${k}: ${ParamTips[k] || ""}\n${v.toFixed(3)} · 2× click: default`)
        }
    }


    syncUserFunctions() {
        const ufs = this._controller.getReadableUserFunctions()
        this._userInputs.forEach((input, i) => {
            input.value = ufs[i]
            input.classList.remove("bad")
        })
    }


    mode() {
        const d = this._colorController.getDrawingOptions()
        if (d.window) return "window"
        if (d.infrared) return "infrared"
        return "plain"
    }


    syncDrawingControls() {
        const d = this._colorController.getDrawingOptions()
        const b = this._buttons
        const mode = this.mode()
        b.plain.classList.toggle("on", mode === "plain")
        b.infrared.classList.toggle("on", mode === "infrared")
        b.window.classList.toggle("on", mode === "window")
        b.signed.classList.toggle("on", d.signed)
        b.negative.classList.toggle("on", d.negative)
        b.colored.classList.toggle("on", d.colored)
        b.signed.classList.toggle("idle", mode === "window")

        const s = this._toneSliders
        s.amp.setValue(d.brightnessAmp)
        s.offset.setValue(d.brightnessOffset)
        s.center.setValue(d.windowCenter)
        s.delta.setValue(d.windowDelta)
        s.hueAmp.setValue(d.hueAmp)
        s.hueOffset.setValue(d.hueOffset)

        s.amp.setVisible(mode !== "window")
        s.offset.setVisible(mode !== "window")
        this._windowRow.hidden = mode !== "window"
        s.hueAmp.setVisible(d.colored)
        s.hueOffset.setVisible(d.colored)

        if (mode === "plain") {
            s.offset.setLabel("threshold")
            s.amp.setTooltip("values are multiplied by this before the threshold")
            s.offset.setTooltip("|v·amp| below this counts as zero (dark)")
        }
        else {
            s.offset.setLabel("offset")
            s.amp.setTooltip("values are multiplied by this: zooms the brightness cycles")
            s.offset.setTooltip("added after the amp: shifts the brightness cycles")
        }
        this.syncHistogramMark()
    }


    syncHistogramMark() {
        const d = this._colorController.getDrawingOptions()
        const h = this._histogram
        const mode = this.mode()
        if (mode === "window") {
            h.setMark([d.windowCenter - d.windowDelta, d.windowCenter + d.windowDelta])
            h.onPick((v) => { this._colorController.setWindowCenter(v); this.onColorChange() },
                     "click: center the window here")
        }
        else if (mode === "plain") {
            const t = Math.abs(d.brightnessOffset / d.brightnessAmp)
            h.setMark(t > 0 ? [-t, t] : null)
            h.onPick((v) => {
                this._colorController.setBrightnessOffset(Math.abs(v * d.brightnessAmp))
                this.onColorChange()
            }, "click: values closer to zero than this count as zero")
        }
        else {
            h.setMark(null)
            h.onPick(() => {}, "")
        }
    }


    syncInfo() {
        const c = this._controller
        this._infoFormula.textContent = c.getReadableFormula()
        this._infoFormula.dataset.tip = c.getReadableFormula()
        const f = this._pattern.getFraming()
        const n = ScaleUtils.formatNumber
        this._infoFraming.textContent = `x₀ ${n(f.x0)}   y₀ ${n(f.y0)}   zoom ${n(f.zoom)}`
        this.syncStatus()
    }


    syncStatus() {
        const p = this._pattern.getPercentReady()
        const playing = this._slideshow.isPlaying()
        const percent = p >= 100 ? "100%" : `${p.toFixed(1)}%`
        this._infoStatus.textContent = `#${this._controller.getPatternNumber()}   ${percent}   ${playing ? "slideshow" : ""}`
        this._buttons.play.textContent = playing ? "❚❚" : "▶"
        this._buttons.play.classList.toggle("on", playing)
    }


    // ---------- actions ----------

    onPatternChange() {
        this.syncInfo()
        this.syncDrawingControls()
        this.syncGeneratorSliders()
        this.syncUserFunctions()
        this._histogram.clear()
        this._pattern.startRedraw()
    }


    // Sliders fire faster than frames, so the recolor waits for the next one.
    onColorChange() {
        this._recolorPending = true
        this.syncDrawingControls()
    }


    onFramingChange() {
        this._pattern.startRedraw()
        this._histogram.clear()
        this.syncInfo()
    }


    onPatternDone() {
        this._histogram.setValues(this._pattern.getValues())
        this.syncStatus()
    }


    jumpToAnotherPattern(callToController) {
        callToController()
        this.onPatternChange()
    }


    nextPattern() {
        this._controller.eraseMutationBookmark()
        this.jumpToAnotherPattern(() => this._controller.nextPattern(false))
    }


    prevPattern() {
        const c = this._controller
        if (c.hasMutationBookmark() && !c.currentPatternIsMutationOrigin())
            this.jumpToAnotherPattern(() => c.goToMutationOrigin())
        else {
            c.eraseMutationBookmark()
            this.jumpToAnotherPattern(() => c.prevPattern())
        }
    }


    randomize() {
        this._controller.eraseMutationBookmark()
        this._controller.nextPatternWithRandomizedParams()
        this.onPatternChange()
    }


    mutate(opt) {
        this._controller.bookmarkPattern()
        if (this._controller.nextPatternWithMutatedFormula(opt))
            this.onPatternChange()
    }


    toggleSlideshow() {
        this._slideshowTouched = true
        this._slideshow.toggle()
        this.syncStatus()
    }


    stopSlideshow() {
        this._slideshowTouched = true
        this._slideshow.stop()
        this.syncStatus()
    }


    setMode(mode) {
        this.stopSlideshow()
        const cc = this._colorController
        const d = cc.getDrawingOptions()
        const untouchedWindow = d.windowCenter === 0 && d.windowDelta === 1
        cc.setInfrared(mode === "infrared")
        cc.setWindow(mode === "window")
        if (mode === "window" && untouchedWindow)
            this.fitWindow()
        this.onColorChange()
    }


    toggleDrawingOption(name) {
        this.stopSlideshow()
        const cc = this._colorController
        const on = !cc.getDrawingOptions()[name]
        if (name === "signed") cc.setSigned(on)
        if (name === "negative") cc.setNegative(on)
        if (name === "colored") cc.setColored(on)
        this.onColorChange()
    }


    // Center on the median, delta over the middle half of the values shown so far.
    // Overflows (stored as ±MAX_VALUE) would drag the window to the ends.
    fitWindow() {
        const values = this._pattern.getValues()
        const picks = Math.min(values.length, 20000)
        let sample = []
        for (let j = 0; j < picks; ++j) {
            const v = values[Math.floor(Math.random() * values.length)]
            if (Math.abs(v) < Number.MAX_VALUE)
                sample.push(v)
        }
        if (!sample.length)
            sample = [0]
        sample = Float64Array.from(sample).sort()
        const n = sample.length
        const q = (t) => { return sample[Math.min(n - 1, Math.floor(t * n))] }
        const center = q(0.5)
        let delta = (q(0.75) - q(0.25)) / 2
        if (!(delta > 0) || !isFinite(delta))
            delta = Math.max(Math.abs(center) * 1e-6, 1e-300)
        this._colorController.setWindowCenter(center)
        this._colorController.setWindowDelta(Math.min(delta, Number.MAX_VALUE))
        this.onColorChange()
    }


    nextFraming() {
        this._framingId = (this._framingId + 1) % this._framingSides.length
        this.resize()
    }


    save() {
        this.stopSlideshow()
        const [w, h] = this._pattern.getWidthAndHight()
        this._pattern.finishNow()
        const ic = this._g.createGraphics(w, h)
        this._pattern.getBitmap().drawTo(ic.drawingContext, 0, 0)
        this._noise.draw(ic, w, h)
        this._importExport.savePictureAndSettings(ic.get(), this._controller.getCurrentSettingsCopy())
        ic.remove()
    }


    load() {
        this.stopSlideshow()
        this._importExport.loadSettingsFromFilePicker((s) => { this.loadParsedSettings(s) })
    }


    loadParsedSettings(s) {
        if (typeof s === "undefined")
            return
        this._controller.eraseMutationBookmark()
        this._controller.nextPatternFromLoadedSettings(s)
        this.onPatternChange()
    }


    resetBrightness() {
        this._colorController.resetBrightnessParams()
        this.onColorChange()
    }


    resetHue() {
        this._colorController.resetHueParams()
        this.onColorChange()
    }


    // ---------- pattern area: pan, zoom, values ----------

    pointInPattern(clientX, clientY) {
        const r = this._patternRect
        const x = clientX - r.x
        const y = clientY - r.y
        return [x, y, x >= 0 && y >= 0 && x < r.side && y < r.side]
    }


    listenToPatternArea() {
        const area = this._area
        let last = null
        area.addEventListener("pointerdown", (e) => {
            if (!this.pointInPattern(e.clientX, e.clientY)[2])
                return
            area.setPointerCapture(e.pointerId)
            last = [e.clientX, e.clientY]
        })
        area.addEventListener("pointermove", (e) => {
            const [x, y, inside] = this.pointInPattern(e.clientX, e.clientY)
            if (inside)
                this.showValueAt(Math.floor(x), Math.floor(y))
            if (!last || !area.hasPointerCapture(e.pointerId))
                return
            const dx = e.clientX - last[0]
            const dy = e.clientY - last[1]
            if (!dx && !dy)
                return
            last = [e.clientX, e.clientY]
            this.stopSlideshow()
            this._panZoom.panPatternBy(dx, dy)
            this.onFramingChange()
        })
        area.addEventListener("pointerup", (e) => {
            last = null
            area.releasePointerCapture(e.pointerId)
        })
        area.addEventListener("wheel", (e) => {
            e.preventDefault()
            const [x, y, inside] = this.pointInPattern(e.clientX, e.clientY)
            if (!inside || !e.deltaY)
                return
            this.stopSlideshow()
            if (this._panZoom.zoomPattern(x, y, 0, 0, e.deltaY, e.shiftKey, e.ctrlKey))
                this.onFramingChange()
        }, { passive: false })
        area.addEventListener("dblclick", (e) => {
            if (!this.pointInPattern(e.clientX, e.clientY)[2])
                return
            const f = e.shiftKey ? new Framing() : this._controller.getInitialFramingForCurrentPattern()
            if (this._panZoom.setFraming(f))
                this.onFramingChange()
        })
    }


    showValueAt(x, y) {
        const [w, h] = this._pattern.getWidthAndHight()
        if (x >= w || y >= h)
            return
        const v = this._pattern.getValueAt(x, y)
        this._infoValue.textContent = `value at ${x}, ${y}:   ${typeof v === "number" ? ScaleUtils.formatNumber(v) : v}`
    }


    listenToKeys() {
        document.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey)
                return
            const k = e.key.toLowerCase()
            const actions = {
                "arrowright": () => { this.stopSlideshow(); this.nextPattern() },
                "arrowleft" : () => { this.stopSlideshow(); this.prevPattern() },
                "arrowdown" : () => { this.save() },
                "arrowup"   : () => { this.load() },
                "a": () => { this.toggleSlideshow() },
                "r": () => { this.stopSlideshow(); this.randomize() },
                "m": () => { this.stopSlideshow(); this.mutate() },
                "i": () => { this.setMode(this.mode() === "infrared" ? "plain" : "infrared") },
                "w": () => { this.setMode(this.mode() === "window" ? "plain" : "window") },
                "s": () => { this.toggleDrawingOption("signed") },
                "n": () => { this.toggleDrawingOption("negative") },
                "c": () => { this.toggleDrawingOption("colored") },
                "f": () => { this.nextFraming() },
                "0": () => { this.resetBrightness() },
                "9": () => { this.resetHue() }
            }
            if (actions[k]) {
                e.preventDefault()
                actions[k]()
            }
            else if ("123456".includes(k) && k.length === 1) {
                this.stopSlideshow()
                this.mutate(parseInt(k))
            }
        })
    }


    listenToFileDrops() {
        document.addEventListener("dragover", (e) => { e.preventDefault() })
        document.addEventListener("drop", (e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (!file)
                return
            this.stopSlideshow()
            file.text().then((t) => { this.loadParsedSettings(this._importExport.parseSettingsJSON(t)) })
        })
    }


    // ---------- drawing ----------

    resize() {
        const g = this._g
        g.resizeCanvas(window.innerWidth, window.innerHeight)
        const r = this._area.getBoundingClientRect()
        const fits = Math.floor(Math.min(r.width, r.height))
        const wanted = this._framingSides[this._framingId]
        const side = Math.max(1, wanted ? Math.min(wanted, fits) : fits)
        if (this._pattern.setWidthAndHeight(side, side))
            this.onFramingChange()
        this._histogram.draw()
    }


    draw() {
        const g = this._g
        g.clear()
        const a = this._area.getBoundingClientRect()
        const [side] = this._pattern.getWidthAndHight()
        this._patternRect = {
            x: Math.floor(a.left + (a.width - side) / 2),
            y: Math.floor(a.top + (a.height - side) / 2),
            side: side
        }
        if (this._recolorPending) {
            this._pattern.recolor()
            this._recolorPending = false
        }
        this._pattern.draw()
        this._pattern.getBitmap().drawTo(g.drawingContext, this._patternRect.x, this._patternRect.y)
        this._noise.draw(g, g.width, g.height)

        const p = this._pattern.getPercentReady()
        if (p !== this._shownPercent) {
            this._shownPercent = p
            this.syncStatus()
        }
    }
}
