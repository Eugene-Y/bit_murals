// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial

class NumberGenerator {
    constructor (getParamValCallback) {
		this._getParamValCallback = getParamValCallback
		this._modes = ['primes', 'pow', 'rationals', 'random']
        this._mode = 3
		this._maxNumber = Math.pow(10, 10)
		this._numberSparsity = 10
		this._numberLogarithm = 10
		this._onlyPositive = false
        this._scaleForZoom = false
		this._inverseProb = 0
		this._scaleRange = 1
		this._consistencyProb = 1 // 0 - randomize every call, 1 = keep same until next formula
		this._primes = [[2, 3, 5, 7, 11],   
						[11, 37, 47, 59, 67],
						[127, 227, 373, 431, 521],
						[1019, 2777, 4447, 5399, 7717],
						[10343, 22717, 31247, 42221, 51637],
						[100019, 240017, 350213, 670147, 700001],
						[1250203, 2120101, 3620069, 4720147, 5120051],
						[13200101, 25100711, 34135111, 44143367, 65145313],
						[145455517, 235435999, 305405999, 395930701, 555555587],
						[1277700313, 2599540421, 4444441777, 5399540353, 7777778087]]
		this._nums = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15]
		this.l = new Logger("NumberGen")
    }

	/*
	invert
	*/

	prepareForNewFormula() { 
		this.randomizeConsistency() 
		this.randomizeNumberProperties()
	}

	randomizeConsistency() {
		this._consistencyProb = numUtils.prob(0.5) ? 1 : Math.random()
		this.l.log("consistency:", this._consistencyProb)
	}


	factorAndOffset(mayApplyFactor = true, mayApplyOffset = true){
		let factor = null
		let offset = null
		if (mayApplyFactor && numUtils.prob(this._getParamValCallback("a")))
			factor = this.number()

		if (mayApplyOffset && numUtils.prob(this._getParamValCallback("s")))
			offset = this.number()

		return [factor, offset]
	}


	number() {
		const unityPoint = 0.5
		const paramVal = this._getParamValCallback("[]")
		let n = 1
		const r = Math.random()
		if (paramVal < unityPoint) {
			let d = (1 - 2 * paramVal) * this._numberSparsity
			d = Math.round(r * d)
			n = 1.0 / Math.pow(2, 1 + d)
		}
		else {
			let d = (paramVal - unityPoint) * 2 // [0, 1]
			d = Math.max(d, 0.05)
			d *= this._numberLogarithm
			n = Math.pow(this._numberSparsity,  1 + r * d) // чем больше основание, тем более разрежены числа
			n = Math.round(n)
		}

		if (numUtils.prob(0.5))
			n = -n

		return n
	}


	randomizeNumberProperties() {
		this._scaleForZoom = numUtils.prob(0.5)
		this._inverseProb = numUtils.prob(0.5) ? 0 : Math.random()

		this._numberSparsity = 2 + Math.round(13 * Math.random())
		this._numberLogarithm = Math.log(this._maxNumber) / Math.log(this._numberSparsity)

		this.l.log("number sparsity", this._numberSparsity)
		this.l.log("number log", this._numberLogarithm)
	}
}




class Generator {
    constructor(){
		this._maxDepth = 12
		this._formulaStructure = new FormulaNode()
		this._formulaMutator = new FormulaMutator(this)
		this._stringifier = new FormulaStringifier(this)
		this._formula = null
        this._params = new Map()

		const nuf = 4
		this._userFunctions = new Array(nuf)
		this._userFunctionsBackup = new Array(nuf)
		// между введением корректной uf и следующей стрингификацией (мутация например)
		// пользовательская функция может быть удалена
		for (let i = 0; i != nuf; ++i) {
			this._userFunctions[i] = new UserFunction
			this._userFunctionsBackup[i] = new UserFunction
		}

		this._numberGen = new NumberGenerator((p) => { return this.getParamValue(p) })
		this._numbers = new NumberSet()
		this._comparisonProb = 0
		this._symmetryProb = 0
		
		this.l = new Logger("Generator")
		this.initializeParams()
		this.generateFormula()
	}


