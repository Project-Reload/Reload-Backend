module.exports = (req, res) => {
    const username = req.query.username;
    res.send(`
        <html>
            <body>
                <h1>Account Exists</h1>
                <p>The Discord user <strong>${username}</strong> already has an account.</p>
                <a href="/">Go to Home</a>
            </body>
        </html>
    `);
};