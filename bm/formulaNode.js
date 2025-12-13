// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial

const FNObjSeparator = "#"
const FNPropSeparator = "_"

class FormulaNode {
	constructor(parent){
		this.clear()
		this.parent = parent
	}


	clear(){
		this.operand = null
		this.function = {
			body   : null,
			user   : false
		}
		this.tree = {
			left      : false,
			right     : false,
			operation : null
		}
		this.brackets = false
		this.factor = null
		this.offset = null
		this.symmetry = null
		this.parent = null
	}


	numChildren(){
		const L = this.tree.left
		const R = this.tree.right
		return (L ? 1 + L.numChildren() : 0)
			 + (R ? 1 + R.numChildren() : 0)
	}


	swap(other){
		const c1 = this.compress()
		const c2 = other.compress()
		const p1 = this.parent
		const p2 = other.parent
		this.decompress(c2)
		other.decompress(c1)
		this.parent = p2
		other.parent = p1
	}


	copy(){
		let c = new FormulaNode()
		c.decompress(this.compress())
		c.parent = this.parent
		return c
	}


	isFullyEqual(other){
		if (this.brackets != other.brackets) return false
		if (!this.hasEqualNumbers(other)) return false
		if (!this.isEqualEssence(other)) return false
		return true
	}


	isEqualEssence(other){
		if (this.operand != other.operand) return false
		if (this.symmetry != other.symmetry) return false
		if (!this.hasEqualFunction(other)) return false
		if (!this.hasEqualTree(other)) return false
		return true
	}


	hasEqualNumbers(other){
		return (this.factor == other.factor) && (this.offset == other.offset)
	}


	hasEqualFunction(other){
		const f1 = this.function
		const f2 = other.function
		if (f1.body != f2.body) return false
		if (f1.user != f2.user) return false
		return true
	}


	hasEqualTree(other){
		const t1 = this.tree
		const t2 = other.tree
		if (t1.operation != t2.operation) return false
		if ((!t1.left  && t2.left)  || (t1.left  && !t2.left)) return false
		if ((!t1.right && t2.right) || (t1.right && !t2.right)) return false
		if (t1.left  && t2.left  && !t1.left.isFullyEqual(t2.left)) return false
		if (t1.right && t2.right && !t1.right.isFullyEqual(t2.right)) return false
		return true
	}


	compress(){
		let c = {}
		c.p = ""

		if (this.operand)
			c.p += "o" + this.operand + FNObjSeparator

		if (this.symmetry)
			c.p += "s" + this.symmetry + FNObjSeparator

		const f = this.function
		if (f.body) {
			c.p += "f" + f.body + FNPropSeparator
			c.p += (f.user ? 1 : 0) + FNObjSeparator
		}

		if (this.brackets)
			c.p += "b" + FNObjSeparator

		if (this.factor)
			c.p += "m" + this.factor + FNObjSeparator
		if (this.offset)
			c.p += "a" + this.offset + FNObjSeparator

		const t = this.tree
		if (t.left || t.right) {
			c.t = {}
			if (t.left)
				c.t.l = t.left.compress()
			if (t.right)
				c.t.r = t.right.compress()
			if (t.left && t.right)
				c.t.o = t.operation
		}

		if (c.p === "")
			delete c.p

		console.assert(c.hasOwnProperty("p") || c.hasOwnProperty("t"))
		return c
	}


	decompress(c){
		this.clear()
        try {
            if (c.hasOwnProperty("p"))
                this.decompressObjects(c.p)
            if (c.hasOwnProperty("t"))
                this.decompressTree(c.t)
        }
        catch (e){
            console.error("FormulaNode: error while decompressing")
            console.error(e)
        }
	}


    decompressObjects(p){
        let objects = p.split(FNObjSeparator)
		objects.forEach( obj => {
			const t = typeof obj
            if (obj !== "" && typeof obj !== "undefined") {
				const id = obj[0]
				const params = obj.substring(1)
				switch(id) {
					case "o" :
						this.operand = params
						break
					case "b" :
						this.brackets = true
						break
					case "m" :
						this.factor = params
						break
					case "a" :
						this.offset = params
						break
					case "s" :
						this.symmetry = params.split(',')
						break
					case "f" :
						this.decompressFunction(params)
						break
					case "" :
						break
					default:
						console.error("FormulaNode: unknown object id", id)
						break
				}
			}
		})
    }


    decompressFunction(obj){
		const props = obj.split(FNPropSeparator)
        this.function.body = props[0]
        this.function.user = Boolean(parseInt(props[1]))
    }


    decompressTree(t) {
        if (t.hasOwnProperty("l")){
            let l = new FormulaNode()
            l.decompress(t.l)
			l.parent = this
            this.tree.left = l
        }
        if (t.hasOwnProperty("r")){
			let r = new FormulaNode()
            r.decompress(t.r)
			r.parent = this
            this.tree.right = r
        }
		if (this.tree.left && this.tree.right)
			this.tree.operation = t.o
    }


	getSymmetry(){
		let s
		if (this.parent)
			s = this.parent.getSymmetry()
		if (!s)
			s = this.symmetry 
		return s
	}
}