    initializeParams(){
		let p = this._params
		p.set("x/y", new Param(0.5, 0.3, 0.7))
		p.set("d",   new Param(9.0 / this._maxDepth, 0.1, 0.8))
		p.set("()",  new Param(0.5))
		p.set("[]",  new Param(0.25, 0, 0.7))
		p.set("a",   new Param(0, 0, 0.2))
		p.set("s",   new Param(0, 0, 0.5))

		p.set("==",  new Param(0.05, 0, 0.05))
		p.set("B/A", new Param(0.5, 0.2, 0.8))

		p.set("|",  new Param())
		p.set("^",  new Param())
		p.set("&",  new Param(0.25, 0, 0.6))
		p.set("<<", new Param(0.25, 0, 0.75))

		p.set("%", new Param())
		p.set("*", new Param())
		p.set("/", new Param())
		p.set("±", new Param())

		p.set("F",   new Param(0.2))
		p.set("T/U", new Param(0.5))

		p.set("ln", new Param())
		p.set("e",  new Param())
		p.set("√",  new Param(0.25, 0, 0.7))
		p.set("tg", new Param(0.25, 0, 0.7))

		p.set("◉", new Param())
		p.set("◎", new Param())
		p.set("◒", new Param())
		p.set("◐", new Param())

		p.set("⛋", new Param(0, 0, 1))
	}


	getParams()  { return this._params }

	getParamValue(k) { return this._params.get(k).value }


	getReadableUserFunctions() {
		let ufs = []
		this._userFunctions.forEach( f => ufs.push(f.readableBody) )
		return ufs
	}

	numUserFunctions() { return this._userFunctions.length }


	setReadableUserFunctions(r) {
		this.l.log("setting user functions")
		for (let i = 0; i < r.length; ++i)
			if (r[i] !== "") {
				const f = new UserFunction(
					FuncUtils.makeJsFriendlyBody(r[i]),
					r[i],
					FuncUtils.functionAllowsRecursion(r[i]))
				this._userFunctions[i] = f
				this._userFunctionsBackup[i] = f.copy()
				}
			else
				this._userFunctions[i] = new UserFunction()
	}


	checkAndSetUserFunction(i, u) {
		if (u == "") {
			this._userFunctions[i] = new UserFunction()
			return true
		}

		const fs = FuncUtils.makeJsFriendlyBody(u)
		const ok = FuncUtils.testFunctionValidity(fs)

		if (!ok) {
			this._userFunctions[i] = new UserFunction()
			return false
		}

		const f = new UserFunction(fs, u, FuncUtils.functionAllowsRecursion(u))
		this._userFunctions[i] = f
		this._userFunctionsBackup[i] = f.copy()
		return true
	}


	getReadableFormula() { return this._stringifier.stringify(this._formulaStructure, false) }
	getFormulaObject() { return this._formula }
	getFormulaStructure()     { return this._formulaStructure }
	getFormulaStructureCopy() { return this._formulaStructure.copy() }

	setFormulaStructure(fs) {
		this._formulaStructure = fs
		let f = this._stringifier.stringify(this._formulaStructure, true)
		this._formula = FuncUtils.makeFormulaFromString(f)
	}

	setFormulaStructureWithoutUpdates(fs) {
		this._formulaStructure = fs
	}


    generateFormula(){
		//this.l.clear()
		this.updateGeneratorParamsForTheNewPattern()
		const depth = 1 + Math.ceil(this.getParamValue("d") * this._maxDepth)
    	this._formulaStructure = this.generateRecursive(depth, null)
		const stats = this.makeStats(this._formulaStructure)
		this.l.log(stats)
		this.simplify(this._formulaStructure)
		this.l.assert(this.nodeIsValid(this._formulaStructure))
		this.l.log("depth:", depth, "num nodes:", this._formulaStructure.numChildren())
		let f = this._stringifier.stringify(this._formulaStructure, true)
		this._formula = FuncUtils.makeFormulaFromString(f)
    }


	generateRecursive(depth, parent) {
		let n = new FormulaNode(parent)
		n.symmetry = this.symmetry()
		if (depth < 1) {
			n.operand = this.operand(); // do not remove this semicolon
			[n.factor, n.offset] = this._numberGen.factorAndOffset()
			return n
		}
		
		let f = n.function;
		[f.body, f.user] = this.function()

		n.brackets = f.body ? false : this.brackets()

		if (f.body || n.brackets)
			[n.factor, n.offset] = this._numberGen.factorAndOffset();

		let t = n.tree
		if (this.nodeAllowsRecursion(n)) {
			--depth
			t.left = this.generateRecursive(depth, n)
			t.right = this.secondBranch(depth, n)
			if (t.right) {
				t.operation = this.operation()
				// TODO if (this._allowSimplification) simplify(n)
			}
		}

		if (this.nodeIsEmpty(n))
			n = this.generateRecursive(depth, parent)

		//if (!this.nodeIsValid(n)) debugger
		return n
	}


