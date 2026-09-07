import httpx
import time
import json

tests = [
    "Hello",
    "What is Python?",
    "Explain machine learning.",
    "Where is SJT-G12?",
    "How do I replace my ID card?",
    "What is the latest AI news?",
    "Where is the library?",
    "Tell me a joke."
]

print("=== 1. TESTING BACKEND DIRECTLY (http://localhost:8001/api/v1/chat) ===")
results = []
for q in tests:
    t0 = time.time()
    try:
        r = httpx.post("http://localhost:8001/api/v1/chat", json={"message": q}, timeout=35)
        dt = round(time.time() - t0, 2)
        if r.status_code == 200:
            d = r.json().get("data", {})
            ans = d.get("answer", "")[:130].replace("\n", " ")
            ans_clean = ans.encode("ascii", "ignore").decode()
            intent = d.get("intent")
            tools = d.get("tools_used")
            print(f"[SUCCESS] \"{q}\" | Intent: {intent} | Tools: {tools} | Status: {r.status_code} | Time: {dt}s")
            print(f"  Ans: {ans_clean}...\n")
            results.append({
                "request": q,
                "intent": intent,
                "tools_used": tools,
                "backend_status": r.status_code,
                "response_time": f"{dt}s",
                "final_answer": ans_clean,
                "loading_stopped": True
            })
        else:
            print(f"[FAIL] \"{q}\" | Status: {r.status_code} | Time: {dt}s | Err: {r.text[:100]}\n")
    except Exception as e:
        dt = round(time.time() - t0, 2)
        print(f"[ERROR] \"{q}\" after {dt}s: {e}\n")

with open("test_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("Saved test_results.json")
