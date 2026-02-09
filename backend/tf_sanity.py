import tensorflow as tf
import numpy as np

print("TF version:", tf.__version__)

# Force CPU + eager execution
tf.config.run_functions_eagerly(True)

print("Eager execution:", tf.executing_eagerly())

# Simple model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(8, activation="relu", input_shape=(4,)),
    tf.keras.layers.Dense(3)
])

model.compile(
    optimizer="adam",
    loss="mse"
)

X = np.random.rand(100, 4)
y = np.random.rand(100, 3)

print("Starting training...")
model.fit(X, y, epochs=3, batch_size=16)
print("Training finished")
