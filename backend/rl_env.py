import numpy as np

class TradingEnv:
    def __init__(self, prices, features, sentiment, transaction_cost=0.001):
        self.prices = prices
        self.features = features
        self.sentiment = sentiment
        self.transaction_cost = transaction_cost
        self.reset()

    def reset(self):
        self.t = 1
        self.position = 0  # -1 short, 0 flat, +1 long
        self.cash = 1.0
        self.history = []
        return self._get_state()

    def _get_state(self):
        return np.concatenate([
            self.features[self.t],
            [self.sentiment[self.t]],
            [self.position]
        ])

    def step(self, action):
        prev_price = self.prices[self.t - 1]
        price = self.prices[self.t]

        # Map action
        new_position = {0: -1, 1: 0, 2: 1}[action]

        # Transaction cost if position changes
        cost = self.transaction_cost if new_position != self.position else 0.0

        # Daily return
        daily_ret = (price - prev_price) / prev_price

        # Reward
        reward = self.position * daily_ret - cost

        self.position = new_position
        self.t += 1
        done = self.t >= len(self.prices) - 1

        return self._get_state(), reward, done
