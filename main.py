from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from torchvision import datasets, transforms
import random

app = FastAPI()

# Download and load the MNIST test split into memory.
mnist_test_dataset = datasets.MNIST(
	root="./data",
	train=False,
	download=True,
	transform=transforms.ToTensor(),
)


@app.get("/random-image")
def get_random_image():
	index = random.randrange(len(mnist_test_dataset))
	image_tensor, _ = mnist_test_dataset[index]

	# Return as a 2D list (28x28), not 1x28x28.
	image_as_list = image_tensor.squeeze(0).tolist()
	return {"image": image_as_list}



app.mount("/", StaticFiles(directory="static", html=True), name="static")
