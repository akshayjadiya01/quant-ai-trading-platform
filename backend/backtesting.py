import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


def walk_forward_backtest(
    prices,
    predictions,
):
    """
    prices: actual close prices (array)
    predictions: model predicted prices (array)
    """

    mae = mean_absolute_error(prices, predictions)
    rmse = mean_squared_error(prices, predictions) ** 0.5


    # Directional accuracy
    actual_direction = np.sign(np.diff(prices))
    predicted_direction = np.sign(np.diff(predictions))

    directional_accuracy = (
        actual_direction == predicted_direction
    ).mean()

    return {
        "MAE": round(float(mae), 4),
        "RMSE": round(float(rmse), 4),
        "Directional_Accuracy": round(float(directional_accuracy), 4),
    }
