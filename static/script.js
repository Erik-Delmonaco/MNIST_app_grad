const loadButton = document.getElementById("load-image-btn");
const canvas = document.getElementById("mnist-canvas");
const statusText = document.getElementById("status-text");
const ctx = canvas.getContext("2d");

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

async function loadRandomImage() {
	statusText.textContent = "Loading image...";
	loadButton.disabled = true;

	try {
		const response = await fetch("/random-image");
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		if (!data.image || !Array.isArray(data.image)) {
			throw new Error("Unexpected response shape");
		}

		drawMnistImage(data.image);
		statusText.textContent = "Random image loaded.";
	} catch (error) {
		statusText.textContent = `Failed to load image: ${error.message}`;
	} finally {
		loadButton.disabled = false;
	}
}

loadButton.addEventListener("click", loadRandomImage);
