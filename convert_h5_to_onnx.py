import tensorflow as tf
from tensorflow import keras
from keras.models import load_model
import onnx
import tf2onnx

model = load_model('weight/action14_10.h5')
onnx_model,_ = tf2onnx.convert.from_keras(model)
onnx.save(onnx_model, 'new_model.onnx')


