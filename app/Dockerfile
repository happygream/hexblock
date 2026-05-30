FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    docker.io \
    wireguard-tools \
    iproute2 \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY . .

# Non-root user — member of the docker group so it can
# signal the dns container via the Docker socket.
RUN useradd -r -s /bin/false -G docker hexblock 2>/dev/null || \
    useradd -r -s /bin/false hexblock
RUN chown -R hexblock:hexblock /app
USER hexblock

EXPOSE 8080

CMD ["sh", "-c", "rm -f /tmp/hexblock-log-reader.lock && uvicorn hexblock:app --host 0.0.0.0 --port 8080 --workers 1"]
