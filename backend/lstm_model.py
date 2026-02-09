import numpy as np
import joblib
import os
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Input
from sklearn.preprocessing import MinMaxScaler


class LSTMPredictor:
    def __init__(self, lookback: int = 60):
        self.lookback = lookback
        self.model = None
        self.scaler = MinMaxScaler()

    def _build_model(self, n_features: int):
        model = Sequential([
            Input(shape=(self.lookback, n_features)),
            LSTM(64, return_sequences=False),
            Dense(1)  # predict return
        ])
        model.compile(optimizer="adam", loss="mse")
        return model

    def train(self, X: np.ndarray, prices: np.ndarray):
        # ----- compute returns -----
        returns = (prices[1:] - prices[:-1]) / prices[:-1]

        X = X[:-1]  # align with returns

        # ----- scale features -----
        X_scaled = self.scaler.fit_transform(X)

        # ----- create sequences -----
        X_seq, y_seq = [], []
        for i in range(self.lookback, len(X_scaled)):
            X_seq.append(X_scaled[i - self.lookback:i])
            y_seq.append(returns[i])

        X_seq = np.array(X_seq)
        y_seq = np.array(y_seq)

        self.model = self._build_model(X_seq.shape[2])
        self.model.fit(X_seq, y_seq, epochs=10, batch_size=32, verbose=0)

    def predict_return(self, X: np.ndarray) -> float:
        if self.model is None or self.scaler is None:
            raise ValueError("Model or scaler not loaded")

        X_scaled = self.scaler.transform(X)
        seq = X_scaled[-self.lookback:].reshape(1, self.lookback, -1)

        return float(self.model.predict(seq, verbose=0)[0][0])

    def save(self, model_path: str, scaler_path: str):
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        os.makedirs(os.path.dirname(scaler_path), exist_ok=True)

        self.model.save(model_path)
        joblib.dump(self.scaler, scaler_path)

    def load(self, model_path: str, scaler_path: str):
        self.model = load_model(model_path)
        self.scaler = joblib.load(scaler_path)
