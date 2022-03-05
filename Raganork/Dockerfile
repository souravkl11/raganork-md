FROM itsme-black/axya:test

RUN git clone https://github.com/itsme-black/axya
WORKDIR /itsme-black/axya 
ENV TZ = Asia/Kolkata
RUN npm install supervisor -g
RUN yarn install --no-audit

CMD ["node", "axya.js"]
