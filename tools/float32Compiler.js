// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Emulates what the formulas would give in a GPU shader: every float is a
// float32, while the JS semantics are kept wherever a shader could keep them.
// Bitwise operations work on exact int32 values (as a shader's int type
// would), and a float goes into them through the same wrap-around as JS
// ToInt32, but calculated in float32. % is JS-style (sign of the dividend),
// also in float32. Math functions are rounded correctly, which is optimistic:
// GPU sin/exp/log/tan are less precise, especially for large arguments.
class Float32FormulaCompiler extends FormulaCompiler {
	constructor() {
		super()
		this._intOps = ["&", "|", "^", "<<", ">>", ">>>"]
	}


	emit(root) {
		const helpers = `
const F = Math.fround
const I = (a) => {
    if (!isFinite(a)) return 0
    const t = F(Math.trunc(a))
    return F(t - F(4294967296 * F(Math.floor(F(t / 4294967296))))) | 0
}
const MOD = (a, b) => F(a - F(b * Math.trunc(F(a / b))))
`
		const params = this.params()
		return helpers
			+ `const formula = (function () {\n${super.emit(root)}\n})()\n`
			+ `return function (${params}) { return formula(F(x), F(y), w, h, F(z), F(x0), F(y0)) }`
	}


	isInt(n) {
		return (n.kind === "binary" && this._intOps.includes(n.text))
			|| (n.kind === "unary" && n.text === "~")
	}


	expression(n, isDefinition = false) {
		if (n.temp >= 0 && !isDefinition)
			return this.temp(n)

		const float = (c) => {
			const s = this.expression(c)
			return this.isInt(c) ? `F(${s})` : s
		}
		const int = (c) => {
			const s = this.expression(c)
			return this.isInt(c) ? s : `I(${s})`
		}

		const [a, b, c] = n.children
		const op = n.text
		switch (n.kind) {
			case "num"  : return `${Math.fround(Number(op))}`
			case "name" : return op.startsWith("Math.") ? `F(${op})` : op
			case "cond" : return `(${float(a)} ? ${float(b)} : ${float(c)})`
			case "call" : return `F(${op}(${n.children.map(float).join(", ")}))`
			case "unary":
				if (op === "~")
					return `(~${int(a)})`
				return `(${op}${float(a)})`
		}

		if (this._intOps.includes(op))
			return `(${int(a)} ${op} ${int(b)})`

		switch (op) {
			case "%" : return `MOD(${float(a)}, ${float(b)})`
			case "**": return `F(Math.pow(${float(a)}, ${float(b)}))`
			case "+" :
			case "-" :
			case "*" :
			case "/" : return `F(${float(a)} ${op} ${float(b)})`
		}
		return `(${float(a)} ${op} ${float(b)})`
	}
}