	nodeIsEmpty(n) {
		const lessThanTwoBranches = !n.tree.right
		return lessThanTwoBranches && !n.function.body && !n.operand && !n.brackets
	}


	nodeAllowsRecursion(n){
		if (n.operand) return false
		const f = n.function
		if (!f.body) return true
		return this.nodeHasRecursiveFunction(n)
	}


	nodeHasRecursiveFunction(n){
		const f = n.function
		if (!f.body) return false
		if (!f.user) return true
		return this.userFunctionAllowsRecursion(f.body)
	}


	nodeHasRecursiveUserFunction(n){
		const f = n.function
		if (!f.body) return false
		if (!f.user) return false
		return this.userFunctionAllowsRecursion(n.function.body)
	}


	userFunctionAllowsRecursion(body) {
		const i = this.userFunctionIdFromBody(body)
		const f = this._userFunctions[i]
		return f.allowsRecursion
	}


	getUserFunction(id){
		const f = this._userFunctions[id]
		if (f.isValid())
			return f
		
		const bf = this._userFunctionsBackup[id]
		this.l.assert(bf.isValid())
		return bf
	}


	nodeIsValid(n){
		const t = n.tree
		const hasTree = Boolean(t.left || t.right)
		const hasFunction = Boolean(n.function.body)

		if (n.operand && hasFunction)
			return false

		if (n.operand && hasTree)
			return false

		if (!n.operand && !hasTree && this.nodeHasRecursiveUserFunction(n))
			return false

		if (hasTree) {
			if (t.left && t.right && !t.operation)
				return false

			if ((t.left ^ t.right) && t.operation)
				return false

			if (t.left && !this.nodeIsValid(t.left))
				return false

			if (t.right && !this.nodeIsValid(t.right))
				return false
		}

		return true
	}


	treeHasFactorsOrOffsets(n){
		let found = 0
		if (n.factor || n.offset)
			++found
		
		if (n.tree.left)
			found += this.treeHasFactorsOrOffsets(n.tree.left)
		if (n.tree.right)
			found += this.treeHasFactorsOrOffsets(n.tree.right)
		
		return found
	}


	secondBranch(depth, parent){
		let branchProb = Math.sqrt(this.getParamValue("d"))
		if (depth < 2) branchProb = Math.sqrt(branchProb)
		//if (numUtils.prob(Math.sqrt(this.getParamValue("d")))) {
		let branch = null
		if (numUtils.prob(branchProb))
			branch = this.generateRecursive(depth, parent)
		return branch
	}


	function() {
		let func = null
		let user = false

		if (numUtils.prob(this.getParamValue("F"))) {
			if (!this.numValidUserFunctions() || numUtils.prob(this.getParamValue("T/U")))
				func = this.transcendentalFunction()
			else {
				func = this.userFunction()
				user = true
			}
		}
		return [func, user]
	}


	number () { 
		const n = this._numberGen.number() 
		return this.numberToString(n)
	}


	numberToString(n){
		if (Number.isInteger(n)	&& Math.abs(n) < 100000)
			return n.toString()

		return Number.parseFloat(n).toExponential(3)
	}


	updateGeneratorParamsForTheNewPattern(){
		this._numberGen.prepareForNewFormula()
		this.generateNewNumericParams()
		this.calculateComparisonOperationProb()
	}


	calculateComparisonOperationProb(){
		let p = 1 / Math.pow(1.5, this.getParamValue("d") * this._maxDepth) // основание степени подобрано экспериментально
		const v = this.getParamValue("==")
		p *= v * v
		this._comparisonProb = p;
		this.l.log("comparison prob", p)
	}


	generateNewNumericParams(){
		this.l.logc("new numeric params:")
		for (let n in this._numbers) {
			this._numbers[n] = this._numberGen.number()
			this.l.log('\t', n, this._numbers[n])
		}
		this.l.loge()
	}


	getNumbers() { return this._numbers.copy() }
	setNumbers(s) { this._numbers.load(s) }


	simplify(t) {
		// TODO
		t.brackets = false
	}


    userFunction(){
		// чтобы отображать польз функции как u0, u1... un
		// и не раздувать объекты
		const v = this.numValidUserFunctions()
    	this.l.assert(v)
		const p = Math.random()
		const n = this.numUserFunctions()
		let u = -1
		for (let i = 0, j = 1; i < n; ++i)
			if (this._userFunctions[i].isValid()) {
				if (j / v >= p) {
					u = i
					break
				}
				++j
			}
		this.l.assert(u >= 0 && u < this.numUserFunctions())
    	return "u" + u.toString()
	}


