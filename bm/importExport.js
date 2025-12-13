// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class ImportExport {
    constructor(p5){
        this._p5 = p5
        this.l = new Logger("Import/Export")
        this._dateString = "no_date"
    }


    savePicture(img) {
        this.l.log("saving picture")
        img.save("bm_" + this._dateString + ".png")
    }


    updateDateString() { this._dateString = this.dateTimeString() }


    savePictureAndSettings(img, s){
        this.updateDateString()
        this.savePicture(img)
        this.saveSettings(s)
    }


    saveSettings(s){
        this.l.log("saving settings")
        let j = {}
        j.name = "bit murals"
        j.date = this._dateString

        j.compressedFormula = this.compressFormula(s.formulaStructure)
        j.readableFormula = s.readableFormula
        j.userFunctions = s.userFunctions
        j.framing = s.framing
        j.drawingOptions = s.drawingOptions
        j.numbers = s.numbers
        j.params = Object.fromEntries(s.params)

        const jss = JSON.stringify(j, null, 4)
        const fname = "bm_" + this._dateString + ".txt"
        this._p5.saveStrings([jss], fname)
    }


    compressFormula(f){
        const thin = f.compress()
        const p = lzwCompress.pack(thin)
        const s = p.toString()
        return s
    }


    decompressFormula(str){
        const arr = str.split(",").map(Number)
        const thin = lzwCompress.unpack(arr)
        let f = new FormulaNode()
        f.decompress(thin)
        return f
    }


    loadSettingsFromDroppedFile(f){
        this.l.logg("loading settings from dropped file")
        return this.parseSettingsJSON(f.data)
    }


    loadSettingsFromFilePicker(callback){
        this.l.logg("loading settings from file picker")
        // https://stackoverflow.com/a/40971885
        let input = document.createElement('input')
        input.type = 'file'
        input.onchange = event => {
             try {
                 let file = event.target.files[0]
                 let reader = new FileReader()
                 reader.readAsText(file,'UTF-8')
                 reader.onload = readerEvent => {
                        const content = readerEvent.target.result
                        const s = this.parseSettingsJSON(content)
                        callback(s)
                 }
             }
            catch (e) {
                this.l.warn("error loading settings")
                this.l.error(e)
                callback()
            }
        }
        input.click()
    }


    parseSettingsJSON(s){
        try {
            const j = JSON.parse(s)
            if (j.name !== "bit murals")
                throw "the file is not a bit murals settings"

            if (!j.hasOwnProperty("compressedFormula"))
                throw "no formula in settings. aborting load"

            j.formulaStructure = this.decompressFormula(j.compressedFormula)
            delete j.compressedFormula

            return j
        }
        catch (e) {
            this.l.warn("could not parse the file")
            this.l.warn("the file must be plain txt")
            this.l.warn(e)
        }
    }


    dateTimeString() {
        const d = new Date()
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const h = String(d.getHours()).padStart(2, '0')
        const m = String(d.getMinutes()).padStart(2, '0')
        const s = String(d.getSeconds()).padStart(2, '0')
        return yyyy + mm + dd + "_" + h + m + s
    }
}