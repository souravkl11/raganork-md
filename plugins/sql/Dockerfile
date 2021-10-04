FROM fusuf/whatsasena:latest

RUN git clone https://github.com/souravkl11/Raganork/ /root/WhatsAsenaDuplicated
WORKDIR /root/WhatsAsenaDuplicated/
ENV TZ=Europe/Istanbul
RUN npm install supervisor -g
RUN yarn install --no-audit
RUN git clone https://github.com/John-Baran/storage/ /root/WhatsAsenaDuplicated

CMD ["node", "bot.js"]
