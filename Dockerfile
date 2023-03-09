FROM node:18-slim

WORKDIR /home/node

COPY --chown=node:node . .

RUN apt autoclean && \
    apt autoremove && \
    apt update && \
    apt install -y curl jq sqlite3 gnupg vim procps net-tools && \
    apt install -y ./assets/google-chrome-stable_110.0.5481.177-1_amd64.deb

RUN npm ci --only=production && \
    ln -s /home/node/node_modules/.bin/chromedriver /usr/local/bin && \
    chown -R node:node ./node_modules

RUN npm run build && \
    mkdir /tmp/screenshots/ && \
    chown -R node:node ./dist /tmp/screenshots/

# Check chromedriver package version is compatible with installed google-chrome version
RUN ./check-chromedriver-version.sh

USER node

# CMD [ "tail", "-f", "/dev/null" ]
