FROM node:latest

LABEL maintainer="Atif Haque atif.haque01@gmail.com"

WORKDIR /familytree
COPY build/ build
COPY node_modules/ node_modules
COPY *.json ./

RUN npm install

EXPOSE 3012

WORKDIR /familytree/build

CMD ["node", "server.js"]