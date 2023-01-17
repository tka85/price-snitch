FROM node:18-slim

RUN apt-get autoclean && \
    apt-get autoremove && \
    apt-get update && \
    apt-get install -y curl jq sqlite3 gnupg

WORKDIR /opt/price-tracker

COPY package*.json config.json schema.sql ./

RUN npm install && \
    ln -s /opt/price-tracker/node_modules/.bin/chromedriver /usr/local/bin && \
    mkdir /opt/price-tracker/data && \
    cat ./schema.sql | sqlite3 /opt/price-tracker/data/`jq -r .db ./config.json`

COPY . .

RUN npm run build
# RUN npm ci --only=production

# Install google chrome
RUN curl -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get update && \
    apt-get install -y google-chrome-stable

# RUN echo $(google-chrome-stable --version)

CMD [ "node", "dist/src/app.js" ]