// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class FormulaStringifier {
    constructor(generator) { this._generator = generator }

    stringify(node, makeJsFriendly){
		let str = ""

		if (node.operand) {
			let symmetry = node.getSymmetry()
			if (symmetry)
				str = this.symmetryString(node.operand, symmetry, 0, 0, makeJsFriendly)
			else
				str = node.operand
			str = this.factorAndOffsetString(str, node.factor, node.offset)
			return str
		}

		let t = node.tree
		if (t.left)
			str += this.stringify(t.left, makeJsFriendly)
		if (t.left && t.right)
			str += " " + t.operation + " "
		if (t.right)
			str += this.stringify(t.right, makeJsFriendly)

		let f = node.function
		if (f.body)
			str = this.functionString(str, f.body, f.user,
									  node.factor, node.offset,
								 	  makeJsFriendly)

		str = this.factorAndOffsetString(str, node.factor, node.offset)
		if (node.brackets && !node.offset)
			str = "(" + str + ")"

		return str
	}


	symmetryString(operand, symmetryType, oX, oY, makeJsFriendly) {
		let str = "";
		// https://www.desmos.com/calculator/m9cgormmw6
		const sym = operand == "x" ? symmetryType [0] : symmetryType [1];

		if (sym == 0)
			return operand

		const compare = sym == 1 ? ">" : "<"
		const offset = operand == "x" ? "(x0+w/2*z)" : "(y0+h/2*z)"
		// TODO reframe relative to the center
		if (makeJsFriendly) {
			str = "(" + operand + compare + offset + "?" + operand 
			str += ":-" + operand + "+2*" + offset + ")" // TODO correct
		}
		else {
			str = operand + "ₛ"
			if (sym == -1)
				str += "₋";
		}

		return str
	}


    factorAndOffsetString(body, factor, offset){
		if (factor && parseFloat(factor) !== 1) {
			if (body.length > 2) // not x, y, x0, y0
				body = "(" + body + ")"
			body = factor + " * " + body
		}
		if (offset && parseFloat(offset) !== 0) 
			body = "(" + body + " + " + offset + ")"
		return body
	}


    functionString(gen, fbody, user, factor, offset, makeJsFriendly){
		if (user)
			return this.userFunctionString(gen, fbody, factor, offset, makeJsFriendly)
		else
			return this.transcendentalFunctionString(gen, fbody, makeJsFriendly)
	}


	transcendentalFunctionString(gen, fbody, makeJsFriendly){
		gen = fbody + "(" + gen + ")"
		if (makeJsFriendly) gen = "Math." + gen
		return gen
	}


	userFunctionString(gen, fbody, factor, offset, makeJsFriendly){
		let [jsBody, isRecursive] = this._generator.getUserFunctionStringificationData(fbody)
		const shortBody = makeJsFriendly ? "" : fbody

		if (gen === "") gen = "false" // пользовательская функция может оказаться на самом верхнем уровне,
		// когда gen еще пустой.
		
		if (makeJsFriendly)
			jsBody = FuncUtils.replaceAllNumberTokensWithVals(jsBody,
															  this._generator.getNumbers(),
															  factor, offset)

		// в user function могут быть несколько операндов
		// и тогда без скобок она не будет целиком участвовать в бинарных операциях

		if (isRecursive) {
			if (makeJsFriendly)
				return "(" + FuncUtils.replaceRecursionTokenInFunctionBody(jsBody, gen) + ")"
			else
				return shortBody + "(" + gen + ")"
		}

		else {
			if (makeJsFriendly)
				return "(" + jsBody + ")"
			else
				return shortBody
		}
	}

}