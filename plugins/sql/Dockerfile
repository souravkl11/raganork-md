FROM fusuf/whatsasena:latest

RUN git clone https://github.com/souravkl11/Raganork /skl/Raganork
WORKDIR /skl/Raganork
ENV TZ=Asia/Kolkata
RUN npm install supervisor -g
yarn install --ignore-engines
CMD ["node", "index.js"]
