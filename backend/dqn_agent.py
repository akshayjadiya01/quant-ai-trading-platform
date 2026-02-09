import random
import numpy as np
from collections import deque
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.optimizers import Adam

class DQNAgent:
    def __init__(self, state_size, action_size=3):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=5000)
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.lr = 0.001
        self.model = self._build_model()

    def _build_model(self):
        model = Sequential([
            Dense(64, activation="relu", input_shape=(self.state_size,)),
            Dense(64, activation="relu"),
            Dense(self.action_size, activation="linear")
        ])
        model.compile(optimizer=Adam(self.lr), loss="mse")
        return model

    def act(self, state):
        if np.random.rand() <= self.epsilon:
            return random.randrange(self.action_size)
        q_vals = self.model.predict(state[np.newaxis], verbose=0)
        return np.argmax(q_vals[0])

    def remember(self, s, a, r, s2, done):
        self.memory.append((s, a, r, s2, done))

    def replay(self, batch_size=32):
        batch = random.sample(self.memory, min(len(self.memory), batch_size))
        for s, a, r, s2, done in batch:
            target = r
            if not done:
                target += self.gamma * np.max(
                    self.model.predict(s2[np.newaxis], verbose=0)[0]
                )
            q = self.model.predict(s[np.newaxis], verbose=0)
            q[0][a] = target
            self.model.fit(s[np.newaxis], q, verbose=0)

        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay
