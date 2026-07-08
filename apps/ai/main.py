import uvicorn
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from routers import toxicity, recommendations, nlp

app = FastAPI(
    title="ChemCheck AI Microservice",
    description="Provides AI-powered chemical risk analysis, OCR parsing, and smart alternative recommendations.",
    version="1.0.0"
)

# Allow CORS from the API gateway or frontend directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Should be restricted in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai"}

# Include routers
app.include_router(toxicity.router, prefix="/api/v1/toxicity", tags=["Toxicity"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
app.include_router(nlp.router, prefix="/api/v1/nlp", tags=["NLP"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
