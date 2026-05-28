import json
import re
from datetime import date, timedelta

import requests

from models import get_all_settings, get_raw_api_key

SYSTEM_PROMPT = """你是一个专业的记账助手。你的任务是从用户的中文自然语言输入中提取消费或收入信息。

## 输出格式
你必须严格返回以下JSON格式，不要包含任何其他文字、解释或markdown标记：
{
    "amount": <数字, 单位:元>,
    "category": "<类别>",
    "description": "<简短描述, 不超过20字>",
    "date": "<YYYY-MM-DD>",
    "is_income": <0或1>
}

## 规则
1. 金额单位统一为"元"。识别中文金额表达："38块"→38, "25元"→25, "100块5毛"→100.5, "5k"→5000, "3万"→30000。
2. 类别从以下10个中选择最匹配的一个：餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、日用、其他
3. 如果用户输入包含"收入"、"工资"、"奖金"、"报销"、"退款"、"收"、"赚"、"入账"等关键词，is_income设为1，否则设为0。
4. 如果用户没有指明时间，使用当前时间。识别中文时间表达："昨天"→当前日期减1天，"前天"→减2天，"今天"→当前日期。
5. description应简洁概括消费内容，去除金额和时间信息。
6. 如果输入内容无法解析为记账信息，将所有字段设为null。

## 示例
输入："今天午饭吃了38块"
输出：{"amount": 38, "category": "餐饮", "description": "午饭", "date": "2025-05-24", "is_income": 0}

输入："昨天滴滴打车去公司25元"
输出：{"amount": 25, "category": "交通", "description": "滴滴打车去公司", "date": "2025-05-23", "is_income": 0}

输入："这个月工资到账15000"
输出：{"amount": 15000, "category": "其他", "description": "工资收入", "date": "2025-05-24", "is_income": 1}

输入："淘宝买了双袜子49.9"
输出：{"amount": 49.9, "category": "购物", "description": "买袜子", "date": "2025-05-24", "is_income": 0}
"""

VALID_CATEGORIES = ["餐饮", "交通", "购物", "娱乐", "住房", "医疗", "教育", "通讯", "日用", "其他"]


def build_user_prompt(text):
    today = date.today().isoformat()
    return f"当前日期: {today}\n\n用户输入: {text}"


def _extract_json(text):
    text = text.strip()
    # Remove markdown code fences
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try regex extraction
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    raise ValueError(f"无法从AI响应中解析JSON: {text[:200]}")


def _build_endpoint(api_url, provider, api_path=""):
    """Smartly build the full API endpoint URL."""
    url = api_url.strip().rstrip("/")

    # If the URL already looks like a complete endpoint, use it directly
    if "/chat/completions" in url or "/api/chat" in url or "/completions" in url:
        return url

    if provider == "ollama":
        return f"{url}/api/chat"

    if provider == "custom":
        if api_path:
            return f"{url}{api_path}" if api_path.startswith("/") else f"{url}/{api_path}"
        return url

    # OpenAI-compatible: smart path handling
    if api_path:
        return f"{url}{api_path}" if api_path.startswith("/") else f"{url}/{api_path}"
    if url.endswith("/v1"):
        return f"{url}/chat/completions"
    return f"{url}/v1/chat/completions"


def call_openai_api(api_url, api_key, model, user_message, api_path=""):
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.1,
        "max_tokens": 300,
    }

    endpoint = _build_endpoint(api_url, "openai", api_path)
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return _extract_json(content)


def call_ollama_api(api_url, model, user_message):
    endpoint = _build_endpoint(api_url, "ollama")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "options": {"temperature": 0.1},
    }

    resp = requests.post(endpoint, json=payload, timeout=60)
    resp.raise_for_status()
    content = resp.json()["message"]["content"]
    return _extract_json(content)


def validate_parsed_result(result):
    if result.get("amount") is None:
        raise ValueError("AI未能解析出有效金额，请尝试更具体的描述")

    amount = float(result["amount"])
    if amount <= 0:
        raise ValueError("金额必须大于0")

    category = result.get("category", "其他")
    if category not in VALID_CATEGORIES:
        category = "其他"

    raw_date = result.get("date", date.today().isoformat())
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', str(raw_date)):
        raw_date = date.today().isoformat()

    return {
        "amount": round(amount, 2),
        "category": category,
        "description": str(result.get("description", ""))[:50],
        "date": str(raw_date),
        "is_income": 1 if result.get("is_income") else 0,
    }


def parse_bill_text(text):
    settings = get_all_settings()
    api_url = settings.get("api_url", "")
    model = settings.get("model", "gpt-3.5-turbo")
    provider = settings.get("api_provider", "openai")
    api_path = settings.get("api_path", "")

    if not api_url:
        raise ValueError("请先在设置中配置AI接口地址")

    user_prompt = build_user_prompt(text)

    if provider == "ollama":
        raw_result = call_ollama_api(api_url, model, user_prompt)
    else:
        api_key = get_raw_api_key()
        raw_result = call_openai_api(api_url, api_key, model, user_prompt, api_path)

    validated = validate_parsed_result(raw_result)
    validated["raw_input"] = text
    return validated


