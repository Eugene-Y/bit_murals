// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class UserFunction {
	constructor(jsBody = "", readableBody = "", allowsRecursion = false) {
		this.jsBody = jsBody
		this.readableBody = readableBody
		this.allowsRecursion = allowsRecursion
	}

	isValid() { return this.jsBody !== "" }

	copy() { return new UserFunction(this.jsBody, this.readableBody, this.allowsRecursion) }
}




class NumberSet {
	constructor(a = null, b = null, c = null, d = null,
				e = null, f = null, g = null, h = null) {
		this.a = a
		this.b = b
		this.c = c
		this.d = d
		this.e = e
		this.f = f
		this.g = g
		this.h = h
	}

	copy(){
		return new NumberSet(this.a, this.b, this.c, this.d,
			                 this.e, this.f, this.g, this.h)
	}

	load(nums) {
		for (const n in nums)
			this[n] = `${nums[n]}`
	}
}




class NodeStats {
    constructor (n = new FormulaNode()) {
        this.nodes = n.numChildren() + 1
		this.operands  = new Map()
		this.functions = new Map()
		this.operand   = n.operand ? 1 : 0
		this.function  = n.function.body ? 1 : 0
		this.user      = n.function.user ? 1 : 0
		this.brackets = n.brackets ? 1 : 0
		this.factor   = n.factor ? 1 : 0
		this.offset   = n.offset ? 1 : 0
		this.treeOps      = new Map()
		this.branching    = 0
		this.singleBranch = 0
        this.fill(n)
    }


    fill(n) {
		if (n.operand)
			this.operands.set(n.operand, 1)

		if (n.function.body)
			this.functions.set(n.function.body, 1)

		const t = n.tree
		if (t.left || t.right)
			this.branching = 1

		if (t.left && t.right)
            this.treeOps.set(t.operation, 1)


		if ((t.left && !t.right) ||
		    (!t.left && t.right))
			this.singleBranch = 1

		if (t.left)
			this.merge(new NodeStats(t.left))
		if (t.right)
			this.merge(new NodeStats(t.right))
	}


    merge(other) {
		this.operand   += other.operand
		this.function  += other.function
		this.user      += other.user
		this.brackets  += other.brackets
		this.factor    += other.factor
		this.offset    += other.offset
		this.branching += other.branching

        this.operands = this.mergeMaps(this.operands, other.operands)
        this.functions = this.mergeMaps(this.functions, other.functions)
        this.treeOps = this.mergeMaps(this.treeOps, other.treeOps)
	}

    mergeMaps(m1, m2) {
        if (m2.size == 0)
            return m1
        if (m1.size == 0)
            return m2

        for (const [k, v] of m1)
            if (m2.has(k))
                m2.set(k, m2.get(k) + v)
            else
                m2.set(k, 1)
        return  m2
    }

}