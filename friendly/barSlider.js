// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// A slider drawn as a gray bar, like the ones in the classic page.
//   drag            - jump to the pointer
//   shift + drag    - fine, relative to where the drag started
//   wheel           - fine step, shift + wheel - 10 times coarser
//   double click    - default value
//   click on number - type a value
class BarSlider {
    constructor(label, scale) {
        this._scale = scale
        this._value = scale.fromUnits(0)
        this._defaultValue = this._value
        this._fineUnitsPerPx = 0.01
        this._wheelUnits = 0.1
        this._format = ScaleUtils.formatNumber
        this._onChange = () => {}

        this._el = document.createElement("div")
        this._el.className = "bar-slider"
        this._fill = document.createElement("div")
        this._fill.className = "fill"
        this._label = document.createElement("span")
        this._label.className = "label"
        this._readout = document.createElement("span")
        this._readout.className = "readout"
        this._el.append(this._fill, this._label, this._readout)

        this.setLabel(label)
        this.listen()
        this.refresh()
    }


    element() { return this._el }

    getValue() { return this._value }

    setLabel(text) { this._label.textContent = text }

    setTooltip(text) { this._el.dataset.tip = text }

    setReadoutFormatter(f) {
        this._format = f
        this.refresh()
    }

    setReadoutVisible(v) { this._readout.hidden = !v }

    setFillFromRight(r) { this._el.classList.toggle("from-right", r) }

    setFineStep(unitsPerPx, wheelUnits) {
        this._fineUnitsPerPx = unitsPerPx
        this._wheelUnits = wheelUnits
    }

    setDefaultValue(v) { this._defaultValue = v }

    setVisible(v) { this._el.hidden = !v }

    onChange(cb) { this._onChange = cb }


    setValue(v) {
        this._value = v
        this.refresh()
    }


    refresh() {
        const t = ScaleUtils.toPosition(this._scale, this._value)
        this._fill.style.width = `${100 * Math.min(1, Math.max(0, t))}%`
        this._readout.textContent = this._format(this._value)
    }


    change(v) {
        this.setValue(v)
        this._onChange(this._value)
    }


    positionAt(clientX) {
        const r = this._el.getBoundingClientRect()
        let t = (clientX - r.left) / r.width
        if (this._el.classList.contains("from-right"))
            t = 1 - t
        return Math.min(1, Math.max(0, t))
    }


    listen() {
        let fineFrom = null
        this._el.addEventListener("pointerdown", (e) => {
            if (e.target === this._readout)
                return
            this._el.setPointerCapture(e.pointerId)
            if (e.shiftKey)
                fineFrom = { x: e.clientX, units: this._scale.toUnits(this._value) }
            else {
                fineFrom = null
                this.change(ScaleUtils.fromPosition(this._scale, this.positionAt(e.clientX)))
            }
        })
        this._el.addEventListener("pointermove", (e) => {
            if (!this._el.hasPointerCapture(e.pointerId))
                return
            if (fineFrom) {
                const sign = this._el.classList.contains("from-right") ? -1 : 1
                const units = fineFrom.units + sign * (e.clientX - fineFrom.x) * this._fineUnitsPerPx
                this.change(this._scale.fromUnits(units))
            }
            else
                this.change(ScaleUtils.fromPosition(this._scale, this.positionAt(e.clientX)))
        })
        this._el.addEventListener("pointerup", (e) => { this._el.releasePointerCapture(e.pointerId) })
        this._el.addEventListener("wheel", (e) => {
            e.preventDefault()
            const steps = e.deltaY < 0 ? 1 : -1
            const units = this._scale.toUnits(this._value) + steps * this._wheelUnits * (e.shiftKey ? 10 : 1)
            this.change(this._scale.fromUnits(units))
        }, { passive: false })
        this._el.addEventListener("dblclick", (e) => {
            if (e.target !== this._readout)
                this.change(this._defaultValue)
        })
        this._readout.addEventListener("click", () => { this.editReadout() })
    }


    editReadout() {
        const input = document.createElement("input")
        input.className = "readout-edit"
        input.value = String(this._value)
        this._readout.replaceWith(input)
        input.focus()
        input.select()
        const finish = (apply) => {
            const v = parseFloat(input.value)
            input.replaceWith(this._readout)
            if (apply && !isNaN(v))
                this.change(this._scale.clamp(v))
        }
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") finish(true)
            if (e.key === "Escape") finish(false)
            e.stopPropagation()
        })
        input.addEventListener("blur", () => { if (input.isConnected) finish(true) })
    }
}
