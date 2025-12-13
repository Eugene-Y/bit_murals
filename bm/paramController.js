// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Param {
	constructor(defaultVal = 0.25, preferredMin = 0.0, preferredMax = 1.0) {
		this.defaultVal = defaultVal
		this.value = defaultVal
		this.preferredMin = preferredMin
		this.preferredMax = preferredMax
		// TODO this.description  = description
	}

	getPreferredRange() { return [this.preferredMin, this.preferredMax] }
}




class ParamController {

    constructor(){
        this._params = null
        this.l = new Logger("ParamController")
    }


    setParams(p) {
        this.l.log("setting params")
        this._params = p
    }


    resetParamToDefault(k) {
		this.l.log("setting default param vals")
		const v = this.getParam(k).defaultVal
		this.setParamValue(k, v)
	}


    resetAllParamsToDefault(){ this._params.forEach(p => p.value = p.defaultVal) }


    getParamValue(k) { return this.getParam(k).value }


    setParamValue(k, v) {
		this.l.assert(this.has(k))

		v = Math.max(0.0, v)
		v = Math.min(1.0, v)

		this.setValueDirectly(k, v)

		switch (k) {
			case "|":
				this.setEqualizedGroup(["|", "^", "&", "<<"])
			break
			case "^":
				this.setEqualizedGroup(["^", "&", "<<", "|"])
			break
			case "&":
				this.setEqualizedGroup(["&", "<<", "|", "^"])
			break
			case "<<":
				this.setEqualizedGroup(["<<", "|", "^", "&"])
			break

			case "%":
				this.setEqualizedGroup(["%", "*", "/", "±"])
			break
			case "*":
				this.setEqualizedGroup(["*", "/", "±", "%"])
			break
			case "/":
				this.setEqualizedGroup(["/", "±", "%", "*"])
			break
			case "±":
				this.setEqualizedGroup(["±", "%", "*", "/"])
			break

			case "ln":
				this.setEqualizedGroup(["ln", "e", "√", "tg"])
			break
			case "e":
				this.setEqualizedGroup(["e", "√", "tg", "ln"])
			break
			case "√":
				this.setEqualizedGroup(["√", "tg", "ln", "e"])
			break
			case "tg":
				this.setEqualizedGroup(["tg", "ln", "e", "√"])
			break

			case "◉":
				this.setEqualizedGroup(["◉", "◎", "◒", "◐"])
			break
			case "◎":
				this.setEqualizedGroup(["◎", "◒", "◐", "◉"])
			break
			case "◒":
				this.setEqualizedGroup(["◒", "◐", "◉", "◎"])
			break
			case "◐":
				this.setEqualizedGroup(["◐", "◉", "◎", "◒"])
			break

		  	default:
			break
			}
	}


    setEqualizedGroup(keys){
		let leadVal = this.getParamValue(keys[0])
		if (leadVal > 0.99) leadVal = 1.0
		const left = Math.max(0, 1 - leadVal)

		let sum = 0
		for (let i = 1; i < keys.length; ++i)
			sum += this.getParamValue(keys[i])

		if (sum == 0)
			for (let i = 1; i < keys.length; ++i)
				this.getParam(keys[i]).value = left / (keys.length - 1)
		else
			for (let i = 1; i < keys.length; ++i) {
				let p = this.getParam(keys[i])
				p.value *= left / sum
				//console.log(keys[i], p.value)
			}
	}


    randomizeParams() {
        this.l.logc("randomizing params")
        for (let [k, p] of this._params) {
			const [min, max] = p.getPreferredRange()
			let v = this.getParamValue(k)
			if ((k == "a" || k == "s") && numUtils.prob(0.3)) 
				v = min
			else {
				v += 0.2 * (1 - 2 * Math.random()) * (max - min)
				v = Math.min(v, max)
				v = Math.max(v, min)
			}
            this.l.log(k, v)
            this.setParamValue(k, v) // TODO вероятно можно установить напрямую тк это референс
        }
        this.l.loge()
    }


    getParamKeysAndValues() {
		let kvs = new Map()
		for (let [k, p] of this._params)
			kvs.set(k, p.value)
		return kvs
	}


    setParamsFromKeysAndValues(kvs) {
		this.l.log("setting param vals from keys and values")
		kvs.forEach((v, k) => {
			if (this._params.has(k))
                this.setValueDirectly(k, v)
			else
				this.l.warn("no param", k)
		})
	}


    getParam(k) {
        console.assert(this.has(k))
		return this._params.get(k)
	}

    setValueDirectly(k, v) { this.getParam(k).value = v }

    has(k) { return this._params.has(k) }

}