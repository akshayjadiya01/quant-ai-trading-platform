# backend/rl_inference.py

import os
import numpy as np
from backend.dqn_agent_tf import DQNAgentTF
import random

class RLTrader:
    def __init__(self, symbol: str):
        self.symbol = symbol

        # 🔹 FIXED state size (must match training)
        self.state_size = 6
        self.action_size = 3  # BUY, HOLD, SELL

        model_path = f"models/rl/{symbol}.keras"
        if not os.path.exists(model_path):
            raise RuntimeError(f"RL model not found at {model_path}")

        self.agent = DQNAgentTF(
            state_size=self.state_size,
            action_size=self.action_size,
            model_path=model_path,
            inference_only=True
        )

    def predict_signal(self):
        # Dummy state for now (same as training layout)
        

        # Simulate changing market state
        state = np.random.randn(self.state_size)
        action = self.agent.act(state)


        if action == 0:
            return "BUY", 0.6
        elif action == 1:
            return "HOLD", 0.4
        else:
            return "SELL", 0.6
