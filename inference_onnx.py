import onnxruntime as ort
import cv2
import numpy as np

# Load the ONNX model
model_path = 'weight/new_model.onnx'
session = ort.InferenceSession(model_path)

# Load and preprocess the image
image_path = 'test/test_image_1.jpg'
image = cv2.imread(image_path)
input_image = cv2.resize(image, (256, 256))  # Example resizing, adjust as necessary
input_image = input_image.astype(np.float32)
input_image = np.transpose(input_image, (2, 0, 1))  # Change data layout to (C, H, W)
# input_image = np.expand_dims(input_image, axis=0)  # Add batch dimension

# Get input and output node names
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Run inference
result = session.run([output_name], {input_name: input_image})

print(f"Result: {result}")
