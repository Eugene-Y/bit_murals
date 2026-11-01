// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Turns the JS expression made by FormulaStringifier into fast code.
//
// The expression is parsed with JS precedence, so the result is value-identical
// to evaluating the text. The text itself makes poor code: recursive user
// functions splice the same subtree in textually again and again (the size
// grows exponentially with depth), and V8 doesn't optimize huge functions.
// So identical subexpressions are calculated once, and big formulas are cut
// into segment functions small enough for the optimizing compiler.
//
// The output is the source of a factory: new Function(source)() is the formula.
class FormulaCompiler {
	constructor() {
		// sizes in expression nodes, tuned on an M3: one bigger function beats
		// segments until V8 stops optimizing it
		this._oneFunctionSize = 8000
		this._segmentSize = 1500
		this._minSharedSize = 3
		this._inOneFunction = true
		this._temps = "$t"
		this.l = new Logger("Formula Compiler")
	}


	compile(expr) {
		try {
			const root = new ExpressionParser().parse(expr)
			return this.emit(root)
		}
		catch (e) {
			this.l.warn("falling back to the plain expression:", e.message)
			return this.plainSource(expr)
		}
	}


	params() { return FuncUtils.formulaArgs.join(", ") }


	plainSource(expr) { return `return function (${this.params()}) { return ${expr} }` }


	emit(root) {
		const order = this.postOrder(root)
		this.markTemps(order, Infinity)
		const total = order.reduce((sum, n) => sum + (n.temp >= 0 || n === root ? n.size : 0), 0)
		this._inOneFunction = total <= this._oneFunctionSize
		if (this._inOneFunction)
			return this.emitOneFunction(root, order)

		this.markTemps(order, this._segmentSize / 2)
		return this.emitSegments(root, order)
	}


	emitOneFunction(root, order) {
		const temps = order.filter(n => n.temp >= 0 && n !== root)
		const locals = temps.map(n => `const ${this.temp(n)} = ${this.expression(n, true)}\n`).join("")
		return `return function (${this.params()}) {\n${locals}return ${this.expression(root, true)}\n}`
	}


	// Segments share the temps through an array in the factory's closure.
	emitSegments(root, order) {
		const params = this.params()
		const temps = order.filter(n => n.temp >= 0 && n !== root)
		const statements = temps.map(n => [`${this.temp(n)} = ${this.expression(n, true)}`, n.size])
		const segments = this.groupIntoSegments(statements)

		let src = `const ${this._temps} = new Array(${temps.length}).fill(0)\n`
		segments.forEach((s, i) => {
			src += `function s${i}(${params}) {\n${s.join("\n")}\n}\n`
		})
		const calls = segments.map((s, i) => `s${i}(${params})\n`).join("")
		src += `return function (${params}) {\n${calls}return ${this.expression(root, true)}\n}`
		this.l.log("temps:", temps.length, "segments:", segments.length)
		return src
	}


	postOrder(root) {
		const order = []
		const visited = new Set()
		const visit = (n) => {
			if (visited.has(n)) return
			visited.add(n)
			n.children.forEach(visit)
			order.push(n)
		}
		visit(root)
		return order
	}


	// A node becomes a temp when it is shared and not trivial to recalculate,
	// or when the expression under it would grow past splitSize.
	markTemps(order, splitSize) {
		const uses = new Map()
		order.forEach(n => n.children.forEach(c => uses.set(c, (uses.get(c) || 0) + 1)))

		let numTemps = 0
		order.forEach(n => {
			n.temp = -1
			n.size = 1
			if (n.isLeaf()) return
			n.children.forEach(c => { n.size += (c.temp >= 0) ? 1 : c.size })
			const shared = uses.get(n) > 1 && n.size >= this._minSharedSize
			if (shared || n.size > splitSize)
				n.temp = numTemps++
		})
	}


	groupIntoSegments(statements) {
		let segments = []
		let current = []
		let size = 0
		statements.forEach(([s, n]) => {
			if (current.length && size + n > this._segmentSize) {
				segments.push(current)
				current = []
				size = 0
			}
			current.push(s)
			size += n
		})
		if (current.length)
			segments.push(current)
		return segments
	}


	temp(n) { return this._inOneFunction ? `${this._temps}${n.temp}` : `${this._temps}[${n.temp}]` }


