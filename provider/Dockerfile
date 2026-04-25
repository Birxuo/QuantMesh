FROM python:3.11-slim

WORKDIR /app

COPY provider/requirements.txt /app/provider/requirements.txt
RUN pip install --no-cache-dir -r provider/requirements.txt

COPY . /app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "provider.main:app", "--host", "0.0.0.0", "--port", "8000"]
