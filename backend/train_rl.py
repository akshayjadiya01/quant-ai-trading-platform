import numpy as np
from rl_env import TradingEnv
from dqn_agent import DQNAgent

def train_rl(prices, features, sentiment, episodes=20):
    env = TradingEnv(prices, features, sentiment)
    state_size = len(env.reset())
    agent = DQNAgent(state_size)

    print(">>> RL training loop started")


    for ep in range(episodes):
        state = env.reset()
        total_reward = 0

        while True:
            action = agent.act(state)
            next_state, reward, done = env.step(action)
            agent.remember(state, action, reward, next_state, done)
            agent.replay()
            state = next_state
            total_reward += reward
            if done:
                break

        print(f"Episode {ep+1}/{episodes} — Reward: {total_reward:.4f}")

    return agent
