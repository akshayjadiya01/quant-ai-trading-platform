import numpy as np
from lstm_model import LSTMPricePredictor

def backtest_lstm(X, y, lookback=60, test_size=20):

    """
    Backtest on last `test_size` points
    """

    predictions = []
    actuals = []

    for i in range(len(X) - test_size, len(X)):
        X_train = X[:i]
        y_train = y[:i]

        model = LSTMPricePredictor(lookback=lookback)
        model.train(X_train, y_train)

        pred = model.predict(X_train[-lookback:])
        predictions.append(pred)
        actuals.append(y[i])

    return np.array(actuals), np.array(predictions)
