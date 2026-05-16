from __future__ import annotations

from typing import Any, Dict
import json

import httpx


class OpenRouterClient:
    def __init__(self, api_key: str, base_url: str, model: str, timeout: int = 60):
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY missing")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def chat_json(self, *, system: str, user: str, max_tokens: int = 500) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "GoTeeOff CRM",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.4,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        return json.loads(content)