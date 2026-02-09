# backend/dqn_agent_tf.py

import tensorflow as tf
import numpy as np
import os

class DQNAgentTF:
    def __init__(
        self,
        state_size: int,
        action_size: int,
        model_path: str | None = None,
        inference_only: bool = False
    ):
        self.state_size = state_size
        self.action_size = action_size
        self.inference_only = inference_only

        if model_path is not None:
            if not os.path.exists(model_path):
                raise RuntimeError(f"Model file not found: {model_path}")

            # 🔹 Load trained model
            self.model = tf.keras.models.load_model(model_path)

        else:
            # 🔹 Training mode (used during RL training)
            self.model = self._build_model()

    def _build_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(self.state_size,)),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dense(self.action_size, activation="linear")
        ])

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss="mse"
        )
        return model

    def act(self, state):
        state = np.reshape(state, [1, self.state_size])
        q_values = self.model.predict(state, verbose=0)
        return int(np.argmax(q_values[0]))