	expression(n, isDefinition = false) {
		if (n.temp >= 0 && !isDefinition)
			return this.temp(n)
		const e = (c) => { return this.expression(c) }
		const [a, b, c] = n.children
		switch (n.kind) {
			case "num"   : return n.text
			case "name"  : return n.text
			case "unary" : return `(${n.text}${e(a)})`
			case "cond"  : return `(${e(a)} ? ${e(b)} : ${e(c)})`
			case "call"  : return `${n.text}(${n.children.map(e).join(", ")})`
			case "binary": return `(${e(a)} ${n.text} ${e(b)})`
		}
		throw new Error("unknown node kind " + n.kind)
	}
}




class ExpressionNode {
	constructor(kind, text, children = [], pure = true) {
		this.kind = kind
		this.text = text
		this.children = children
		this.pure = pure
	}

	isLeaf() { return this.children.length === 0 }
}




// Builds a DAG: pure subexpressions that read the same are the same node.
class ExpressionParser {
	constructor() {
		this._binaryLevels = [
			["||"], ["&&"], ["|"], ["^"], ["&"],
			["==", "!=", "===", "!=="],
			["<", ">", "<=", ">="],
			["<<", ">>", ">>>"],
			["+", "-"],
			["*", "/", "%"]]
		this._unary = ["-", "+", "!", "~"]
		this._impureCalls = ["Math.random"]
		this._nodes = new Map()
		this._ids = new Map()
	}


	parse(expr) {
		this._tokens = this.tokenize(expr)
		this._pos = 0
		const root = this.conditional()
		if (this._pos !== this._tokens.length)
			throw new Error("unexpected " + this.peek())
		return root
	}


	tokenize(s) {
		const re = /\s*(Math\.[A-Za-z0-9_]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|[A-Za-z_$][A-Za-z0-9_$]*|>>>|===|!==|\*\*|<<|>>|<=|>=|==|!=|&&|\|\||[-+*/%<>&^|?:(),!~])/y
		let tokens = []
		while (re.lastIndex < s.length) {
			const from = re.lastIndex
			const m = re.exec(s)
			if (!m) {
				if (/^\s*$/.test(s.slice(from))) break
				throw new Error("can't tokenize at " + s.slice(from, from + 16))
			}
			tokens.push(m[1])
		}
		return tokens
	}


	peek() { return this._tokens[this._pos] }

	next() { return this._tokens[this._pos++] }

	expect(t) {
		if (this.next() !== t)
			throw new Error("expected " + t)
	}


	node(kind, text, children = []) {
		const pure = children.every(c => c.pure) && !this._impureCalls.includes(text)
		if (!pure)
			return new ExpressionNode(kind, text, children, false)
		const key = kind + " " + text + " " + children.map(c => this.id(c)).join(",")
		let n = this._nodes.get(key)
		if (!n) {
			n = new ExpressionNode(kind, text, children)
			this._nodes.set(key, n)
		}
		return n
	}


	id(n) {
		if (!this._ids.has(n))
			this._ids.set(n, this._ids.size)
		return this._ids.get(n)
	}


	conditional() {
		const c = this.binary(0)
		if (this.peek() !== "?")
			return c
		this.next()
		const a = this.conditional()
		this.expect(":")
		const b = this.conditional()
		return this.node("cond", "?", [c, a, b])
	}


	binary(level) {
		if (level === this._binaryLevels.length)
			return this.exponent()
		let a = this.binary(level + 1)
		while (this._binaryLevels[level].includes(this.peek())) {
			const op = this.next()
			a = this.node("binary", op, [a, this.binary(level + 1)])
		}
		return a
	}


	exponent() {
		const a = this.unary()
		if (this.peek() !== "**")
			return a
		this.next()
		return this.node("binary", "**", [a, this.exponent()])
	}


	unary() {
		if (this._unary.includes(this.peek())) {
			const op = this.next()
			return this.node("unary", op, [this.unary()])
		}
		return this.primary()
	}


	primary() {
		const t = this.next()
		if (t === undefined)
			throw new Error("unexpected end")

		if (t === "(") {
			const e = this.conditional()
			this.expect(")")
			return e
		}

		if (/^[\d.]/.test(t))
			return this.node("num", t)

		if (this.peek() === "(" && t.startsWith("Math.")) {
			this.next()
			let args = []
			if (this.peek() !== ")") {
				args.push(this.conditional())
				while (this.peek() === ",") {
					this.next()
					args.push(this.conditional())
				}
			}
			this.expect(")")
			return this.node("call", t, args)
		}

		if (/^[A-Za-z_$]/.test(t))
			return this.node("name", t)

		throw new Error("unexpected " + t)
	}
}
