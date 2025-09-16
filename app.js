// --- Global Variables ---
let time = 0;
let plotY = [];
let currX = 0;
let currY = 0;
let finalArray = [];
let len = 1000;
let stp = 0.01;
let dt = (2 * Math.PI) / len;

// --- Helper Functions ---
function sortSignificantFrequencies(array) {
    return array.filter((a) => Math.abs(a.amplitude) >= 0.0001 || a.frequency === 0);
}

function removeMirrorFrequencies(array) {
    let N = array.length;
    return array.slice(0, N / 2 + 1);
}

function getFinalArray(array) {
    let removedMirror = removeMirrorFrequencies(array);
    let significantFrequencies = sortSignificantFrequencies(removedMirror);
    return significantFrequencies;
}

function normalFrequencyData(array, len, stp) {
    for (let i = 0; i < array.length; i++) {
        array[i].frequency = (array[i].frequency * (1 / stp) * (1 / len));
    }
    return array;
}

function frequencyPlotData(array) {
    let data = array.slice();
    data.sort((a, b) => a.frequency - b.frequency);
    return data;
}

function combineSameFrequencies(dftOutput) {
    const combinedMap = new Map();
    dftOutput.forEach(coeff => {
        if (!combinedMap.has(coeff.frequency)) {
            combinedMap.set(coeff.frequency, { re: 0, im: 0 });
        }
        const current = combinedMap.get(coeff.frequency);
        current.re += coeff.re;
        current.im += coeff.im;
    });

    const combinedArray = [];
    combinedMap.forEach((value, key) => {
        const amplitude = Math.sqrt(value.re * value.re + value.im * value.im);
        const phase = Math.atan2(value.im, value.re);
        combinedArray.push({
            re: value.re,
            im: value.im,
            frequency: key,
            amplitude,
            phase
        });
    });
    return combinedArray;
}

// --- DFT Function ---
function dft(xArray) {
    let X = [];
    const N = xArray.length;
    const p = (2 * Math.PI) / N;

    for (let k = 0; k < N; k++) {
        let re = 0;
        let im = 0;
        for (let n = 0; n < N; n++) {
            re += xArray[n] * Math.cos(p * k * n);
            im -= xArray[n] * Math.sin(p * k * n);
        }
        re = re / N;
        im = im / N;
        let frequency = k;
        let amplitude = Math.sqrt(re * re + im * im);
        let phase = Math.atan2(im, re);
        X[k] = { re, im, frequency, amplitude, phase };
    }
    return X;
}

// --- Combined Signal Generator & Plotting Logic ---
function generateSignal(frequencies, numSamples, step) {
    let X = [];
    for (let i = 0; i < numSamples; i++) {
        let sum = 0;
        let t = i * step;
        for (const freq of frequencies) {
            sum += freq.amplitude * Math.sin(2 * Math.PI * freq.frequency * t + freq.phase);
        }
        X.push(sum);
    }
    return X;
}

function generateAndProcessSignal() {
    const frequencies = [];
    const frequencyGroups = document.querySelectorAll('.frequency-group');
    
    frequencyGroups.forEach(group => {
        const freq = parseFloat(group.querySelector('.frequency-input').value);
        const amp = parseFloat(group.querySelector('.amplitude-input').value);
        const phase = parseFloat(group.querySelector('.phase-input').value);

        if (!isNaN(freq) && !isNaN(amp) && !isNaN(phase)) {
            frequencies.push({ frequency: freq, amplitude: amp, phase: phase });
        }
    });

    const signal = generateSignal(frequencies, len, stp);
    const processedSignal = dft(signal);
    
    finalArray = getFinalArray(processedSignal);
    
    updateFrequencyPlot(processedSignal);
    
    return finalArray;
}

