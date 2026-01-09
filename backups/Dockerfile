FROM alpine:3.18

# Instalar bash, curl e ferramentas do mongodb
RUN apk add --no-cache bash curl mongodb-tools

# Instalar o cliente MinIO (mc)
RUN curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

# Definir diretório de trabalho
WORKDIR /scripts

# Copiar o script de backup
COPY backup.sh .
RUN chmod +x backup.sh

# Configurar o Cron para correr todos os dias às 03:00
RUN echo "0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Iniciar o crond em foreground
CMD ["crond", "-f"]