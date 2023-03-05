FROM node:18-slim

RUN apt-get autoclean && \
    apt-get autoremove && \
    apt-get update && \
    apt-get install -y curl jq sqlite3 gnupg vim procps net-tools

WORKDIR /opt/price-snitch

COPY --chown=node:node . .
RUN mv /opt/price-snitch/.sqliterc /home/node/

RUN npm ci --only=production && \
    ln -s /opt/price-snitch/node_modules/.bin/chromedriver /usr/local/bin
# mkdir /opt/price-snitch/data && \
# cat ./schema.sql | sqlite3 /opt/price-snitch/`jq -r .db ./config.json`
RUN npm run build

# Install google chrome
RUN curl -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get update && \
    apt-get install -y google-chrome-stable

# Check chromedriver package version is compatible with installed google-chrome version
RUN ./check-chromedriver-version.sh

USER node

# CMD [ "tail", "-f", "/dev/null" ]
