FROM alpine:3.18


RUN apk add --no-cache bash curl mongodb-tools


RUN curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc


WORKDIR /scripts


COPY backup.sh .
RUN chmod +x backup.sh


RUN echo "0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["crond", "-f"]