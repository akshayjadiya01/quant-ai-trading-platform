import requests
import os
from datetime import datetime, timedelta

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2/everything"


def fetch_company_news(company, days=5, page_size=20):
    if not NEWS_API_KEY:
        raise RuntimeError("NEWS_API_KEY is not set")

    from_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    params = {
        "q": company,
        "from": from_date,
        "sortBy": "relevancy",
        "language": "en",
        "pageSize": page_size,
        "apiKey": NEWS_API_KEY,
    }

    response = requests.get(BASE_URL, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()
    return [
        f"{a.get('title','')}. {a.get('description','')}"
        for a in data.get("articles", [])
    ]