def test_connection():
    """Pure connectivity test — just ping the API, don't validate bill parsing."""
    settings = get_all_settings()
    api_url = settings.get("api_url", "")
    model = settings.get("model", "gpt-3.5-turbo")
    provider = settings.get("api_provider", "openai")
    api_path = settings.get("api_path", "")

    if not api_url:
        raise ValueError("请先在设置中配置AI接口地址")

    # Simple ping: ask for just "OK"
    ping_messages = [
        {"role": "user", "content": "Hi"},
    ]

    if provider == "ollama":
        endpoint = _build_endpoint(api_url, "ollama")
        payload = {
            "model": model,
            "messages": ping_messages,
            "stream": False,
            "options": {"temperature": 0, "max_tokens": 10},
        }
        resp = requests.post(endpoint, json=payload, timeout=60)
        resp.raise_for_status()
    else:
        api_key = get_raw_api_key()
        endpoint = _build_endpoint(api_url, provider, api_path)
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": model,
            "messages": ping_messages,
            "temperature": 0,
            "max_tokens": 10,
        }
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()

    return True


# --- Chat Mode ---

CHAT_SYSTEM_PROMPT = """你是一个幽默风趣的个人记账助手，也是一个爱吐槽的朋友。你的任务是：

1. 用口语化、幽默的方式回应用户的消费记录
2. 同时从用户输入中提取记账信息

## 回复风格
- 像朋友聊天一样，带点调侃、吐槽或鼓励
- 如果用户花多了，可以吐槽"又花钱？"
- 如果用户省钱，可以夸奖
- 如果是收入，可以恭喜
- 回复要简短，1-2句话即可，不要太长
- 不要听起来像AI机器人

## 输出格式
你必须严格返回以下JSON格式，不要包含任何其他文字、解释或markdown标记：
{
    "reply": "<你的聊天回复, 1-2句话>",
    "bill": {
        "amount": <数字或null>,
        "category": "<类别>",
        "description": "<简短描述>",
        "date": "<YYYY-MM-DD>",
        "is_income": <0或1>
    }
}

## 记账规则
1. 金额单位"元"。识别："38块"→38, "25元"→25, "5k"→5000, "3万"→30000
2. 类别10选1：餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、日用、其他
3. 收入关键词："工资"、"奖金"、"报销"、"退款"、"收"、"赚"、"入账" → is_income=1
4. 时间："昨天"→减1天，"今天"→当天，未指明→当天
5. 如果用户的输入跟记账完全无关（纯聊天、问候等），bill设为null
6. 如果用户输入能解析出账单，bill里填完整信息；如果用户只是聊天没有涉及消费，bill里所有字段null

## 示例
用户："今天午饭吃了38块"
输出：{"reply": "又吃了38块？看来今天胃口不错嘛~", "bill": {"amount": 38, "category": "餐饮", "description": "午饭", "date": "2026-05-24", "is_income": 0}}

用户："打车花了25"
输出：{"reply": "25块打车，又是懒得走路的打工人😂", "bill": {"amount": 25, "category": "交通", "description": "打车", "date": "2026-05-24", "is_income": 0}}

用户："发工资了15000！"
输出：{"reply": "哇！发工资了！恭喜老板，今晚请客吗？🎉", "bill": {"amount": 15000, "category": "其他", "description": "工资收入", "date": "2026-05-24", "is_income": 1}}

用户："你好"
输出：{"reply": "嗨！今天想记什么账呀？", "bill": null}
"""


def _call_chat_api(api_url, api_key, model, user_message, provider, api_path=""):
    prompt = CHAT_SYSTEM_PROMPT
    user_prompt = f"当前日期: {date.today().isoformat()}\n\n用户: {user_message}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 500,
        "stream": False,
    }

    if provider == "ollama":
        payload["options"] = {"temperature": 0.7}
        endpoint = _build_endpoint(api_url, "ollama")
        resp = requests.post(endpoint, json=payload, timeout=60)
    else:
        payload.pop("options", None)
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        endpoint = _build_endpoint(api_url, provider, api_path)
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)

    resp.raise_for_status()

    if provider == "ollama":
        content = resp.json()["message"]["content"]
    else:
        content = resp.json()["choices"][0]["message"]["content"]

    return _extract_json(content)


def parse_chat(text):
    settings = get_all_settings()
    api_url = settings.get("api_url", "")
    model = settings.get("model", "gpt-3.5-turbo")
    provider = settings.get("api_provider", "openai")
    api_path = settings.get("api_path", "")

    if not api_url:
        raise ValueError("请先在设置中配置AI接口地址")

    if not text or not text.strip():
        raise ValueError("请输入内容")

    if provider == "ollama":
        api_key = ""
    else:
        api_key = get_raw_api_key()

    result = _call_chat_api(api_url, api_key, model, text.strip(), provider, api_path)

    reply = result.get("reply", "嗯，记下了~")
    bill_data = result.get("bill")

    if bill_data and bill_data.get("amount") is not None:
        bill = validate_parsed_result(bill_data)
        bill["raw_input"] = text.strip()
    else:
        bill = None

    return {"reply": reply, "bill": bill}
