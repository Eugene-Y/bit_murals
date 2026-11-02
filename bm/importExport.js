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


    saveGif(bytes) {
        this.updateDateString()
        const url = URL.createObjectURL(new Blob([bytes], { type: "image/gif" }))
        const a = document.createElement("a")
        a.href = url
        a.download = "bm_" + this._dateString + ".gif"
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }


    saveSettings(s){
        this.l.log("saving settings")
        const jss = JSON.stringify(this.settingsJSON(s), null, 4)
        const fname = "bm_" + this._dateString + ".txt"
        this._p5.saveStrings([jss], fname)
    }


    // What a settings file holds; a link holds the same.
    settingsJSON(s) {
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
        return j
    }


    // The settings, deflated, go after #, which never reaches the server.
    // view: what the page shows them with, beyond the settings file. The
    // formula goes in plain: deflate packs it into half of what it makes of
    // the LZW-compressed one a file holds.
    async makeLink(s, view) {
        const j = this.settingsJSON(s)
        delete j.readableFormula
        delete j.date
        delete j.compressedFormula
        j.thinFormula = s.formulaStructure.compress()
        j.view = view
        const json = new TextEncoder().encode(JSON.stringify(j))
        const packed = await ImportExport.pipeThrough(json, new CompressionStream("deflate-raw"))
        return location.origin + location.pathname + "#s=" + ImportExport.toBase64Url(packed)
    }


    // Settings with their view, or undefined if the hash holds none.
    async parseLink(hash) {
        const m = /^#s=([A-Za-z0-9_-]+)$/.exec(hash)
        if (!m)
            return undefined
        try {
            const packed = ImportExport.fromBase64Url(m[1])
            const json = await ImportExport.pipeThrough(packed, new DecompressionStream("deflate-raw"))
            return this.parseSettingsJSON(new TextDecoder().decode(json))
        }
        catch (e) {
            this.l.warn("could not read the link:", e)
            return undefined
        }
    }


    static async pipeThrough(bytes, stream) {
        const out = new Response(new Blob([bytes]).stream().pipeThrough(stream))
        return new Uint8Array(await out.arrayBuffer())
    }


    static toBase64Url(bytes) {
        let s = ""
        for (let i = 0; i < bytes.length; ++i)
            s += String.fromCharCode(bytes[i])
        return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    }


    static fromBase64Url(s) {
        const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"))
        return Uint8Array.from(b, (c) => c.charCodeAt(0))
    }


    compressFormula(f){
        const thin = f.compress()
        const p = lzwCompress.pack(thin)
        const s = p.toString()
        return s
    }


    decompressFormula(str){
        const arr = str.split(",").map(Number)
        return this.formulaFromThin(lzwCompress.unpack(arr))
    }


    formulaFromThin(thin) {
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

            if (j.hasOwnProperty("thinFormula"))
                j.formulaStructure = this.formulaFromThin(j.thinFormula)
            else if (j.hasOwnProperty("compressedFormula"))
                j.formulaStructure = this.decompressFormula(j.compressedFormula)
            else
                throw "no formula in settings. aborting load"
            delete j.thinFormula
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