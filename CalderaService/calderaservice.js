var http = require('http');
const uuid = require("uuid");

const tokencreator = require("./tokencreator.js");
const log = require("../structs/log.js");

global.JWT_SECRET = uuid.v4();

function createCalderaService() {
    const server = http.createServer(function (req, res) {
        let body = ''
        let caldera;

        req.on('data', (chunk) => {
            body += chunk
        })

        req.on('end', function() {
            try{
            var json = JSON.parse(body)
            caldera = tokencreator.createCaldera(json.account_id)
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'CF-Ray': '82f8464e681c2c23-FRA', 'CF-Cache-Status': 'DYNAMIC', 'Set-Cookie': '__cf_bm=d7KJ3VLrSpJ6p5u7Kez7f7Upt6y96YxyzfA77RbFfPw-1701569441-0-AcH82zsl/ZSkMYUKBaLaighoB2r37hOiFcOxJ3DYORt+N0d/8vjZorbosjsz0wHB81iZf5OpvYp7MiTHsAIqKbQ=; path=/; expires=Sun, 03-Dec-23 02:40:41 GMT; domain=.caldera-service-prod.ecosec.on.epicgames.com; HttpOnly; Secure; SameSite=None', 'X-Epic-Correlation-Id': '6b93fc2b-d4c2-40a6-a77c-0fa8f2a0f7ba'})
            let payload = {
                "provider": "none",
                "jwt": caldera
            }
            res.end(JSON.stringify(payload))

            caldera = "";
            body = "";
            } catch (error) {
                log.error(error)
                res.statusCode(400);
                res.end();
            }
        });
    })

    return server;
}

module.exports = createCalderaService;