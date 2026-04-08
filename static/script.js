const loadButton = document.getElementById("load-image-btn");
const predictButton = document.getElementById("predict-btn");
const autoRunButton = document.getElementById("auto-run-btn");
const canvas = document.getElementById("mnist-canvas");
const statusText = document.getElementById("status-text");
const imageIndexText = document.getElementById("image-index");
const predictionValue = document.getElementById("prediction-value");
const labelValue = document.getElementById("label-value");
const resultEmoji = document.getElementById("result-emoji");
const resultMessage = document.getElementById("result-message");
const resultBox = document.querySelector(".result-box");
const networkViz = document.getElementById("network-viz");
const ctx = canvas.getContext("2d");

let selectedIndex = null;
let isAutoRunning = false;

function drawMnistImage(image2d) {
	const height = image2d.length;
	const width = image2d[0].length;
	const imageData = ctx.createImageData(width, height);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const pixelValue = Math.max(0, Math.min(255, Math.round(image2d[y][x] * 255)));
			const index = (y * width + x) * 4;

			imageData.data[index] = pixelValue;
			imageData.data[index + 1] = pixelValue;
			imageData.data[index + 2] = pixelValue;
			imageData.data[index + 3] = 255;
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function setResultIdleMessage() {
	predictionValue.textContent = "-";
	labelValue.textContent = "-";
	resultEmoji.textContent = "🙂";
	resultMessage.textContent = "Image ready. Click 'Run Prediction'.";
	resultBox.classList.remove("good", "bad");
}

async function fetchRandomSample() {
	const response = await fetch("/random-image");
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const data = await response.json();
	if (!data.image || !Array.isArray(data.image)) {
		throw new Error("Unexpected response shape");
	}

	drawMnistImage(data.image);
	selectedIndex = data.index;
	imageIndexText.textContent = String(data.index);
	setResultIdleMessage();

	return data;
}

function showPredictionResult(data) {
	predictionValue.textContent = data.prediction_name || String(data.prediction);
	labelValue.textContent = data.label_name || String(data.label);

	const isCorrect = data.prediction === data.label;
	if (isCorrect) {
		resultEmoji.textContent = "🙂";
		resultMessage.textContent = "Correct prediction.";
		resultBox.classList.add("good");
		resultBox.classList.remove("bad");
	} else {
		resultEmoji.textContent = "☹️";
		resultMessage.textContent = "Incorrect prediction.";
		resultBox.classList.add("bad");
		resultBox.classList.remove("good");
	}

	return isCorrect;
}

async function predictAtSelectedIndex() {
	if (selectedIndex === null || selectedIndex === undefined) {
		throw new Error("No image index is selected");
	}

	const response = await fetch(`/predict?index=${encodeURIComponent(selectedIndex)}`);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const data = await response.json();
	const isCorrect = showPredictionResult(data);
	return { isCorrect, data };
}

async function loadRandomImage() {
	statusText.textContent = "Loading image...";
	loadButton.disabled = true;
	predictButton.disabled = true;
	autoRunButton.disabled = true;

	try {
		await fetchRandomSample();
		statusText.textContent = "Random image loaded. Ready to run prediction.";
		predictButton.disabled = false;
	} catch (error) {
		statusText.textContent = `Failed to load image: ${error.message}`;
		selectedIndex = null;
		imageIndexText.textContent = "-";
	} finally {
		loadButton.disabled = false;
		autoRunButton.disabled = false;
	}
}

async function runPrediction() {
	if (selectedIndex === null || selectedIndex === undefined) {
		statusText.textContent = "Load a random image first.";
		return;
	}

	statusText.textContent = "Running model...";
	loadButton.disabled = true;
	predictButton.disabled = true;
	autoRunButton.disabled = true;
	networkViz.classList.add("running");

	try {
		await predictAtSelectedIndex();

		statusText.textContent = "Prediction complete.";
	} catch (error) {
		statusText.textContent = `Failed to run prediction: ${error.message}`;
	} finally {
		networkViz.classList.remove("running");
		loadButton.disabled = false;
		predictButton.disabled = selectedIndex === null;
		autoRunButton.disabled = false;
	}
}

async function startAutoRun() {
	if (isAutoRunning) {
		return;
	}

	isAutoRunning = true;
	autoRunButton.disabled = true;
	autoRunButton.classList.add("running");
	autoRunButton.textContent = "Auto Running...";
	statusText.textContent = "Auto mode started. Running until first incorrect prediction...";

	while (isAutoRunning) {
		loadButton.disabled = true;
		predictButton.disabled = true;
		networkViz.classList.add("running");

		try {
			await fetchRandomSample();
			const { isCorrect, data } = await predictAtSelectedIndex();

			if (!isCorrect) {
				isAutoRunning = false;
				statusText.textContent = `Paused on incorrect prediction at index ${data.index}.`;
				break;
			}

			statusText.textContent = `Auto mode: index ${data.index} predicted correctly.`;
			await sleep(220);
		} catch (error) {
			isAutoRunning = false;
			statusText.textContent = `Auto mode stopped: ${error.message}`;
			break;
		} finally {
			networkViz.classList.remove("running");
		}
	}

	autoRunButton.classList.remove("running");
	autoRunButton.textContent = "Start Auto Run";
	autoRunButton.disabled = false;
	loadButton.disabled = false;
	predictButton.disabled = selectedIndex === null;
}

loadButton.addEventListener("click", loadRandomImage);
predictButton.addEventListener("click", runPrediction);
autoRunButton.addEventListener("click", startAutoRun);
