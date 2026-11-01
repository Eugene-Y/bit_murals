// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// Runs inside a worker: its source is stringified together with the helpers
// it calls, so it must not touch anything else from the page.
function patternWorkerMain() {
    let job = null
    let formula = null

    onmessage = (e) => {
        const m = e.data
        if (m.type === "job") {
            job = m.job
            formula = new Function(...m.args, m.body)
            return
        }

        const t0 = performance.now()
        const values = calculatePatternChunk(formula, job, m.start, m.count)
        const ms = performance.now() - t0
        postMessage({ gen: job.gen, start: m.start, values: values, ms: ms }, [values.buffer])
    }
}




class PatternWorkers {
    constructor(onChunk) {
        this._onChunk = onChunk
        this._workers = []
        this._inFlight = []
        this._maxInFlight = 2
        this._job = null
        this._nextStart = 0
        this._chunkSize = 1024
        this._minChunkSize = 64
        this._maxChunkSize = 65536
        // small chunks keep stale work short after a pattern change
        this._targetChunkMs = 25
        this.l = new Logger("Pattern Workers")
        this.spawn()
    }


    spawn() {
        const helpers = [patternPixelIndex, normalizePatternValue, calculatePatternChunk, patternWorkerMain]
        const src = helpers.map(f => f.toString()).join("\n\n") + "\n\npatternWorkerMain()"
        const hc = navigator.hardwareConcurrency || 4
        const n = Math.max(1, Math.min(hc - 1, 8))
        try {
            const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }))
            for (let i = 0; i < n; ++i) {
                const w = new Worker(url)
                w.onmessage = (e) => { this.onMessage(i, e.data) }
                this._workers.push(w)
                this._inFlight.push(0)
            }
            this.l.log("spawned", n, "workers")
        }
        catch (e) {
            this.l.warn("workers unavailable, calculating on the main thread:", e.message)
            this._workers = []
            this._inFlight = []
        }
    }


    available() { return this._workers.length > 0 }


    startJob(job, body) {
        this._job = job
        this._nextStart = 0
        const m = { type: "job", job: job, body: body, args: FuncUtils.formulaArgs }
        this._workers.forEach(w => w.postMessage(m))
        this.keepBusy()
    }


    stopJob() { this._job = null }


    keepBusy() {
        const job = this._job
        if (!job)
            return
        for (let i = 0; i < this._workers.length; ++i)
            while (this._inFlight[i] < this._maxInFlight && this._nextStart < job.total) {
                const count = Math.min(this._chunkSize, job.total - this._nextStart)
                this._workers[i].postMessage({ type: "chunk", start: this._nextStart, count: count })
                this._nextStart += count
                ++this._inFlight[i]
            }
    }


    onMessage(workerId, m) {
        --this._inFlight[workerId]
        if (this._job && m.gen === this._job.gen) {
            this.adaptChunkSize(m.ms / m.values.length)
            this._onChunk(m.start, m.values)
        }
        this.keepBusy()
    }


    adaptChunkSize(msPerPoint) {
        const size = Math.round(this._targetChunkMs / Math.max(msPerPoint, 1e-6))
        this._chunkSize = Math.max(this._minChunkSize, Math.min(this._maxChunkSize, size))
    }
}
