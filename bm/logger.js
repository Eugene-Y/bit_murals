// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Logger {
    constructor(name) {
        this.name = name + ':'
        this.active = true
        this.pauseOnAssert = false
    }

    setActive(a) { this.active = a }

    log()  {
        if (this.active) console.log(this.name, ...arguments)
    }

    logg() {
        if (this.active) console.group(this.name, ...arguments)
    }

    logc() {
        if (this.active) console.groupCollapsed(this.name, ...arguments)
    }

    loge() {
        if (this.active) console.groupEnd()
    }

    logok() { 
        if (this.active) 
            console.log("%c%s", "background: rgba(50, 255, 50, 0.3)", "✅ " + this.name, ...arguments)
    }    

	warn() {
        if (this.active) console.warn(this.name, ...arguments)
    }

	error() {
        if (this.active) console.error(this.name, ...arguments)
    }

    assert() {
        console.assert(...arguments)
        if (this.pauseOnAssert)
            debugger
    }

    clear() { console.clear() }

}