function updateFrequencyPlot(processedSignal) {
    const fPlotCanvas = document.getElementById("fPlot");
    const fPlotContainer = document.querySelector('.scrollable-plot-container');

    if (!fPlotCanvas || !fPlotContainer) {
        console.error("Canvas or its container not found. Check your HTML.");
        return;
    }

    const cty = fPlotCanvas.getContext("2d");
    const frequencyData = frequencyPlotData(normalFrequencyData(combineSameFrequencies(getFinalArray(processedSignal)), len, stp));
    
    const barSpacing = 80;
    const minCanvasWidth = (frequencyData.length * barSpacing) + 100;
    
    fPlotCanvas.width = Math.max(fPlotContainer.clientWidth, minCanvasWidth);
    fPlotCanvas.height = fPlotContainer.clientHeight;
    
    // Set up an upright coordinate system to simplify drawing text and labels
    cty.setTransform(1, 0, 0, 1, 0, 0);
    
    const padding = 50;
    const graphLeft = padding;
    const graphRight = fPlotCanvas.width - padding;
    const graphBottom = fPlotCanvas.height - padding;
    const graphTop = padding;

    const graphWidth = graphRight - graphLeft;
    const graphHeight = graphBottom - graphTop;

    // Clear canvas
    cty.fillStyle = "#2c2f33";
    cty.fillRect(0, 0, fPlotCanvas.width, fPlotCanvas.height);
    
    // Draw graph background (inner box)
    cty.fillStyle = "#36393f";
    cty.fillRect(graphLeft, graphTop, graphWidth, graphHeight);
    
    // Draw axes
    cty.beginPath();
    cty.strokeStyle = "#CCCCCC";
    cty.lineWidth = 2;
    cty.moveTo(graphLeft, graphBottom);
    cty.lineTo(graphRight, graphBottom);
    cty.moveTo(graphLeft, graphBottom);
    cty.lineTo(graphLeft, graphTop);
    cty.stroke();
    cty.closePath();

    let maxAmplitude = 0;
    frequencyData.forEach(dataPoint => {
        if (dataPoint.amplitude > maxAmplitude) maxAmplitude = dataPoint.amplitude;
    });

    const yScale = graphHeight / (maxAmplitude || 1);
    const barPlotWidth = barSpacing * 0.6; 

    // Draw bars
    cty.fillStyle = "#00BFFF";
    for (let i = 0; i < frequencyData.length; i++) {
        const dataPoint = frequencyData[i];
        const x = graphLeft + (i * barSpacing) + (barSpacing - barPlotWidth) / 2;
        const y = graphBottom - (dataPoint.amplitude * yScale);
        const height = dataPoint.amplitude * yScale;
        cty.fillRect(x, y, barPlotWidth, height);
    }
    
    // Draw Labels
    cty.fillStyle = "#CCCCCC";
    cty.font = "14px Arial";
    cty.textAlign = "center";
    cty.fillText("Frequency (Hz)", graphLeft + graphWidth / 2, fPlotCanvas.height - 20);
    
    cty.save();
    cty.translate(padding / 2, fPlotCanvas.height / 2);
    cty.rotate(-Math.PI / 2); 
    cty.fillText("Amplitude", 0, 0); 
    cty.restore(); 

    // Draw X-axis tick labels
    cty.font = "12px Arial";
    cty.textBaseline = "top";
    for (let i = 0; i < frequencyData.length; i++) {
        const dataPoint = frequencyData[i];
        const x = graphLeft + (i * barSpacing) + barSpacing / 2;
        cty.fillText(dataPoint.frequency.toFixed(2), x, graphBottom + 5);
    }
    
    // Draw Y-axis tick labels
    cty.textAlign = "right";
    cty.textBaseline = "middle";
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
        const amplitudeValue = (maxAmplitude / numYLabels) * i;
        const y = graphBottom - (amplitudeValue * yScale);
        cty.fillText(amplitudeValue.toFixed(2), graphLeft - 5, y);
    }
}

