// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Controller {
    constructor(p5){
        this._p5 = p5
        this._pattern   = null
        this._generator = null
        this._checkFascinating = true
        this._QA = new FascinationChecker()
        this._patternEnhancer = new PatternEnhancer()
        this._colorController = null
        this._paramController = new ParamController()
        this._history = new History()
        this._bookmarks = []
        this._currentHistoryPos = -1
        this.l = new Logger("Controller")
    }


    setup(pattern, generator) {
        this.l.logg("setup")
        this.setGenerator(generator)
        this.setPattern(pattern)
        this.l.loge()
    }


    setPattern(p) {
        this.l.log("set pattern")
        this.l.assert(typeof p !== "undefined")
        this._pattern = p
        this._QA.setPattern(p)
    }


    setGenerator(g) {
        this.l.log("set generator")
        this.l.assert(typeof g !== "undefined")
        this._generator = g
        this._paramController.setParams(g.getParams())
    }


    setColorController(c){
        this.l.log("set color controller")
        this.l.assert(typeof c !== "undefined")
        this._colorController = c
    }


    logHistoryPos() { this.l.log("history pos:", this._currentHistoryPos) }


    getReadableFormula() { return this._generator.getReadableFormula() }
    getReadableUserFunctions() { return this._generator.getReadableUserFunctions() }
    getPatternNumber() { return this._currentHistoryPos }

    setCurrentFormulaToPattern() {
        const g = this._generator
        this._pattern.setFormula(g.getFormulaObject(), g.getFormulaSource())
    }


    stageCurrentFormulaInPattern() {
        const g = this._generator
        this._pattern.stageFormula(g.getFormulaObject(), g.getFormulaSource())
    }


    // staged: the pattern calculates the new formula aside and keeps showing
    // the current one until it is committed.
    nextPattern(forceAppend = true, staged = false){
        this.l.clear()
        this.l.log("next pattern")
        this.l.assert(this._currentHistoryPos < this._history.length())

        this.updateCurrentPanZoomAndDrawingOptionsRecord()
        if (forceAppend)
            this.goToLastHistoryItem()

        if (this._history.empty()
            || this._currentHistoryPos == this._history.length() - 1) {
            this.l.logg("new pattern")
            this._colorController.resetHueParams()
            this._colorController.resetBrightnessParams()
            this.generateFormula()
            if (staged)
                this.stageCurrentFormulaInPattern()
            else
                this.setCurrentFormulaToPattern()
            this.addCurrentPatternToHistory()
            ++this._currentHistoryPos
            this.l.loge()
        }
        else {
            ++this._currentHistoryPos
            this.loadFromHistory(this._currentHistoryPos, staged)
        }

        this.logHistoryPos()
        //this.l.loge()
    }

    goToLastHistoryItem() { this._currentHistoryPos = this._history.length() - 1 }

    getCurrentHistoryItem() { return this._history.get(this._currentHistoryPos) }

    prevPattern(staged = false){
        this.l.logc("previous pattern")
        this.l.assert(this._currentHistoryPos >= 0)
        if (this._currentHistoryPos == 0)
            this.l.log("already at the beginning of history")
        else {
            this.updateCurrentPanZoomAndDrawingOptionsRecord()
            --this._currentHistoryPos
            this.loadFromHistory(this._currentHistoryPos, staged)
        }
        this.logHistoryPos()
        this.l.loge()
    }


    addCurrentPatternToHistory(){
        this.l.logc("adding current pattern to history")
        const s = this.makeSettings()
        this._history.add(s)
        this.l.loge()
    }


    loadFromHistory(i, staged = false){
        this.l.logc("loading history", i)
        const s = this._history.get(i)
        this.loadSettings(s, false, staged)
        this.l.loge()
    }


    nextPatternWithRandomizedParams(staged = false){
        this.l.logc("next pattern from randomized params")
        this._paramController.randomizeParams()
        this.nextPattern(true, staged)
        this.l.loge()
    }


    nextPatternWithMutatedFormula(opt, staged = false) {
        this.l.clear()
        this.l.logg("next pattern from mutated")
        // TODO если нажать prev во время отрисовки и пока в лог валятся сообщения, 
        // сохраняется какой-то промежуточный вариант мутировавшей формулы

        const upd = this._checkFascinating ?
                        this.fascinatingMutation(opt)
                      : this._generator.mutateFormula(opt)

        if (upd) {
            this.updateCurrentPanZoomAndDrawingOptionsRecord()
            this.goToLastHistoryItem()
            this.setImprovedDrawingOptions()
            if (staged)
                this.stageCurrentFormulaInPattern()
            else
                this.setCurrentFormulaToPattern()
            this.addCurrentPatternToHistory()
            ++this._currentHistoryPos
        }
        this.l.loge()
        return upd
    }


    fascinatingMutation(opt){
        const gen = this._generator
        const oldSet = new SampleSet()
        oldSet.setPattern(this._pattern)

        if (!oldSet.canSample())
            return this._generator.mutateFormula(opt)

        this.l.log("sampling current formula")
        const oldFObj = gen.getFormulaObject()
        oldSet.collectSamples(oldFObj)

        const oldFStructure = gen.getFormulaStructureCopy()

        let mutated = false
        let nice = false
        let attempt = 0
        const maxAttempts = 10
        this.l.log("starting mutation cycle")

        while ((!mutated || !nice)
                && attempt < maxAttempts) {

            if (attempt > 0)
                this.l.warn("fascinating mutation attempt #", attempt + 1)
            ++attempt

            gen.setFormulaStructureWithoutUpdates(oldFStructure.copy())
            mutated = gen.mutateFormula(opt)
            if (!mutated)
                continue

            const newF = gen.getFormulaObject()
            nice = this._QA.isAbsolutelyFascinatingOMGICantEven(newF)
            if (!nice)
                continue

            const eq = this._QA.getSampleSet().isEqualTo(oldSet)
            // TODO мб учитывать infrared и прочее, 
            // тк в зависимости от drawing options внешне паттерн может не отличаться
            if (eq)
                this.l.warn("equal samples")
            mutated &= !eq
        }

        if (attempt >= maxAttempts)
            this.l.warn("max mutation attempts reached")
        
        if (mutated && nice) {
            const newFS = gen.getFormulaStructure()
            gen.setFormulaStructure(newFS)
            this.l.log("fascinating mutation after", attempt, "attempts")
        }
        else {
            mutated = false
            this.l.warn("setting the old formula back")
            gen.setFormulaStructure(oldFStructure)
        }
           
        return mutated
    }


    hasMutationBookmark(){ return this._bookmarks.length }

    eraseMutationBookmark(){ this._bookmarks = [] }

    bookmarkPattern() { this._bookmarks[0] = this._currentHistoryPos }

    currentPatternIsMutationOrigin() { return this._currentHistoryPos == this._bookmarks[0] }


    goToMutationOrigin(staged = false){
        this.l.assert(this.hasMutationBookmark())
        this.updateCurrentPanZoomAndDrawingOptionsRecord()
        const b = this._bookmarks[0]
        this.loadFromHistory(b, staged)
        this._currentHistoryPos = b
    }


    goToBeginningOfHistory(){
        this.updateCurrentPanZoomAndDrawingOptionsRecord()
        this.loadFromHistory(0)
        this._currentHistoryPos = 0
    }


    goToEndOfHistory(){
        this.updateCurrentPanZoomAndDrawingOptionsRecord()
        const b = this._history.length() - 1
        this.loadFromHistory(b)
        this._currentHistoryPos = b
    }


    getInitialFramingForCurrentPattern() { return this.getCurrentHistoryItem().framing.copy() }


    updateCurrentPanZoomAndDrawingOptionsRecord(){
        if (!this._history.length())
            return
        //this.l.log("updating current history pan and zoom")
        let s = this.getCurrentHistoryItem()
        s.framing = this._pattern.getFraming().copy()
        s.drawingOptions = this._colorController.getDrawingOptions().copy()
    }


    setParamValue(i, v) { this._paramController.setParamValue(i, v) }
    getParamValue(i) { return this._paramController.getParamValue(i) }

    resetParamToDefault(i){ this._paramController.resetParamToDefault(i) }
    resetAllParamsToDefault(){ this._paramController.resetAllParamsToDefault() }

    getParamKeysAndValues() { return this._paramController.getParamKeysAndValues() }


    makeSettings() {
        const fs = this._generator.getFormulaStructure()
        const rf = this._generator.getReadableFormula()
        const uf = this._generator.getReadableUserFunctions()
        const n  = this._generator.getNumbers()
        const p  = this.getParamKeysAndValues()
        const fr = this._pattern.getFraming()
        const d  = this._colorController.getDrawingOptions()
        return new Settings(fs, rf, uf, n, p,
                            fr.copy(), d.copy())
    }

    getCurrentSettingsCopy(){
        let s = this.getCurrentHistoryItem().copy()
        s.framing = this._pattern.getFraming().copy()
        s.drawingOptions = this._colorController.getDrawingOptions().copy()
        return s
    }


    // A staged formula is calculated with the loaded framing, so it goes to
    // the pattern after it.
    loadSettings(s, withUserParams, staged = false){
        this.l.logc("loading settings")

        this.l.assert(s.hasOwnProperty("formulaStructure"))

        if (s.hasOwnProperty("userFunctions"))
            this._generator.setReadableUserFunctions(s.userFunctions)
        else this.l.warn("no user functions found")
        
        if (withUserParams) {
            if (s.hasOwnProperty("params")) {
                const entries = Object.entries(s.params)
                const map = new Map(entries)
                this._paramController.setParamsFromKeysAndValues(map)
            }
            else this.l.warn("no params found")
        }

        if (s.hasOwnProperty("numbers"))
            this._generator.setNumbers(s.numbers)
        else this.l.warn("no numbers found")

        this._generator.setFormulaStructure(s.formulaStructure)

        if (s.hasOwnProperty("framing")) {
            let f = s.framing
            this._pattern.setFraming(new Framing(f.x0, f.y0, f.zoom))
        }
        else this.l.warn("no framing found")

        if (staged)
            this.stageCurrentFormulaInPattern()
        else
            this.setCurrentFormulaToPattern()

        if (s.hasOwnProperty("drawingOptions"))
            this._colorController.setDrawingOptions(s.drawingOptions)
        else this.l.warn("no drawing options found")

        this.l.log("loading settings done")
        this.l.loge()
    }


    nextPatternFromLoadedSettings(s, staged = false){
        this.l.clear()
        this.l.logc("next pattern from settings")
        this.updateCurrentPanZoomAndDrawingOptionsRecord()
        this.goToLastHistoryItem()
        this.loadSettings(s, true, staged)
        this.addCurrentPatternToHistory()
        ++this._currentHistoryPos
        this.l.loge()
    }


    getNumUserFunctions() { return this._generator.numUserFunctions() }

    checkAndSetUserFunction(i, f){ return this._generator.checkAndSetUserFunction(i, f) }




    toggleSkipBoring() {
        this._checkFascinating = !this._checkFascinating
        this.l.log("check fascinating:", this._checkFascinating)
    }


    generateFormula(){
        this._generator.generateFormula()
        
        if (!this._checkFascinating)
            return

        let nice = false
        let attempt = 0
        let maxAttempts = 10
        while (!nice && attempt < maxAttempts) {
            const f = this._generator.getFormulaObject()
            nice = this._QA.isAbsolutelyFascinatingOMGICantEven(f)
            if (!nice)
                this._generator.generateFormula()
            ++attempt
        }

        if (nice)
            this.setImprovedDrawingOptions()

        if (attempt == maxAttempts)
            this.l.warn("max fascination checks reached")
        this.l.log("formula is", (nice ? "amazing omg" : "boring"), "after only", attempt, "attempts")
    }


    setImprovedDrawingOptions(){
        const CC = this._colorController

        const [os, as] = CC.getOffsetAndAmpSteps()
        const monochrome = !CC.getDrawingOptions().infrared
        const adjustOffset = !this._QA.niceWithoutDrawingAdjustments()
        const samples = this._QA.getSampleSet()

        const d = this._patternEnhancer.calculteImprovedDrawingOptions(
                        samples, monochrome, adjustOffset, os, as)

        CC.setAmpsAndOffsets(d.brightnessAmp, d.brightnessOffset,
                             d.hueAmp, d.hueOffset)
    }


}