	getUserFunctionStringificationData(b) {
		const i = this.userFunctionIdFromBody(b)
		const f = this.getUserFunction(i)
		return [f.jsBody, f.allowsRecursion]
	}

	
	userFunctionIdFromBody(b) { return parseInt(b.substring(1)) }


	numValidUserFunctions(){
		let v = 0
		this._userFunctions.forEach(f => { if (f.isValid()) ++v })
		return v
	}


    brackets(){ return numUtils.prob(this.getParamValue("()")) }

	factor() { return this._numberGen.number() }
	
	offset() { return this._numberGen.number() }
	
	number() { return this._numberGen.number() }

    operand(){ return (numUtils.prob(this.getParamValue("x/y"))) ? "x" : "y" }

	symmetry(){
		let xy = new Array (2)
		let s = false;
		for (let i = 0; i < 2; i++)
			if (numUtils.prob(1 - this.getParamValue("⛋")))
				xy[i] = 0
			else if (numUtils.prob(0.5)) {
				xy[i] = 1
				s = true
			}
			else {
				xy[i] = -1
				s = true
			}
		if (!s)
			return null
		//this.l.log("symmetry:", xy)
		return xy	
	}


    operation() {
		if (numUtils.prob(this._comparisonProb))
			return this.comparisonOperation()

    	if (numUtils.prob(this.getParamValue("B/A")))
    		return this.bitwiseOperation()
    	else
    		return this.mathOperation()
    }


	comparisonOperation() {
		let s = ""
		if (numUtils.prob(0.75)){
			s = "<"
			if (numUtils.prob(0.5))
				s = ">"
			if (numUtils.prob(0.25))
				s += "="
		}
		else if (numUtils.prob(0.5))
			s = "=="
		else
			s = "!="
		this.l.warn(s)
		return s
	}


    bitwiseOperation() {
    	let p = this.getParamValue("|")
    	if (numUtils.prob(p)) return "|"

    	p += this.getParamValue("&")
    	if (numUtils.prob(p)) return "&"

    	p += this.getParamValue("^")
    	if (numUtils.prob(p)) return "^"

    	if (numUtils.prob(1/2)) return "<<"
    	return ">>"
    }


    mathOperation(){
    	let p = this.getParamValue("%")
    	if (numUtils.prob(p)) return "%"

    	p += this.getParamValue("*")
    	if (numUtils.prob(p)) return "*"

    	p += this.getParamValue("/")
    	if (numUtils.prob(p)) return "/"

    	if (numUtils.prob(1/2)) return "+"
    	return "-"
    }


    transcendentalFunction(){
    	let p = this.getParamValue("ln")
    	if (numUtils.prob(p)) return "log"

    	p += this.getParamValue("e")
    	if (numUtils.prob(p)) return "exp"

    	p += this.getParamValue("√")
    	if (numUtils.prob(p)) return "sqrt"

    	return "tan"
    }


	makeStats(n){
		let stats = new NodeStats(n)
		// TODO augmentStats: подсчитать и добавить проценты внутри групп и тд
		return stats
	}


	mutateFormula(opt){
		this._numberGen.prepareForNewFormula()
		let fn = this._formulaStructure.copy() // wtf без копирования не работает
		let upd = false;
		[this._formulaStructure, upd] = this._formulaMutator.mutateFormula(fn, opt)
		if (upd) 
			this.setFormulaStructure(this._formulaStructure)
		return upd
	}


	usedNumericParamsInFormula(t) {
		let ufids = this.getUserFunctionIdsUsedInFormula(t)
		let usedParams = []
		ufids.forEach(i => {
			const b = this._userFunctions[i].readableBody
			const used = FuncUtils.findUniqueNumericEntriesInFunction(b, this._numbers)
			used.forEach(u => {
				if (!usedParams.includes(u))
					usedParams.push(u)
				})
			})
		return usedParams
	}


	getUserFunctionIdsUsedInFormula(f, ufs = []) {
		if (f.function.user){
			let i = this.userFunctionIdFromBody(f.function.body)
			if (!ufs.includes(i))
				ufs.push(i)
		}

		if (ufs.length == this.numValidUserFunctions())
			return ufs

		const l = f.tree.left
		if (l)
			ufs = this.getUserFunctionIdsUsedInFormula(l, ufs)

		if (ufs.length == this.numValidUserFunctions())
			return ufs

		const r = f.tree.right
		if (r)
			ufs = this.getUserFunctionIdsUsedInFormula(r, ufs)

		return ufs
	}

}