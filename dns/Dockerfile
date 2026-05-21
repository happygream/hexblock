FROM alpine:3.19

RUN apk add --no-cache dnsmasq bind-tools

# Base config is copied in at build time.
# dnsmasq.d is a Docker volume mount — blocklists and local host
# records are written there at runtime by the HexBlock app.
COPY dnsmasq.conf /etc/dnsmasq.conf

# Create the directory so dnsmasq starts cleanly even if the
# volume is empty on first boot.
RUN mkdir -p /etc/dnsmasq.d

EXPOSE 53/udp
EXPOSE 53/tcp

CMD ["dnsmasq", "--no-daemon", "--log-queries", "--log-facility=-"]
