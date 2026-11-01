// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


const FuncUtils = {

	l: new Logger("Func Utils"),

	recursionToken: "gen",

    makeJsFriendlyBody: (unfriendlyBody) => {
		let r = /(([a]?(sin|cos|tan)[h|2]?)|log|exp|pow|abs|min|max|sqrt|cbrt|sign|clz32|imul|trunc|ceil|floor|round|hypot|PI|E|LN|LOG[2|10]E|SQRT)/g
		let f = unfriendlyBody.replace(r, "Math.$&")
		r = /random/g
		f = f.replace(r, "Math.$&()")
		return f
	},


	regexForUserNumberToken: (token) => { return new RegExp("(\\b"+ token + "\\b)", "g") },


	replaceAllNumberTokensWithVals: (body, nums, factor, offset) => {
		for (n in nums) {
			const token = `${n}`
			const val = `${nums[n]}`
			body = FuncUtils.replaceNumberTokenByVal(body, token, val)
		}
		body = FuncUtils.replaceNumberTokenByVal(body, "factor", factor)
		body = FuncUtils.replaceNumberTokenByVal(body, "offset", offset)
		return body
	},


	replaceNumberTokenByVal: (body, token, val) => {
		if (val === null) val = 0
		const r = FuncUtils.regexForUserNumberToken(token)
		return body.replace(r, val.toString())
	},


    replaceRecursionTokenInFunctionBody: (body, expression) => {
    	return body.replaceAll(FuncUtils.recursionToken, expression)
    },


	findUniqueNumericEntriesInFunction: (body, nums) => {
		let entries = []
		for (n in nums) {
			const token = `${n}`
			const r = FuncUtils.regexForUserNumberToken(token)
			if (body.search(r) >= 0)
				entries.push(token)
		}
		return entries
	},


	testFunctionValidity: (jsStr) => {
		if (typeof(jsStr) !== "string")
				throw new TypeError("user function body is not a string!")

		if (jsStr.length == 0)
			return false

		FuncUtils.l.log("testing", jsStr)
		try {
			const prohibitedChars = ['\'', '\"', '[', ']', '{', '}', ';']
			prohibitedChars.forEach( c => {
				if (jsStr.includes(c))
					throw new TypeError("unexpected symbol:", c)
			})

			const nested = "( y*y )"
			let body = FuncUtils.replaceRecursionTokenInFunctionBody(jsStr, nested)
			const nums = new NumberSet(1, 2, 3, 4, 5, 6, 7, 8)
			body = FuncUtils.replaceAllNumberTokensWithVals(body, nums, 2, 2)
			const func = FuncUtils.wrapUserFunction(body)
			const x = 1
			const y = 2
			const w = 512
			const h = 512
			const z = 1
			const x0 = 5
			const y0 = 7
			const result = func(nested, x, y, w, h, z, x0, y0)
			const type = typeof(result)
			if (!(type === "number" || type === "boolean"))
				throw new TypeError("not a math/logical expression")
			FuncUtils.l.logok("user function OK")
			return true
		}

		catch (e) {
			FuncUtils.l.warn("test failed:", e.message)
			return false
		}
	},


	functionAllowsRecursion: (fStr) => { return fStr.includes(FuncUtils.recursionToken) },


    wrapUserFunction: (body) => {
    	return new Function(FuncUtils.recursionToken, "x", "y", "w", "h", "z", "x0", "y0", "return " + body)
    },


	formulaArgs: ["x", "y", "w", "h", "z", "x0", "y0"],


	// The body is returned too: workers rebuild the same function from it.
	compileFormula: (str) => {
		let body = "return " + str
		try {
			return [body, FuncUtils.makeFormula(body)]
		}
		catch (e) {
			FuncUtils.l.warn("failed to make formula from string", e.message)
			body = "return false"
			return [body, FuncUtils.makeFormula(body)]
		}
	},


	makeFormula: (body) => { return new Function(...FuncUtils.formulaArgs, body) }
}




const numUtils = {

	pow2gridFix: (n) => {
		const log = Math.log2(n)
		const closest = Math.round(log)
		const d = Math.abs(log - closest)
		const e = 1e-3
		if (d < e)
			n = Math.pow(2, closest)
		return n
	},


	randIntIn: (i) => {
		return Math.floor(Math.random() * (i + 1))
	},


	prob: (n) => {
		return !!n && Math.random() <= n
	}
}