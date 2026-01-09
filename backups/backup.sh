FROM alpine:3.18

# Instala dependências e Timezone (para o cron bater certo com Portugal)
RUN apk add --no-cache bash curl mongodb-tools tzdata && \
    cp /usr/share/zoneinfo/Europe/Lisbon /etc/localtime && \
    echo "Europe/Lisbon" > /etc/timezone

# Instala MinIO Client
RUN curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

WORKDIR /scripts

COPY backup.sh .
# Configura o Cron e dá permissão ao script num só passo
RUN chmod +x backup.sh && \
    echo "0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["crond", "-f"]