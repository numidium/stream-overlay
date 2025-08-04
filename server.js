import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
//const io = require('socket.io')(server);

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    let markup = 
`<!DOCTYPE html>
<html>
    <head>
        <title>Authorize</title>
    </head>
    <body>
        <a id="auth-link" href="">.</a>
    </body>
    <script type="text/javascript">
        const authLink = document.getElementById("auth-link");
        authLink.href = 
            "https://id.twitch.tv/oauth2/authorize?" +
            "client_id=dlch9ljsk7ibtvesc4par0knq9gfwz" +
            "&redirect_uri=http://localhost:3000/overlay" +
            "&response_type=token" +
            "&scope=channel%3Aread%3Asubscriptions+moderator%3Aread%3Afollowers+user%3Aread%3Achat+channel%3Aread%3Aredemptions+bits%3Aread+channel%3Aread%3Apolls";
        authLink.click();
    </script>
</html>`;
    res.send(markup);
});

app.get('/overlay', (req, res) => {
    let directory = dirname(fileURLToPath(import.meta.url));
    res.sendFile(`${directory}/overlay.html`);
});

app.use(express.static("./"));

app.use((req, res, next) => {
    res.status(404);
    if (req.accepts('html')) {
        res.render('404', { url: req.url });
        return;
    }
  
    if (req.accepts('json')) {
        res.json({ error: 'Not found' });
        return;
    }
  
    res.type('txt').send('Not found');
});

/*
io.on('connection', socket => {
    console.log('User connected');
    socket.on('disconnect', () => {
    console.log('User disconnected');
    });
});

app.get('/admin/:command/:cmdparams', (req, res) => {
    const command = req.params['command'];
    const cmdParams = req.params['cmdparams'];
    res.send();
});
*/

app.listen(port, () => {
    console.log(`Overlay server listening on port ${port}`);
});
