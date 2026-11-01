// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// One tooltip for the whole page: shows the data-tip of whatever is under the
// pointer, so the text can change while hovering (e.g. the histogram's value).
class Tooltip {
    constructor() {
        this._el = document.createElement("div")
        this._el.className = "tooltip"
        this._el.hidden = true
        document.body.append(this._el)
        document.addEventListener("pointermove", (e) => { this.follow(e) })
        document.addEventListener("pointerleave", () => { this._el.hidden = true })
    }


    follow(e) {
        const target = e.target.closest ? e.target.closest("[data-tip]") : null
        if (!target || !target.dataset.tip) {
            this._el.hidden = true
            return
        }
        this._el.textContent = target.dataset.tip
        this._el.hidden = false
        const margin = 14
        const r = this._el.getBoundingClientRect()
        let x = e.clientX + margin
        let y = e.clientY + margin
        if (x + r.width > window.innerWidth - 4) x = e.clientX - margin - r.width
        if (y + r.height > window.innerHeight - 4) y = e.clientY - margin - r.height
        this._el.style.left = `${Math.max(4, x)}px`
        this._el.style.top = `${Math.max(4, y)}px`
    }
}
