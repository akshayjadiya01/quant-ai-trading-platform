import os
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

class PricePredictor:
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=200,
            random_state=42
        )
        self.scaler = StandardScaler()

    def train(self, X, y):
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)

    def predict(self, X):
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def save(self, path):
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.model, f"{path}/model.pkl")
        joblib.dump(self.scaler, f"{path}/scaler.pkl")

    def load(self, path):
        self.model = joblib.load(f"{path}/model.pkl")
        self.scaler = joblib.load(f"{path}/scaler.pkl")
