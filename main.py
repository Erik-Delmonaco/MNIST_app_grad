import random
from pathlib import Path

import torch
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from torch import nn
from torchvision import datasets, transforms

app = FastAPI()

CIFAR10_CLASSES = [
	"Airplane",
	"Automobile",
	"Bird",
	"Cat",
	"Deer",
	"Dog",
	"Frog",
	"Horse",
	"Ship",
	"Truck",
]


def build_model() -> nn.Sequential:
	return nn.Sequential(
		nn.Conv2d(3, 32, kernel_size=3, padding=1),
		nn.ReLU(),
		nn.MaxPool2d(2, 2),
		nn.Conv2d(32, 64, kernel_size=3, padding=1),
		nn.ReLU(),
		nn.MaxPool2d(2, 2),
		nn.Conv2d(64, 128, kernel_size=3, padding=1),
		nn.ReLU(),
		nn.Flatten(),
		nn.Linear(128 * 8 * 8, 256),
		nn.ReLU(),
		nn.Linear(256, 10),
	)


model = build_model()
model_path = Path(__file__).with_name("cifar2.pth")
state_dict = torch.load(model_path, map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

# Download and load the CIFAR-10 test split into memory.
mnist_test_dataset = datasets.CIFAR10(
	root="./data",
	train=False,
	download=True,
	transform=transforms.ToTensor(),
)


def convert_rgb_to_grayscale(image_tensor):
	"""Convert RGB image tensor to grayscale using standard luminance formula."""
	if image_tensor.shape[0] == 3:  # RGB
		return (0.299 * image_tensor[0] + 0.587 * image_tensor[1] + 0.114 * image_tensor[2]).tolist()
	else:  # Already grayscale
		return image_tensor.squeeze(0).tolist()


def predict_image_at_index(index: int) -> dict:
	if index < 0 or index >= len(mnist_test_dataset):
		raise HTTPException(
			status_code=400,
			detail=f"index must be between 0 and {len(mnist_test_dataset) - 1}",
		)

	image_tensor, label = mnist_test_dataset[index]

	with torch.no_grad():
		logits = model(image_tensor.unsqueeze(0))
		prediction = int(logits.argmax(dim=1).item())

	return {
		"index": index,
		"image": convert_rgb_to_grayscale(image_tensor),
		"label": int(label),
		"label_name": CIFAR10_CLASSES[int(label)],
		"prediction": prediction,
		"prediction_name": CIFAR10_CLASSES[prediction],
	}


@app.get("/random-image")
def get_random_image():
	index = random.randrange(len(mnist_test_dataset))
	return predict_image_at_index(index)

@app.get("/predict")
def predict(index: int):
	return predict_image_at_index(index)


app.mount("/", StaticFiles(directory="static", html=True), name="static")
