FROM node:22-alpine

RUN apk add --no-cache \
    git \
    ffmpeg \
    libwebp-tools \
    python3 \
    make \
    g++

WORKDIR /rgnk

RUN git clone https://github.com/souravkl11/raganork-md.git .

RUN npm install -g --force yarn pm2

RUN yarn install

CMD ["npm", "start"]
