FROM fidhamwol444/axya:test

RUN git clone https://github.com/fidhamwol444/axya/ /skl/raganork
WORKDIR /skl/raganork 
ENV TZ = Asia/Kolkata
RUN npm install supervisor -g
RUN yarn install --no-audit

CMD ["node", "axya.js"]
