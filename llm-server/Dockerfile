# Use an official Python runtime as a parent image
FROM python:3.11-slim-buster
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5001", "--timeout-keep-alive", "120"]