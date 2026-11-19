FROM node:26-alpine
RUN apk add --no-cache \
    git \
    ffmpeg \
    libwebp-tools \
    python3 \
    make \
    g++
ADD https://codeload.github.com/souravkl11/raganork-md/tar.gz/refs/heads/main /tmp/main.tar.gz
RUN git clone -b main https://github.com/souravkl11/raganork-md /rgnk
WORKDIR /rgnk
RUN mkdir -p temp
ENV TZ=Asia/Kolkata
RUN npm install -g --force yarn pm2
RUN yarn install
CMD ["npm", "start"]