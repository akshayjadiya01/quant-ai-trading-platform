import numpy as np
import os


from stock_data import fetch_stock_data
from features import create_features
from rl_env import TradingEnv
from dqn_agent_tf import DQNAgentTF


print(">>> TensorFlow RL training started")


def run_rl_training(
    symbol: str = "AAPL",
    episodes: int = 5,
):
    # -------------------------------------------------
    # 1. Fetch and prepare data
    # -------------------------------------------------
    df = fetch_stock_data(symbol)
    df_feat = create_features(df)

    feature_cols = ["rsi", "ema_20", "ema_50", "volatility"]
    features = df_feat[feature_cols].values
    prices = df_feat["Close"].values

    # Sentiment placeholder (can be real later)
    sentiment = np.zeros(len(prices))

    # -------------------------------------------------
    # 2. Create trading environment
    # -------------------------------------------------
    env = TradingEnv(
        prices=prices,
        features=features,
        sentiment=sentiment,
        transaction_cost=0.001
    )

    state = env.reset()
    state_size = len(state)

    # -------------------------------------------------
    # 3. Create RL agent
    # -------------------------------------------------
    agent = DQNAgentTF(state_size)

    print(">>> RL environment ready")
    print(f">>> State size: {state_size}")
    print(f">>> Episodes: {episodes}")

    # -------------------------------------------------
    # 4. Training loop
    # -------------------------------------------------
    for ep in range(episodes):
        state = env.reset()
        total_reward = 0.0

        while True:
            action = agent.act(state)
            next_state, reward, done = env.step(action)

            agent.train_step(
                state=state,
                action=action,
                reward=reward,
                next_state=next_state,
                done=done
            )

            state = next_state
            total_reward += reward

            if done:
                break

        print(
            f"Episode {ep + 1}/{episodes} — "
            f"Reward: {total_reward:.4f}"
        )

    # -------------------------------------------------
# 5. Save trained RL model
# -------------------------------------------------
    os.makedirs("models/rl", exist_ok=True)

    model_path = f"models/rl/{symbol}.keras"
    agent.save(model_path)

    print(f">>> RL model saved to: {model_path}")


# -------------------------------------------------
# Entry point
# -------------------------------------------------
if __name__ == "__main__":
    run_rl_training(
        symbol="AAPL",
        episodes=5   # increase later (20–50)
    )
