// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Settings {
    constructor(formulaStructure = new FormulaNode(),
                readableFormula = "",
                userFunctions = [],
                numbers = new NumberSet(),
                params = new Map(),
                framing = new Framing(),
                drawingOptions = new DrawingOptions()) {
        this.formulaStructure = formulaStructure
        this.readableFormula = readableFormula
        this.userFunctions = userFunctions
        this.numbers = numbers
        this.params = params
        this.framing = framing
        this.drawingOptions = drawingOptions
    }

    copy() {
        return new Settings(
            this.formulaStructure,
            this.readableFormula,
            this.userFunctions,
            this.numbers,
            this.params,
            this.framing,
            this.drawingOptions)
    }
}




class History {
    constructor(){
        this._history = []
        this._maxSize = 10000
        this.l = new Logger("History")
    }

    add(i) {
        this._history.push(i)
        if (this.length() > this._maxSize)
            this._history.shift()
        this.l.log("adding. size:", this.length())
    }

    get(i) {
        this.l.assert(this.length() > 0)
        this.l.assert(i >= 0)
        this.l.assert(i < this.length())
        i = Math.min(i, this.length() - 1)
        return this._history[i]
    }

    length() { return this._history.length }

    empty() { return this.length() == 0 }

}