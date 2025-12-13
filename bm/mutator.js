// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class FormulaMutator {
    constructor(generator) {
        this._generator = generator
        this.l = new Logger("Mutator")
    }


    mutateFormula(t, opt) {
        //this.l.clear()
        this.l.log("tree size", t.numChildren() + 1, "log2", Math.ceil(Math.log2(t.numChildren() + 1)))

        let m = false
        const notMutated = () => { return !m }
        let attempt = 1

        if (typeof opt === "undefined") {
            const mutateRandomly = () => {
                m = this.randomMutationType(t)
                if (!m)
                    this.l.warn("random mutation attempt #", ++attempt)
            }
            this.repeatActionWhileCondition(mutateRandomly, notMutated, 10)
        }

        else {
            const mutateSelective = () => {
                m = this.selectedMutationType(t, opt)
                if (!m)
                    this.l.warn("selective mutation attempt #", ++attempt)
            }
            this.repeatActionWhileCondition(mutateSelective, notMutated, 10)
        }

        if (m)
            this.l.logok("mutation OK")
        else
            this.l.warn("no mutation took place")

        this.l.assert(this._generator.nodeIsValid(t))
        return [t, m]
    }


    selectedMutationType(t, opt) {
        switch (opt) {
            case 1:
                return this.mutateNumbers(t)
                break
            case 2:
                return this.mutateOperand(t)
                break
            case 3:
                return this.mutateFunction(t)
                break
            case 4:
                return this.mutateTreeOperation(t)
                break
            case 5:
                return this.mutateBranches(t)
                break
            case 6:
                return this.mutateBrackets(t)
                break
            default:
                this.l.warn("unknown mutation option", opt)
                break
            }

        return false
    }


    randomMutationType(t) {
        const m = numUtils.randIntIn(4) + 1
        return this.selectedMutationType(t, m)
    }


    mutateOperand(t) {
        this.l.logc("mutating operand")

        let operands = []
        let isOperand = (n) => { return n.operand }

        if (numUtils.prob(0.125))
            operands[0] = this.balancedRandomPickANodeByCondition(t, isOperand)

        else {
            let n = this.balancedRandomPickAnyNode(t)
            operands = this.pickAllNodesThatSatisfyCondition(n, isOperand)
        }

        if (operands.length == 0){
            this.l.log("no operands found")
            return false
        }

        let m = false
        const opt = numUtils.randIntIn(2)
        if (opt == 0 && operands.length > 2)
            m = this.randomizeOperand(operands)
        else if (opt == 1)
            m = this.flipAroundAxis(operands)
        else
            m = this.rotateXY(operands)

        if (!m)
            this.l.log("could not mutate operand")
        this.l.loge()
        return m
    }


    rotateXY(nodes) {
        this.l.log("rotating XY", nodes.length)
        nodes.forEach(n => {
            if (n.operand == "x")
                n.operand = "y"
            else
                n.operand = "x"
        })
        return true
    }


    flipAroundAxis(nodes) {
        let flip = (a) => {
            nodes.forEach(n => {
                if (n.operand == a)
                    n.factor = n.factor ? -n.factor : -1
            })
        }

        let flippedX = false
        if (numUtils.prob(0.5)) {
            this.l.log("flipping X", nodes.length)
            flippedX = true
            flip("x")
        }
        if (!flippedX || numUtils.prob(0.5)) {
            this.l.log("flipping Y", nodes.length)
            flip("y")
        }
        return true
    }


    randomizeOperand(nodes) {
        this.l.log("randomizing operands", nodes.length)
        let m = false
        nodes.forEach(n => {
            const old = n.operand
            n.operand = this._generator.operand()
            m |= (old !== n.operand)
        })
        return m
    }


    mutateBranches(t) {
        this.l.logc("mutating branches")
        let m = false
        const opt = numUtils.randIntIn(3)
        switch (opt) {
            default:
            case 0:
                m = this.swapRandomBranches(t)
                break
            case 1:
                m = this.deleteBranch(t)
                break
            case 2:
                m = this.replaceBranch(t)
                break
            case 3:
                m = this.addBranch(t)
                break
        }
        this.l.loge()
        return m
    }


    swapRandomBranches(t) {
        this.l.log("swapping branches")
        if (t.numChildren() < 7) {
            this.l.log("the formula is too small")
            return false
        }

        const numChildren = t.numChildren()
        let bigTree = (n) => {
            const L = n.tree.left
            const R = n.tree.right
            const cL = L ? L.numChildren() + 1 : 0
            const cR = R ? R.numChildren() + 1 : 0
            return L && R && cL + cR >= 3 // usually, no effect swapping in a tree with only 2 nodes
        }

        let n = this.balancedRandomPickANodeByCondition(t, bigTree)
        if (!n) {
            this.l.log("could not select branches to swap")
            return false
        }

        let a = this.balancedRandomPickAnyNode(n.tree.left)
        let b = this.balancedRandomPickAnyNode(n.tree.right)
        this.l.log("subtrees sizes", a.numChildren(), b.numChildren())
        a.swap(b)
        this.l.log("swapped subtrees sizes", a.numChildren() + 1, b.numChildren() + 1)
        this.l.assert(t.numChildren() == numChildren)
        this.l.assert(this._generator.nodeIsValid(t))
        return true
    }


    addBranch(t) {
        let operandOrOneBranch = (n) => { return n.operand || (n.tree.left && !n.tree.right) }
        let n = this.balancedRandomPickANodeByCondition(t, operandOrOneBranch)
        if (n.operand) {
            this.l.log("deleting operand", n.operand, "before branching")
            n.operand = null
        }
        const d = 1 + Math.ceil(Math.random() * Math.log2(t.numChildren() / 4))
        const b = this._generator.generateRecursive(d)
        if (n.tree.left) {
            n.tree.right = b
            n.tree.operation = this._generator.operation()
            this.l.log("new tree operation", n.tree.operation)
        }
        else
            n.tree.left = b
        this.l.log("added branch of size", b.numChildren())
        return true
    }


    deleteBranch(tr) {
        let hasBranch = (n) => { return n.tree.left || n.tree.right }
        let n = this.balancedRandomPickANodeByCondition(tr, hasBranch)

        if (!n) {
            this.l.log("could not find a branch to delete")
            return false
        }

        let t = n.tree
        let c = t.left.numChildren()

        t.operation = null
        if (t.left && t.right) {
            if (numUtils.prob(0.5)) {
                c = t.right.numChildren()
                t.right = null
            }
            else {
                t.right.swap(t.left)
                t.right = null
            }
        }

        else {
            t.left = null
            t.right = null
            if (!n.function.body) {
                n.operand = this._generator.operand()
                n.brackets = true
            }
        }

        this.l.log("deleted a branch of size", c)
        return true
    }


    replaceBranch(t) {
        const maxCh = t.numChildren() / 8
        let small = (n) => { return n.numChildren() <= maxCh }
        let n = this.balancedRandomPickANodeByCondition(t, small)

        if (!n) {
            this.l.log("could not find a branch to replace")
            return false
        }

        const s1 = n.numChildren()
        const d = Math.max(1, 2 * Math.random() * Math.log2(s1))
        let b = this._generator.generateRecursive(d)
        n.swap(b)
        const s2 = n.numChildren()
        this.l.log("replaced a branch of size", s1, "by a new one of size", s2)
        return true
    }


    mutateFunction(t) {
        this.l.logc("mutating function")
        let m = false
        if (numUtils.prob(0.75)) {
            if (numUtils.prob(0.25))
                m = this.removeFunction(t)
            else
                m = this.replaceFunction(t)
        }
        else
            m = this.addFunction(t)

        if (!m)
            this.l.log("could not mutate function")
        this.l.loge()
        return m
    }


    removeFunction(t) {
        const hasFunction = (n) => { return n.function.body }
        let n = this.balancedRandomPickANodeByCondition(t, hasFunction)
        if (!n) {
            this.l.log("could not remove function")
            //debugger
            return false
        }

        if (this._generator.nodeHasRecursiveFunction(n))
            this.l.log("removing function", n.function.body)
        
        else {
            const oldF = n.function.body
            const pickOperand = () => { n.operand = this._generator.operand() }
            const sameMath = () => { return n.operand == oldF }
            const m = this.repeatActionWhileCondition(pickOperand, sameMath)
            // если при выборе операнда можно выбрать нерекурсивную функцию
            this.l.assert(this._generator.nodeIsValid(n))
            
            if (!m) {
                n.operand = null
                this.l.log("could not remove non-recursive function")
                return false
            }
            
            this.l.log("replaced non-recursive function", n.function.body, "with operand", n.operand)
        }

        n.function.body = null
        n.function.user = false

        this.l.assert(this._generator.nodeIsValid(n))
        return true
    }


    replaceFunction(t) {
        const hasFunction = (n) => { return n.function.body }
        let n = this.balancedRandomPickANodeByCondition(t, hasFunction)
        if (!n) {
            this.l.log("could not replace function")
            //debugger
            return false
        }

        const old = n.function.body
        const sameFunction = () => { return n.function.body === old }

        let pickAFunction
        if (this._generator.nodeHasRecursiveFunction(n))
            pickAFunction = () => {
                let [body, user] = this._generator.function()
                if (!body) return
                if (!user || this._generator.userFunctionAllowsRecursion(body))
                    [n.function.body, n.function.user] = [body, user]
            }

        else
            pickAFunction = () => {
                let [body, user] = this._generator.function()
                if (!body) return
                if (user && !this._generator.userFunctionAllowsRecursion(body))
                    [n.function.body, n.function.user] = [body, user]
            }

        const m = this.repeatActionWhileCondition(pickAFunction, sameFunction)

        if (m)
            this.l.log("replaced function", old, "by", n.function.body)
        else {
            this.l.log("could not replace function")
            //debugger
        }

        this.l.assert(this._generator.nodeIsValid(n))
        return m
    }


    addFunction(t) {
        const hasTreeAndNoFunction = (n) => { return (n.tree.left || n.tree.right) && !n.function.body }
        let n = this.balancedRandomPickANodeByCondition(t, hasTreeAndNoFunction)
        if (!n) {
            this.l.log("could not add function")
            //debugger
            return false
        }

        this.l.assert(n.tree.left || n.tree.right)

        let addFunction = () => {
            const [body, user] = this._generator.function()
            if (!body) return
            if (!user || this._generator.userFunctionAllowsRecursion(body)) {
                let f = n.function;
                [f.body, f.user] = [body, user]
            }
        }
        const hasNoFunction = () => { return !n.function.body }
        const m = this.repeatActionWhileCondition(addFunction, hasNoFunction)

        if (m)
            this.l.log("added function", n.function.body)
        else {
            this.l.log("could not add function")
            //debugger
        }

        this.l.assert(this._generator.nodeIsValid(n))
        return m
    }


    mutateTreeOperation(t) {
        this.l.logc("mutating tree operation")
        let m = false
        let hasTreeOperation = (n) => { return n.tree.operation }
        let n = this.balancedRandomPickANodeByCondition(t, hasTreeOperation)
        if (!n) {
            this.l.log("no nodes with tree operation found")
            return false
        }

        const old = n.tree.operation
        let pickOperation = () => { n.tree.operation = this._generator.operation() }
        let sameOperation = () => { return n.tree.operation === old }
        m = this.repeatActionWhileCondition(pickOperation, sameOperation)
        if (!m)
            this.l.log("could not mutate tree operation")
        else
            this.l.log("changed tree operation", old, "to", n.tree.operation)
        this.l.loge()
        return m
    }


    mutateNumbers(t) {
        this.l.logc("mutating numbers")
        const usedParams = this._generator.usedNumericParamsInFormula(t)
        let m = false
        if (usedParams.length && numUtils.prob(0.5))
            m = this.mutateGenNumericParams(usedParams)
        else
            m = this.mutateFactorAndOffset(t)
        this.l.loge()
        return m
    }


    mutateFactorAndOffset(t) {
        this.l.log("mutating factor and offset")

        let n = this.balancedRandomPickAnyNode(t)
        let nodes = []

        if (numUtils.prob(0.6)) {
            this.l.log("mutating only existing factors & offsets")
            const hasFO = (n) => { return this._generator.treeHasFactorsOrOffsets(n) }
            nodes = this.pickAllNodesThatSatisfyCondition(n, hasFO)
        }
        else {
            this.l.log("mutating random nodes")
            nodes = this.pickAllNodes(n)
        }

        if (numUtils.prob(0.5) && nodes.length > 1){
            this.l.log("mutating single node")
            nodes = [nodes[0]]
        }

        if (nodes.length == 0) {
            this.l.log("could not mutate factor and offset")
            return false
        }

        let m = false
        const opt = numUtils.randIntIn(2)
        if (opt == 0)
            m = this.scaleNodes(nodes)
        else if (opt == 1)
            m = this.offsetNodes(nodes)

        else
            m = this.randomizeFactorAndOffset(nodes)

        if (!m)
            this.l.log("could not mutate factor and offset")
        return m
    }


    scaleNodes(nodes) {
        const nums = [1.25, 1.5, 2, 3, 4, 5, 8]
        let a = nums[numUtils.randIntIn(nums.length - 1)]
        if (numUtils.prob(0.5))
            a = 1 / a
        this.l.log("scaling", nodes.length, "nodes by", a)

        nodes.forEach(n => {
            if (n.factor) {
                a *= parseFloat(n.factor)
                n.factor = this._generator.numberToString(a)
            }
            else
                n.factor = this._generator.numberToString(a)
        })
        return true
    }


    offsetNodes(nodes) {
        let a = numUtils.randIntIn(255) + 1
        if (numUtils.prob(0.5))
            a = 1 / a
        if (numUtils.prob(0.5))
            a = -a
        this.l.log("offsetting", nodes.length, "nodes by", a)

        nodes.forEach(n => {
            if (n.offset) {
                a += parseFloat(n.offset)
                n.offset = this._generator.numberToString(a)
            }
            else
                n.offset = this._generator.numberToString(a)
        })
        return true
    }


    randomizeFactorAndOffset(nodes) {
        this.l.log("randomizing nodes factors and offsets", nodes.length)
        let m = false

        nodes.forEach(n => {
            let mutateFactorAndOffset = () => {
                if (numUtils.prob(0.25))
                    n.factor = this._generator.factor()
                else if (numUtils.prob(0.25))
                    n.factor = 1

                if (numUtils.prob(0.25))
                    n.offset = this._generator.offset()
                else if (numUtils.prob(0.25))
                    n.offset = 0
            }
            const f = n.factor
            const o = n.offset
            let sameFactorOrOffset = () => { return n.factor == f && n.offset == o }
            m |= this.repeatActionWhileCondition(mutateFactorAndOffset, sameFactorOrOffset, 100)
        })
        return m
    }


    mutateGenNumericParams(usedParams) {
        this.l.log("mutating gen numeric params")
        let nums = this._generator._numbers;
        const prob = Math.max(1, numUtils.randIntIn(usedParams.length)) / usedParams.length
        let m = false;
        usedParams.forEach(p => {
            if (numUtils.prob(prob)) {
                const old = nums[p];
                const newNum = () => { nums[p] = this._generator.number() }
                const sameNum = () => { return nums[p] == old }
                const mp = this.repeatActionWhileCondition(newNum, sameNum, 100)
                m |= mp
                if (mp)
                    this.l.log("\tchanged", p, "from", old, "to", nums[p])
            }
        })
        return m
    }


    mutateBrackets(t){
        this.l.logc("mutating brackets")
        let m = false

        if (numUtils.prob(0.5))
            m = this.mutateOnePairOfBrackets(t)

        const n = this.balancedRandomPickANodeByCondition(t,
            (n) => { return n.numChildren() > 0 })

        let nodes = this.pickAllNodes(n)
        const opt = numUtils.randIntIn(2)
        switch (opt) {
            case 0:
                m = this.toggleBrackets(nodes)
                break
            case 1:
                m = this.changeAllBracketsTo(nodes, true)
                break
            case 2:
                m = this.changeAllBracketsTo(nodes, false)
                break
        }
        this.l.loge()
        return m

    }


    mutateOnePairOfBrackets(t) {
        let potent = (n) => {
            return (!n.operand && !n.function.body) || n.offset
        }
        let n = this.balancedRandomPickANodeByCondition(t, potent)
        n.brackets = !n.brackets
        this.l.log("inverted single pair of brackets")
        return true
    }


    toggleBrackets(nodes) {
        nodes.forEach(n => { n.brackets = !n.brackets })
        this.l.log("toggled", nodes.length, "brackets")
        return true
    }


    changeAllBracketsTo(nodes, state) {
        let m = 0
        nodes.forEach(n => {
            m += (n.brackets != state)
            n.brackets = state
        })
        this.l.log((state ? "added" : "removed"), m, "brackets")
        return m
    }


    repeatActionWhileCondition(action, condition, maxAttempts = 20) {
        let a = 0
        while (condition.call(this) && a < maxAttempts) {
            action.call(this)
            ++a
        }
        return !condition.call(this)
    }


    balancedRandomPickAnyNode(t){
        return this.balancedRandomPickANodeByCondition(t, (n) => { return true })
    }


    balancedRandomPickANodeByCondition(t, condition) {
        // в деревьях вероятность выбора маленьких веток больше из-за их численности
        // поэтому надо выбирать по рандомному размеру ветки
        const picks = this.pickAllNodesThatSatisfyCondition(t, condition)
        if (picks.length == 0) {
            //this.l.log("no nodes match condition")
            return null
        }
        //this.l.log(picks.length, "nodes match the condition")

        const balancedSize = this.pickBalancedSize(t)
        this.l.log("balanced size", balancedSize)

        let requiredSize = balancedSize
        const sizeRequirement = (n) => { return n.numChildren() == requiredSize }

        let repeatCondition = () => { return requiredSize <= t.numChildren() }
        let loosenRequiredSize = () => { ++requiredSize }
        if (requiredSize >= t.numChildren()) {
            //this.l.log("going down")
            repeatCondition = () => { return requiredSize >= 0 }
            loosenRequiredSize = () => { --requiredSize }
        }

        while (repeatCondition()) {
            const balancedPicks = picks.filter(n => sizeRequirement.call(this, n))
            if (balancedPicks.length == 0)
                loosenRequiredSize()

            else {
                if (requiredSize != balancedSize)
                    this.l.log("loosened size requirement", Math.abs(balancedSize - requiredSize), "times")
                const i = numUtils.randIntIn(balancedPicks.length - 1)
                this.l.log("picked id", i, "num children", balancedPicks[i].numChildren())
                return balancedPicks[i]
            }
        }

        this.l.log("could not balance pick. returning random pick")
        const i = numUtils.randIntIn(picks.length - 1)
        return picks[i]
    }


    pickBalancedSize(t) {
        const size = t.numChildren() + 1
        const depth = Math.ceil(Math.log2(size))
        const level = Math.floor(Math.random() * depth) + 1
        let balanced = Math.pow(2, depth - (level - 1)) - 1 - 1
        return Math.min(balanced, t.numChildren())
    }


    pickAllNodes(t){
        return this.pickAllNodesThatSatisfyCondition(t, (n) => { return true })
    }


    pickAllNodesThatSatisfyCondition(t, condition) {
        let picks = []
        if (condition.call(this, t))
            picks.push(t)

        if (t.tree.left)
            picks = picks.concat(this.pickAllNodesThatSatisfyCondition(t.tree.left, condition))
        if (t.tree.right)
            picks = picks.concat(this.pickAllNodesThatSatisfyCondition(t.tree.right, condition))
        return picks
    }


    prob(x) { return this._generator.prob(x) }


    recordPick(node) {
        if (!node.hasOwnProperty("picked")) node.picked = 1
        else node.picked += 1
    }


    logPicks(t) {
        const L = t.tree.left
        const R = t.tree.right

        let s = "."
        if (!L && R) s = ">"
        else if (L && !R) s = "<"
        else if (L && R) s = "Y"
        else if (!t.operand && !t.tree.right && !t.function.body && !t.brackets)
            s = "empty"

        this.l.log(t.picked, s)
        if (L)
            this.logPicks(L)
        if (R)
            this.logPicks(R)
    }


}