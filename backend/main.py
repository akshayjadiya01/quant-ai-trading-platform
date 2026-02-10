from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"status": "OK"}

@app.on_event("startup")
def startup():
    print("✅ FASTAPI STARTED — PORT SHOULD OPEN")
