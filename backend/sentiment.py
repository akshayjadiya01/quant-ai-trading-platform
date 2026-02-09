from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np

MODEL_NAME = "ProsusAI/finbert"

# Cache model in memory (VERY IMPORTANT)
_tokenizer = None
_model = None


def load_finbert():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)


def sentiment_score(texts, max_texts=20):
    """
    Converts a list of news texts into a single sentiment score [-1, +1]
    """
    if not texts:
        return 0.0

    load_finbert()

    scores = []

    for text in texts[:max_texts]:
        inputs = _tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True
        )

        with torch.no_grad():
            outputs = _model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)[0].numpy()

        # FinBERT label order: [negative, neutral, positive]
        score = float(probs[2] - probs[0])
        scores.append(score)

    return float(np.mean(scores))