// --- Epicycle Drawing (Corrected PlotY scaling and starting position) ---
function drawFrame(ctx, canvasX, canvasY, canvasOne) {
    ctx.fillRect(-canvasX, canvasY, canvasOne.width, -canvasOne.height);
    
    if (finalArray.length === 0) {
        return;
    }

    function axisDraw(ArrayToPlot, startX, startY, rotation) {
        let cX = startX;
        let cY = startY;
        ArrayToPlot.sort((a, b) => Math.abs(b.amplitude) - Math.abs(a.amplitude));
        for (let i = 0; i < ArrayToPlot.length; i++) {
            let preX = cX;
            let preY = cY;
            cX += ArrayToPlot[i].amplitude * Math.cos(2 * Math.PI * ArrayToPlot[i].frequency * time + ArrayToPlot[i].phase + rotation);
            cY += ArrayToPlot[i].amplitude * Math.sin(2 * Math.PI * ArrayToPlot[i].frequency * time + ArrayToPlot[i].phase + rotation);
            currX = cX;
            currY = cY;
            ctx.beginPath();
            ctx.arc(preX, preY, ArrayToPlot[i].amplitude, 0, 2 * Math.PI, true);
            ctx.closePath();
            ctx.stroke();
            ctx.moveTo(preX, preY);
            ctx.lineTo(cX, cY);
            ctx.stroke();
        }
        time = time - dt;
    }
    
    axisDraw(finalArray, -canvasX + 200, 0, Math.PI / 2); 
    
    ctx.beginPath();
    ctx.strokeStyle = "#ff0000ff";
    plotY.unshift(currY);
    if (plotY.length > 500) {
        plotY.pop();
    }
    
    ctx.moveTo(currX, currY);
    ctx.lineTo(-canvasX + 300, currY);
    ctx.stroke();
    
    ctx.strokeStyle = "#ffffffff";
    ctx.moveTo(-canvasX + 300, plotY[0]);
    const plotXStart = -canvasX + 300;
    const plotXScale = 2; 
    for (let i = 0; i < plotY.length; i++) {
        ctx.lineTo(plotXStart + (i * plotXScale), plotY[i]);
    }
    ctx.stroke();
}

// --- UI Logic ---
function createFrequencyInput(freq = 1, amp = 1, phase = 0) {
    const frequencyGroups = document.querySelectorAll('.frequency-group');
    const serialNumber = frequencyGroups.length + 1;

    const frequencyGroup = document.createElement('div');
    frequencyGroup.className = 'frequency-group';
    
    frequencyGroup.innerHTML = `
        <span class="serial-number">${serialNumber}.</span>
        <label>Freq:</label>
        <input type="number" value="${freq}" step="0.1" class="frequency-input">
        <label>Amp:</label>
        <input type="number" value="${amp}" step="0.1" class="amplitude-input">
        <label>Phase:</label>
        <input type="number" value="${phase}" step="0.1" class="phase-input">
        <button class="remove-btn">Remove</button>
    `;
    
    frequencyGroup.querySelector('.remove-btn').addEventListener('click', () => {
        if (document.querySelectorAll('.frequency-group').length > 1) {
            frequencyGroup.remove();
            generateAndProcessSignal();
            updateSerialNumbers();
        } else {
            alert("You must have at least one frequency.");
        }
    });
    return frequencyGroup;
}

function updateSerialNumbers() {
    const frequencyGroups = document.querySelectorAll('.frequency-group');
    frequencyGroups.forEach((group, index) => {
        const serialNumberSpan = group.querySelector('.serial-number');
        if (serialNumberSpan) {
            serialNumberSpan.textContent = `${index + 1}.`;
        }
    });
}


// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', (event) => {
    const frequencyInputsContainer = document.querySelector('#frequency-inputs');
    const addFrequencyBtn = document.getElementById('add-frequency-btn');
    const generateBtn = document.getElementById('generate-btn');
    const canvasOne = document.getElementById("timeGraph");
    const ctx = canvasOne.getContext("2d");
    const canvasContainer = canvasOne.parentElement;

    canvasOne.width = canvasContainer.clientWidth;
    canvasOne.height = canvasContainer.clientHeight;
    ctx.setTransform(1, 0, 0, -1, canvasOne.width / 2, canvasOne.height / 2);
    const canvasX = canvasOne.width / 2;
    const canvasY = canvasOne.height / 2;

    ctx.fillStyle = "#1f1f1f";
    ctx.strokeStyle = "#ffdddd";
    
    if (frequencyInputsContainer) {
        frequencyInputsContainer.appendChild(createFrequencyInput(1, 1, 0));
        generateAndProcessSignal();
    }

    addFrequencyBtn.addEventListener('click', () => {
        if (frequencyInputsContainer) {
            frequencyInputsContainer.appendChild(createFrequencyInput());
        }
        generateAndProcessSignal();
    });

    if (frequencyInputsContainer) {
        frequencyInputsContainer.addEventListener('input', () => {
            generateAndProcessSignal();
        });
    }

    generateBtn.addEventListener('click', () => {
        generateAndProcessSignal();
    });

    function animate() {
        drawFrame(ctx, canvasX, canvasY, canvasOne);
        requestAnimationFrame(animate);
    }
    
    animate();
});