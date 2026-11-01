// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// One tooltip for the whole page: shows the data-tip of whatever the pointer
// rests on, and hides as soon as the pointer moves on, so it doesn't stay in
// the way. The text is read when it shows, so it can change while hovering
// (e.g. the histogram's value).
class Tooltip {
    constructor() {
        this._delayMs = 500
        this._moveTolerancePx = 3
        this._timer = null
        this._shownAt = null
        this._el = document.createElement("div")
        this._el.className = "tooltip"
        this._el.hidden = true
        document.body.append(this._el)
        document.addEventListener("pointermove", (e) => { this.onMove(e) })
        document.addEventListener("pointerdown", () => { this.hide() })
        document.addEventListener("pointerleave", () => { this.hide() })
    }


    onMove(e) {
        if (this._shownAt && Math.hypot(e.clientX - this._shownAt[0], e.clientY - this._shownAt[1]) <= this._moveTolerancePx)
            return
        this.hide()
        const target = e.target.closest ? e.target.closest("[data-tip]") : null
        if (target)
            this._timer = setTimeout(() => { this.show(target, e.clientX, e.clientY) }, this._delayMs)
    }


    hide() {
        clearTimeout(this._timer)
        this._timer = null
        this._shownAt = null
        this._el.hidden = true
    }


    show(target, clientX, clientY) {
        if (!target.isConnected || !target.dataset.tip)
            return
        this._el.textContent = target.dataset.tip
        this._el.hidden = false
        this._shownAt = [clientX, clientY]
        const margin = 14
        const r = this._el.getBoundingClientRect()
        let x = clientX + margin
        let y = clientY + margin
        if (x + r.width > window.innerWidth - 4) x = clientX - margin - r.width
        if (y + r.height > window.innerHeight - 4) y = clientY - margin - r.height
        this._el.style.left = `${Math.max(4, x)}px`
        this._el.style.top = `${Math.max(4, y)}px`
    }
}
