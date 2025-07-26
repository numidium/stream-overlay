module.exports = class SpecViz {
    audioContext;
    audioSource;
    analyser;
    canvas;
    context;
    sliceWidth;
    sampleStep;
    sampleBuffer;
    ampZoom;

    constructor(audioContext, drawContext, ampZoom = 1) {
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.sampleBuffer = new Uint8Array(this.analyser.fftSize);
        this.ampZoom = ampZoom;

        this.canvas = document.getElementById("spectrum-surface");
        this.sampleStep = Math.round(this.analyser.fftSize / this.canvas.width);
        this.context = drawContext;
        this.context.imageSmoothingEnabled = false;
        this.blankCanvas();
    }

    connectAudioSource(audioSource) {
        this.audioSource = audioSource;
        this.audioSource.connect(this.analyser);
    }

    blankCanvas() {
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getYValue(amplitude) {
        const neutralAmp = 128;
        const maxAmp = 256;
        return ((neutralAmp + (amplitude - neutralAmp) * this.ampZoom) / maxAmp) * this.canvas.height;
    }

    draw() {
        this.blankCanvas();
        this.context.strokeStyle = "teal";
        this.analyser.getByteTimeDomainData(this.sampleBuffer);
        const steps = this.analyser.fftSize / this.sampleStep;
        for (let i = 0; i < steps - 1; i++) {
            const sampleVal = this.sampleBuffer[i * this.sampleStep];
            const nextSampleVal = this.sampleBuffer[i * this.sampleStep + this.sampleStep];
            const ampPosition = this.getYValue(sampleVal);
            const nextAmpPosition = this.getYValue(nextSampleVal);
            this.context.beginPath();
            this.context.moveTo(i, ampPosition);
            this.context.lineTo(i + 1, nextAmpPosition);
            this.context.stroke();
        }
    }

    toggleHidden() {
        if (this.canvas.style.display === "block")
            this.canvas.style.display = "none";
        else
            this.canvas.style.display = "block";
    }
}

