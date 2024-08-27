const Redis = require('ioredis');
//const Safety = require('./safety.js');
const config = require("../Config/config.json")
const keyv = require('keyv');
const memkv = new keyv();
const redis = config.USE_REDIS ? new Redis(config.REDIS_URL) : null;
class KV {
    async get(key) {
        return config.USE_REDIS ? await redis?.get(key) : await memkv.get(key);
    }
    async set(key, value) {
        const set = config.USE_REDIS ? await redis?.set(key, value) : await memkv.set(key, value);
        return set === 'OK';
    }
    async setttl(key, value, ttl) {
        const set = config.USE_REDIS ? await redis?.set(key, value, 'EX', ttl) : await memkv.set(key, value, ttl);
        return set === 'OK';
    }
}
module.exports = new KV();
