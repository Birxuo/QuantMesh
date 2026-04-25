FROM python:3.11-slim

WORKDIR /app

COPY consumer/requirements.txt /app/consumer/requirements.txt
RUN pip install --no-cache-dir -r consumer/requirements.txt

COPY . /app

CMD ["python", "-m", "consumer.agent"]
